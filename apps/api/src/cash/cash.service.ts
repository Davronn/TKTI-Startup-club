import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, CashTransactionKind, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CASH_IN_CATEGORIES,
  CASH_MAX_AMOUNT,
  CASH_MOVE_CATEGORY,
  CASH_OUT_CATEGORIES,
  CASH_RECEIPT_MAX_BYTES,
} from './cash.constants';
import { buildCsv, buildDocx, buildXlsx, CashRow, CashSettingsView, docLabel, periodData } from './cash-report';
import { CashExportQueryDto, SaveCashTransactionDto, UpdateCashSettingsDto } from './dto/cash.dto';

const transactionInclude = {
  startup: { select: { id: true, name: true } },
  receipt: { select: { id: true, mimeType: true } },
  createdBy: { select: { fullName: true } },
  updatedBy: { select: { fullName: true } },
  archivedBy: { select: { fullName: true } },
} satisfies Prisma.CashTransactionInclude;

type TransactionWithRelations = Prisma.CashTransactionGetPayload<{ include: typeof transactionInclude }>;

const DEFAULT_SETTINGS: CashSettingsView = {
  orgName: 'TKTI',
  unitName: 'Startaplarni rivojlantirish va ekotizimni joriy etish bo‘limi',
  head: '',
  accountant: '',
  openingCash: 0,
  openingCard: 0,
  openingDate: null,
  defaultCommissionPct: 1,
};

const isoDate = (value: Date) => value.toISOString().slice(0, 10);
const toNumber = (value: Prisma.Decimal | null) => (value === null ? null : Number(value));

