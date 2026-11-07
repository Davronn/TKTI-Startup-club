import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MilestoneStatus, StartupStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const CHECK_INTERVAL_MS = 10 * 60_000;
const TIME_ZONE = 'Asia/Tashkent';
const MAX_ITEMS = 15;
const DUE_SOON_DAYS = 3;

interface DigestItem {
  title: string;
  dueDate: Date | null;
  startup: { id: string; name: string };
  assignee: { fullName: string } | null;
}

/** HTML parse_mode uchun: foydalanuvchi kiritgan matn teg sifatida talqin qilinmasin. */
export function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Toshkent vaqti bo‘yicha sana (YYYY-MM-DD) va soat. */
export function tashkentNow(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

const formatDay = (value: Date | null) => (value ? value.toISOString().slice(0, 10).split('-').reverse().join('.') : '—');

export function buildDigest(orgName: string, overdue: DigestItem[], dueSoon: DigestItem[], webOrigin: string) {
  if (!overdue.length && !dueSoon.length) return null;
  const line = (item: DigestItem) =>
    `• <a href="${webOrigin}/startups/${item.startup.id}">${escapeHtml(item.startup.name)}</a> — ${escapeHtml(item.title)}` +
    ` (${formatDay(item.dueDate)}${item.assignee ? `, ${escapeHtml(item.assignee.fullName)}` : ''})`;
  const section = (title: string, items: DigestItem[]) =>
    items.length
      ? [`<b>${title}: ${items.length} ta</b>`, ...items.slice(0, MAX_ITEMS).map(line), items.length > MAX_ITEMS ? `…va yana ${items.length - MAX_ITEMS} ta` : '']
          .filter(Boolean)
          .join('\n')
      : '';
  return [
    `📋 <b>${escapeHtml(orgName)}</b> — vazifalar nazorati`,
    section('⚠️ Muddati o‘tgan', overdue),
    section(`⏳ ${DUE_SOON_DAYS} kun ichida muddati tugaydi`, dueSoon),
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Har kuni belgilangan soatda (Toshkent vaqti) muddati o‘tgan va yaqinlashgan vazifalar haqida
 * Telegram guruhiga xabar yuboradi. TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID berilmasa, o‘chiq turadi.
 */
@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private timer: NodeJS.Timeout | null = null;
  private lastSentDate: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get enabled() {
    return Boolean(this.token && this.chatId);
  }

  private get token() { return this.config.get<string>('TELEGRAM_BOT_TOKEN')?.trim() || ''; }
  private get chatId() { return this.config.get<string>('TELEGRAM_CHAT_ID')?.trim() || ''; }
  private get hour() {
    const value = Number(this.config.get<string>('NOTIFY_HOUR') ?? 9);
    return Number.isInteger(value) && value >= 0 && value <= 23 ? value : 9;
  }
  private get webOrigin() {
    return (this.config.get<string>('WEB_ORIGIN', 'http://localhost:3000').split(',')[0] || '').trim().replace(/\/$/, '');
  }

  status() {
    return { enabled: this.enabled, channel: 'telegram', hour: this.hour, timeZone: TIME_ZONE, lastSentDate: this.lastSentDate };
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Telegram xabarnomalari o‘chiq (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID berilmagan)');
      return;
    }
    this.timer = setInterval(() => void this.tick(), CHECK_INTERVAL_MS);
    this.timer.unref();
    this.logger.log(`Telegram xabarnomalari yoqilgan: har kuni ${this.hour}:00 (${TIME_ZONE})`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const now = tashkentNow();
    if (now.hour !== this.hour || this.lastSentDate === now.date) return;
    // Avval belgilaymiz: xato bo‘lsa ham bir kunda qayta-qayta urinmasin
    this.lastSentDate = now.date;
    try {
      const sent = await this.sendDigest();
      this.logger.log(`Kunlik xabarnoma: ${sent} ta tashkilot uchun yuborildi`);
    } catch (error) {
      this.logger.error(`Kunlik xabarnomani yuborib bo‘lmadi: ${error instanceof Error ? error.message : error}`);
    }
  }

  /** Har bir tashkilot bo‘yicha xabar yuboradi; nechta xabar ketganini qaytaradi. */
  async sendDigest(organizationId?: string, { force = false } = {}) {
    if (!this.enabled) throw new BadRequestException('Telegram sozlanmagan: TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID kerak');
    const today = new Date(`${tashkentNow().date}T00:00:00.000Z`);
    const soon = new Date(today);
    soon.setUTCDate(soon.getUTCDate() + DUE_SOON_DAYS);
    const organizations = await this.prisma.organization.findMany({
      where: organizationId ? { id: organizationId } : {},
      select: { id: true, name: true },
    });
    const open = { notIn: [MilestoneStatus.COMPLETED, MilestoneStatus.CANCELLED] };
    const include = { startup: { select: { id: true, name: true } }, assignee: { select: { fullName: true } } };
    let sent = 0;
    for (const organization of organizations) {
      const base = { organizationId: organization.id, status: open, startup: { status: { not: StartupStatus.ARCHIVED } } };
      const [overdue, dueSoon] = await Promise.all([
        this.prisma.startupMilestone.findMany({ where: { ...base, dueDate: { lt: today } }, include, orderBy: { dueDate: 'asc' } }),
        this.prisma.startupMilestone.findMany({ where: { ...base, dueDate: { gte: today, lte: soon } }, include, orderBy: { dueDate: 'asc' } }),
      ]);
      const text = buildDigest(organization.name, overdue, dueSoon, this.webOrigin)
        ?? (force ? `✅ <b>${escapeHtml(organization.name)}</b>: muddati o‘tgan yoki yaqinlashgan vazifa yo‘q.` : null);
      if (!text) continue;
      await this.sendTelegram(text);
      sent += 1;
    }
    return sent;
  }

  private async sendTelegram(text: string) {
    const response = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: this.chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { description?: string } | null;
      // Token xabarga tushmasin — faqat Telegram javobidagi izoh
      throw new BadRequestException(`Telegram xabarni qabul qilmadi: ${body?.description || response.status}`);
    }
  }
}
