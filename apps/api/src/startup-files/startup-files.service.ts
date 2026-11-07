import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, StartupFileKind, StartupStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { sniffMime } from '../cash/cash.service';
import { PrismaService } from '../prisma/prisma.service';

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENTS_PER_STARTUP = 50;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const OFFICE_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export interface UploadedStartupFile {
  buffer: Buffer;
  size: number;
  originalname: string;
}

/** Rasm/PDF mazmun bo‘yicha; Office fayllari ZIP sarlavhasi + kengaytma bo‘yicha aniqlanadi. */
export function detectDocumentType(buffer: Buffer, fileName: string): string | null {
  const sniffed = sniffMime(buffer);
  if (sniffed) return sniffed;
  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return isZip && OFFICE_TYPES[extension] ? OFFICE_TYPES[extension] : null;
}

/** Brauzerda ochiladigan (inline) turlar; qolganlari yuklab olinadi. */
export function isInlineType(contentType: string) {
  return IMAGE_TYPES.has(contentType) || contentType === 'application/pdf';
}

export function startupFileUrl(startupId: string, fileId: string) {
  return `/api/backend/startups/${startupId}/files/${fileId}`;
}

const fileSelect = {
  id: true,
  name: true,
  contentType: true,
  size: true,
  createdAt: true,
  uploader: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class StartupFilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(startupId: string, user: AuthUser) {
    await this.findStartup(startupId, user);
    return this.prisma.startupFile.findMany({
      where: { startupId, kind: StartupFileKind.DOCUMENT },
      select: fileSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(startupId: string, file: UploadedStartupFile | undefined, user: AuthUser) {
    const startup = await this.findMutableStartup(startupId, user);
    this.assertFile(file, DOCUMENT_MAX_BYTES, '10 MB');
    const contentType = detectDocumentType(file!.buffer, file!.originalname || '');
    if (!contentType) throw new BadRequestException('Faqat PDF, rasm (JPG, PNG, WEBP, GIF) yoki Word/Excel/PowerPoint (DOCX, XLSX, PPTX) yuklash mumkin');
    const count = await this.prisma.startupFile.count({ where: { startupId, kind: StartupFileKind.DOCUMENT } });
    if (count >= MAX_DOCUMENTS_PER_STARTUP) throw new ConflictException(`Bitta startapga ko‘pi bilan ${MAX_DOCUMENTS_PER_STARTUP} ta hujjat yuklash mumkin`);
    const id = randomUUID();
    const created = await this.prisma.startupFile.create({
      data: {
        id,
        startupId: startup.id,
        kind: StartupFileKind.DOCUMENT,
        name: this.cleanName(file!.originalname, 'hujjat'),
        objectKey: `db:${id}`,
        contentType,
        size: file!.size,
        data: file!.buffer,
        uploadedBy: user.userId,
      },
      select: fileSelect,
    });
    await this.log(user, AuditAction.CREATE, created.id, { startupId, name: created.name, size: created.size });
    return created;
  }

  async uploadLogo(startupId: string, file: UploadedStartupFile | undefined, user: AuthUser) {
    const startup = await this.findMutableStartup(startupId, user);
    this.assertFile(file, LOGO_MAX_BYTES, '2 MB');
    const contentType = sniffMime(file!.buffer);
    if (!contentType || !IMAGE_TYPES.has(contentType)) throw new BadRequestException('Logotip uchun JPG, PNG, WEBP yoki GIF rasm tanlang');
    const id = randomUUID();
    const logoUrl = startupFileUrl(startup.id, id);
    // Eski logotip o‘chiriladi, yangisi saqlanadi va startapga biriktiriladi — hammasi bitta tranzaksiyada
    await this.prisma.$transaction([
      this.prisma.startupFile.deleteMany({ where: { startupId, kind: StartupFileKind.LOGO } }),
      this.prisma.startupFile.create({
        data: {
          id,
          startupId,
          kind: StartupFileKind.LOGO,
          name: this.cleanName(file!.originalname, 'logotip'),
          objectKey: `db:${id}`,
          contentType,
          size: file!.size,
          data: file!.buffer,
          uploadedBy: user.userId,
        },
      }),
      this.prisma.startup.update({ where: { id: startupId }, data: { logoUrl, updatedById: user.userId } }),
    ]);
    await this.log(user, AuditAction.UPDATE, id, { startupId, logo: 'uploaded' });
    return { logoUrl };
  }

  async removeLogo(startupId: string, user: AuthUser) {
    await this.findMutableStartup(startupId, user);
    await this.prisma.$transaction([
      this.prisma.startupFile.deleteMany({ where: { startupId, kind: StartupFileKind.LOGO } }),
      this.prisma.startup.update({ where: { id: startupId }, data: { logoUrl: null, updatedById: user.userId } }),
    ]);
    await this.log(user, AuditAction.DELETE, startupId, { startupId, logo: 'removed' });
    return { logoUrl: null };
  }

  async getContent(startupId: string, fileId: string, user: AuthUser) {
    await this.findStartup(startupId, user);
    const file = await this.prisma.startupFile.findFirst({ where: { id: fileId, startupId } });
    if (!file || !file.data) throw new NotFoundException('Fayl topilmadi');
    return file;
  }

  async removeDocument(startupId: string, fileId: string, user: AuthUser) {
    await this.findMutableStartup(startupId, user);
    const file = await this.prisma.startupFile.findFirst({
      where: { id: fileId, startupId, kind: StartupFileKind.DOCUMENT },
      select: { id: true, name: true },
    });
    if (!file) throw new NotFoundException('Hujjat topilmadi');
    await this.prisma.startupFile.delete({ where: { id: file.id } });
    await this.log(user, AuditAction.DELETE, file.id, { startupId, name: file.name });
    return { success: true };
  }

  private assertFile(file: UploadedStartupFile | undefined, maxBytes: number, label: string) {
    if (!file?.buffer?.length) throw new BadRequestException('Fayl tanlanmagan');
    if (file.size > maxBytes) throw new BadRequestException(`Fayl ${label} dan katta bo‘lmasin`);
  }

  /** Yo‘l belgilari va boshqaruv belgilarini olib tashlaydi; Content-Disposition uchun xavfsiz. */
  private cleanName(name: string | undefined, fallback: string) {
    const cleaned = (name || '')
      .replace(/[\\/]/g, '_')
      .replace(/[\u0000-\u001f\u007f"]/g, '')
      .trim()
      .slice(0, 200);
    return cleaned || fallback;
  }

  private async findStartup(id: string, user: AuthUser) {
    const startup = await this.prisma.startup.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { id: true, status: true },
    });
    if (!startup) throw new NotFoundException('Startap topilmadi');
    return startup;
  }

  private async findMutableStartup(id: string, user: AuthUser) {
    const startup = await this.findStartup(id, user);
    if (startup.status === StartupStatus.ARCHIVED) {
      throw new ConflictException('Arxivlangan startap faqat o‘qish rejimida. Avval uni tiklang.');
    }
    return startup;
  }

  private log(user: AuthUser, action: AuditAction, entityId: string, changes: Record<string, unknown>) {
    return this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action,
      entity: 'StartupFile',
      entityId,
      changes: changes as Prisma.InputJsonValue,
    });
  }
}