/** Fayl tarkibi bo‘yicha turini aniqlaydi (kengaytmaga ishonilmaydi). */
export function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString() === 'GIF8') return 'image/gif';
  if (buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (buf.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  return null;
}

export interface UploadedReceipt {
  buffer: Buffer;
  size: number;
  originalname: string;
}

@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /* ---------------- o‘qish ---------------- */

  async list(user: AuthUser) {
    const rows = await this.prisma.cashTransaction.findMany({
      where: { organizationId: user.organizationId },
      include: transactionInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((row) => this.toView(row));
  }

  async findOne(id: string, user: AuthUser) {
    const row = await this.prisma.cashTransaction.findFirst({
      where: { id, organizationId: user.organizationId },
      include: transactionInclude,
    });
    if (!row) throw new NotFoundException('Kassa yozuvi topilmadi');
    return this.toView(row);
  }

  /* ---------------- yaratish / tahrirlash ---------------- */

  async create(dto: SaveCashTransactionDto, user: AuthUser) {
    const data = await this.clean(dto, user);
    const id = await this.prisma.$transaction(async (tx) => {
      const docNo = await this.nextDocNo(tx, user.organizationId, data.kind);
      const created = await tx.cashTransaction.create({
        data: {
          ...data,
          docNo,
          organizationId: user.organizationId,
          createdById: user.userId,
          updatedById: user.userId,
        },
      });
      return created.id;
    });
    const view = await this.findOne(id, user);
    await this.log(user, AuditAction.CREATE, id, { doc: docLabel(view), amount: view.amount, startupId: view.startup?.id });
    return view;
  }

  async update(id: string, dto: SaveCashTransactionDto, user: AuthUser) {
    const current = await this.findOwned(id, user);
    if (current.archivedAt) throw new ConflictException('Arxivdagi yozuvni avval tiklang');
    const data = await this.clean(dto, user);
    await this.prisma.$transaction(async (tx) => {
      const docNo = current.kind === data.kind ? current.docNo : await this.nextDocNo(tx, user.organizationId, data.kind);
      await tx.cashTransaction.update({ where: { id }, data: { ...data, docNo, updatedById: user.userId } });
    });
    if (current.receiptId && current.receiptId !== data.receiptId) await this.removeReceiptIfUnused(current.receiptId);
    const view = await this.findOne(id, user);
    const changes: Record<string, [unknown, unknown]> = {};
    if (current.kind !== view.kind) changes.kind = [current.kind, view.kind];
    if (Number(current.amount) !== view.amount) changes.amount = [Number(current.amount), view.amount];
    if (isoDate(current.date) !== view.date) changes.date = [isoDate(current.date), view.date];
    if (current.category !== view.category) changes.category = [current.category, view.category];
    if (current.account !== view.account) changes.account = [current.account, view.account];
    if (current.startupId !== (view.startup?.id ?? null)) changes.startupId = [current.startupId, view.startup?.id ?? null];
    await this.log(user, AuditAction.UPDATE, id, { doc: docLabel(view), changes } as Prisma.InputJsonValue);
    return view;
  }

  async updateUsage(id: string, usage: string, user: AuthUser) {
    const current = await this.findOwned(id, user);
    if (current.archivedAt) throw new ConflictException('Arxivdagi yozuvni avval tiklang');
    if (!(current.kind === 'OUT' && current.account === 'CARD')) {
      throw new BadRequestException('Ishlatilishi faqat karta orqali chiqimlar uchun yoziladi');
    }
    await this.prisma.cashTransaction.update({
      where: { id },
      data: { usage: usage.trim(), updatedById: user.userId },
    });
    await this.log(user, AuditAction.UPDATE, id, { usage: usage.trim() });
    return this.findOne(id, user);
  }

  async archive(id: string, reason: string | undefined, user: AuthUser) {
    const current = await this.findOwned(id, user);
    if (current.archivedAt) throw new ConflictException('Yozuv allaqachon arxivda');
    await this.prisma.cashTransaction.update({
      where: { id },
      data: { archivedAt: new Date(), archivedById: user.userId, archiveReason: reason?.trim() || '' },
    });
    await this.log(user, AuditAction.ARCHIVE, id, { reason: reason?.trim() || '' });
    return this.findOne(id, user);
  }

  async restore(id: string, user: AuthUser) {
    const current = await this.findOwned(id, user);
    if (!current.archivedAt) throw new ConflictException('Yozuv arxivda emas');
    await this.prisma.cashTransaction.update({
      where: { id },
      data: { archivedAt: null, archivedById: null, archiveReason: '' },
    });
    await this.log(user, AuditAction.RESTORE, id);
    return this.findOne(id, user);
  }

  async purge(id: string, user: AuthUser) {
    const current = await this.findOwned(id, user);
    if (!current.archivedAt) throw new ConflictException('Avval yozuvni arxivga o‘tkazing');
    await this.prisma.cashTransaction.delete({ where: { id } });
    if (current.receiptId) await this.removeReceiptIfUnused(current.receiptId);
    await this.log(user, AuditAction.DELETE, id, {
      doc: docLabel(current),
      amount: Number(current.amount),
      date: isoDate(current.date),
      note: current.note,
    });
    return { success: true };
  }

  /* ---------------- cheklar ---------------- */

  async uploadReceipt(file: UploadedReceipt | undefined, user: AuthUser) {
    if (!file?.buffer?.length) throw new BadRequestException('Fayl tanlanmagan');
    if (file.size > CASH_RECEIPT_MAX_BYTES) throw new BadRequestException('Fayl 10 MB dan katta bo‘lmasin');
    const mimeType = sniffMime(file.buffer);
    if (!mimeType) throw new BadRequestException('Faqat JPG, PNG, WEBP, GIF rasm yoki PDF yuklash mumkin');
    // Biriktirilmay qolgan eski fayllarni tozalaymiz (forma yopilib ketgan holatlar)
    await this.prisma.cashReceipt.deleteMany({
      where: {
        organizationId: user.organizationId,
        transactions: { none: {} },
        createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    const receipt = await this.prisma.cashReceipt.create({
      data: {
        organizationId: user.organizationId,
        mimeType,
        size: file.size,
        fileName: (file.originalname || 'chek').slice(0, 200),
        data: file.buffer,
        createdById: user.userId,
      },
      select: { id: true, mimeType: true },
    });
    return receipt;
  }

  async getReceipt(id: string, user: AuthUser) {
    const receipt = await this.prisma.cashReceipt.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!receipt) throw new NotFoundException('Chek topilmadi');
    return receipt;
  }

  /* ---------------- sozlamalar ---------------- */

  async getSettings(user: AuthUser): Promise<CashSettingsView> {
    const row = await this.prisma.cashSettings.findUnique({ where: { organizationId: user.organizationId } });
    if (!row) return DEFAULT_SETTINGS;
    return {
      orgName: row.orgName,
      unitName: row.unitName,
      head: row.head,
      accountant: row.accountant,
      openingCash: Number(row.openingCash),
      openingCard: Number(row.openingCard),
      openingDate: row.openingDate ? isoDate(row.openingDate) : null,
      defaultCommissionPct: Number(row.defaultCommissionPct),
    };
  }

  async updateSettings(dto: UpdateCashSettingsDto, user: AuthUser) {
    const data = {
      ...(dto.orgName !== undefined && { orgName: dto.orgName.trim() || DEFAULT_SETTINGS.orgName }),
      ...(dto.unitName !== undefined && { unitName: dto.unitName.trim() || DEFAULT_SETTINGS.unitName }),
      ...(dto.head !== undefined && { head: dto.head.trim() }),
      ...(dto.accountant !== undefined && { accountant: dto.accountant.trim() }),
      ...(dto.openingCash !== undefined && { openingCash: dto.openingCash }),
      ...(dto.openingCard !== undefined && { openingCard: dto.openingCard }),
      ...(dto.openingDate !== undefined && { openingDate: dto.openingDate ? new Date(dto.openingDate) : null }),
      ...(dto.defaultCommissionPct !== undefined && { defaultCommissionPct: dto.defaultCommissionPct }),
      updatedById: user.userId,
    };
    await this.prisma.cashSettings.upsert({
      where: { organizationId: user.organizationId },
      create: { organizationId: user.organizationId, ...data },
      update: data,
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: AuditAction.UPDATE,
      entity: 'CashSettings',
      entityId: user.organizationId,
      changes: dto as unknown as Prisma.InputJsonValue,
    });
    return this.getSettings(user);
  }

  /* ---------------- eksport ---------------- */

  async export(query: CashExportQueryDto, user: AuthUser) {
    if (query.from && query.to && query.from > query.to) {
      throw new BadRequestException('Davr boshi oxiridan keyin bo‘lmasin');
    }
    const [rows, settings] = await Promise.all([this.list(user), this.getSettings(user)]);
    const active = rows.filter((row) => !row.archivedAt && (!query.startupId || row.startup?.id === query.startupId));
    const pd = periodData(active, settings, query.from, query.to);
    const label =
      query.label?.trim() ||
      (query.from || query.to ? `${query.from ?? '…'} – ${query.to ?? '…'}` : 'Barcha davr');
    const input = { pd, settings, label };
    const base = `kassa-hisoboti-${query.from || query.to ? `${query.from ?? 'boshi'}_${query.to ?? 'oxiri'}` : 'barcha-davr'}`;
    if (query.format === 'xlsx') {
      return {
        buffer: await buildXlsx(input),
        fileName: `${base}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }
    if (query.format === 'docx') {
      return {
        buffer: await buildDocx(input),
        fileName: `${base}.docx`,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
    }
    return { buffer: buildCsv(input), fileName: `${base}.csv`, contentType: 'text/csv; charset=utf-8' };
  }

  /* ---------------- ichki yordamchilar ---------------- */

  /**
   * Kassa qoidalari (asl kassa ilovasidagi cleanTx bilan bir xil):
   * summa yoki narx × soni, kategoriya, karta chiqimida qabul qiluvchi, komissiya faqat karta chiqimi va o‘tkazmada.
   */
  private async clean(dto: SaveCashTransactionDto, user: AuthUser) {
    const kind = dto.kind;
    const note = dto.note?.trim() ?? '';
    let quantity: number | null = null;
    let unitPrice: number | null = null;
    let amount: number;
    if (kind !== 'MOVE' && dto.quantity != null && dto.unitPrice != null) {
      quantity = Math.round(dto.quantity * 1000) / 1000;
      unitPrice = Math.round(dto.unitPrice);
      amount = Math.round(quantity * unitPrice);
    } else {
      amount = Math.round(dto.amount ?? 0);
    }
    if (!(amount > 0 && amount <= CASH_MAX_AMOUNT)) throw new BadRequestException('Summa noto‘g‘ri');

    let category: string;
    let account = null as SaveCashTransactionDto['account'];
    let fromAccount = null as SaveCashTransactionDto['fromAccount'];
    let toAccount = null as SaveCashTransactionDto['fromAccount'];
    if (kind === 'MOVE') {
      if (!dto.fromAccount) throw new BadRequestException('Qayerdan o‘tkazilgani tanlanmagan');
      fromAccount = dto.fromAccount;
      toAccount = dto.fromAccount === 'CASH' ? 'CARD' : 'CASH';
      category = CASH_MOVE_CATEGORY;
    } else {
      if (!dto.account) throw new BadRequestException('Hisob (naqd yoki karta) tanlanmagan');
      account = dto.account;
      const allowed: readonly string[] = kind === 'IN' ? CASH_IN_CATEGORIES : CASH_OUT_CATEGORIES;
      category = dto.category?.trim() ?? '';
      if (!allowed.includes(category)) throw new BadRequestException('Kategoriya noto‘g‘ri tanlangan');
      if (!note) {
        throw new BadRequestException(
          kind === 'OUT' ? 'Mablag‘ nima uchun ishlatilganini yozing' : 'Mablag‘ qayerdan tushganini yozing',
        );
      }
    }

    const cardOut = kind === 'OUT' && account === 'CARD';
    const recipient = cardOut ? (dto.recipient?.trim() ?? '') : '';
    if (cardOut && !recipient) throw new BadRequestException('Pul kimga o‘tkazilganini yozing');
    const commissionPct = cardOut || kind === 'MOVE' ? Math.round((dto.commissionPct ?? 0) * 100) / 100 : 0;
    const commission = Math.round((amount * commissionPct) / 100);

    const receiptId = dto.receiptId || null;
    if (receiptId) {
      const exists = await this.prisma.cashReceipt.findFirst({
        where: { id: receiptId, organizationId: user.organizationId },
        select: { id: true },
      });
      if (!exists) throw new BadRequestException('Biriktirilgan chek topilmadi');
    }
    const startupId = dto.startupId || null;
    if (startupId) {
      const startup = await this.prisma.startup.findFirst({
        where: { id: startupId, organizationId: user.organizationId },
        select: { id: true },
      });
      if (!startup) throw new BadRequestException('Tanlangan startap topilmadi');
    }

    return {
      kind,
      amount,
      date: new Date(dto.date),
      category,
      note,
      person: dto.person?.trim() ?? '',
      quantity,
      unitPrice,
      account,
      fromAccount,
      toAccount,
      recipient,
      commissionPct,
      commission,
      usage: cardOut ? (dto.usage?.trim() ?? '') : '',
      receiptId,
      startupId,
    };
  }

  /** Bir vaqtda ikki yozuv bir xil raqam olmasligi uchun tashkilot+tur bo‘yicha qulf. */
  private async nextDocNo(tx: Prisma.TransactionClient, organizationId: string, kind: CashTransactionKind) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cash:${organizationId}:${kind}`}))`;
    const last = await tx.cashTransaction.aggregate({
      where: { organizationId, kind },
      _max: { docNo: true },
    });
    return (last._max.docNo ?? 0) + 1;
  }

  private async findOwned(id: string, user: AuthUser) {
    const row = await this.prisma.cashTransaction.findFirst({ where: { id, organizationId: user.organizationId } });
    if (!row) throw new NotFoundException('Kassa yozuvi topilmadi');
    return row;
  }

  private async removeReceiptIfUnused(receiptId: string) {
    await this.prisma.cashReceipt.deleteMany({ where: { id: receiptId, transactions: { none: {} } } });
  }

  private toView(row: TransactionWithRelations) {
    const view: CashRow & {
      archivedAt: string | null;
      archiveReason: string;
      archivedByName: string;
      updatedAt: string;
      updatedByName: string;
    } = {
      id: row.id,
      kind: row.kind,
      docNo: row.docNo,
      amount: Number(row.amount),
      date: isoDate(row.date),
      category: row.category,
      note: row.note,
      person: row.person,
      quantity: toNumber(row.quantity),
      unitPrice: toNumber(row.unitPrice),
      account: row.account,
      fromAccount: row.fromAccount,
      toAccount: row.toAccount,
      recipient: row.recipient,
      commissionPct: Number(row.commissionPct),
      commission: Number(row.commission),
      usage: row.usage,
      startup: row.startup,
      receipt: row.receipt,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      archiveReason: row.archiveReason,
      archivedByName: row.archivedBy?.fullName ?? '',
      createdAt: row.createdAt.toISOString(),
      createdByName: row.createdBy.fullName,
      updatedAt: row.updatedAt.toISOString(),
      updatedByName: row.updatedBy.fullName,
    };
    return view;
  }

  private log(user: AuthUser, action: AuditAction, entityId: string, changes?: Prisma.InputJsonValue) {
    return this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action,
      entity: 'CashTransaction',
      entityId,
      changes,
    });
  }
}
