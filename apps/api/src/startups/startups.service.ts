import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, StartupStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import { ChangeStageDto } from './dto/change-stage.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateStartupDto } from './dto/create-startup.dto';
import { ListStartupsDto } from './dto/list-startups.dto';
import { UpdateStartupDto } from './dto/update-startup.dto';

const listInclude = {
  currentStage: true,
  curator: { select: { id: true, fullName: true, avatarUrl: true } },
  _count: { select: { members: true, notes: true } },
} satisfies Prisma.StartupInclude;

@Injectable()
export class StartupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListStartupsDto, user: AuthUser) {
    const where: Prisma.StartupWhereInput = {
      organizationId: user.organizationId,
      ...(query.status ? { status: query.status } : { status: { not: StartupStatus.ARCHIVED } }),
      ...(query.stageId && { currentStageId: query.stageId }),
      ...(query.curatorId && { curatorId: query.curatorId }),
      ...(query.industry && { industry: { equals: query.industry, mode: 'insensitive' } }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
          { industry: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const page = query.page || 1;
    const limit = query.limit || 20;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.startup.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.startup.count({ where }),
    ]);
    return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async pipeline(user: AuthUser) {
    const [stages, startups] = await Promise.all([
      this.prisma.startupStage.findMany({
        where: { organizationId: user.organizationId, isActive: true },
        orderBy: { position: 'asc' },
      }),
      this.prisma.startup.findMany({
        where: { organizationId: user.organizationId, status: { not: StartupStatus.ARCHIVED } },
        include: listInclude,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);
    return stages.map((stage) => ({
      ...stage,
      startups: startups.filter((startup) => startup.currentStageId === stage.id),
    }));
  }

  async findOne(id: string, user: AuthUser) {
    const startup = await this.prisma.startup.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        currentStage: true,
        curator: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        members: { orderBy: [{ isFounder: 'desc' }, { fullName: 'asc' }] },
        stageHistory: {
          include: {
            fromStage: true,
            toStage: true,
            changedBy: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tags: { include: { tag: true } },
        files: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!startup) throw new NotFoundException('Startap topilmadi');
    return startup;
  }

  async create(dto: CreateStartupDto, user: AuthUser) {
    await this.assertStage(dto.currentStageId, user.organizationId);
    await this.assertCurator(dto.curatorId, user.organizationId);
    const slug = await this.uniqueSlug(dto.name, user.organizationId);
    const startup = await this.prisma.$transaction(async (tx) => {
      const created = await tx.startup.create({
        data: {
          organizationId: user.organizationId,
          name: dto.name.trim(),
          slug,
          description: dto.description,
          problem: dto.problem,
          solution: dto.solution,
          industry: dto.industry,
          website: dto.website,
          email: dto.email,
          phone: dto.phone,
          location: dto.location,
          teamSize: dto.teamSize,
          foundedAt: dto.foundedAt ? new Date(dto.foundedAt) : undefined,
          joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
          logoUrl: dto.logoUrl,
          pitchDeckUrl: dto.pitchDeckUrl,
          currentStageId: dto.currentStageId,
          curatorId: dto.curatorId,
          createdById: user.userId,
          updatedById: user.userId,
          members: dto.members?.length
            ? {
                create: dto.members.map((member) => ({
                  ...member,
                  fullName: member.fullName.trim(),
                })),
              }
            : undefined,
        },
        include: listInclude,
      });
      await tx.startupStageHistory.create({
        data: {
          startupId: created.id,
          toStageId: dto.currentStageId,
          changedById: user.userId,
          note: 'Startap tizimga qo‘shildi',
        },
      });
      return created;
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: AuditAction.CREATE,
      entity: 'Startup',
      entityId: startup.id,
      changes: { name: startup.name, stageId: startup.currentStageId },
    });
    return startup;
  }

  async update(id: string, dto: UpdateStartupDto, user: AuthUser) {
    const current = await this.findOwned(id, user.organizationId);
    this.assertMutable(current.status);
    if (dto.status === StartupStatus.ARCHIVED) {
      throw new ConflictException('Arxivlash uchun maxsus arxiv endpointidan foydalaning');
    }
    if (dto.currentStageId && dto.currentStageId !== current.currentStageId) {
      await this.assertStage(dto.currentStageId, user.organizationId);
    }
    await this.assertCurator(dto.curatorId, user.organizationId);
    const { members, currentStageId, foundedAt, joinedAt, ...data } = dto;
    const updated = await this.prisma.$transaction(async (tx) => {
      const startup = await tx.startup.update({
        where: { id },
        data: {
          ...data,
          ...(dto.name && { name: dto.name.trim() }),
          ...(foundedAt !== undefined && { foundedAt: foundedAt ? new Date(foundedAt) : null }),
          ...(joinedAt !== undefined && { joinedAt: new Date(joinedAt) }),
          updatedById: user.userId,
          ...(currentStageId && { currentStageId }),
        },
        include: listInclude,
      });
      if (members) {
        await tx.startupMember.deleteMany({ where: { startupId: id } });
        if (members.length) {
          await tx.startupMember.createMany({
            data: members.map((member) => ({ ...member, startupId: id })),
          });
        }
      }
      if (currentStageId && currentStageId !== current.currentStageId) {
        await tx.startupStageHistory.create({
          data: {
            startupId: id,
            fromStageId: current.currentStageId,
            toStageId: currentStageId,
            changedById: user.userId,
            note: 'Startap ma’lumotlari orqali bosqich o‘zgartirildi',
          },
        });
      }
      return startup;
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: AuditAction.UPDATE,
      entity: 'Startup',
      entityId: id,
      changes: dto as any,
    });
    return updated;
  }

  async changeStage(id: string, dto: ChangeStageDto, user: AuthUser) {
    const current = await this.findOwned(id, user.organizationId);
    this.assertMutable(current.status);
    if (current.currentStageId === dto.stageId) return this.findOne(id, user);
    await this.assertStage(dto.stageId, user.organizationId);
    await this.prisma.$transaction([
      this.prisma.startup.update({
        where: { id },
        data: { currentStageId: dto.stageId, updatedById: user.userId },
      }),
      this.prisma.startupStageHistory.create({
        data: {
          startupId: id,
          fromStageId: current.currentStageId,
          toStageId: dto.stageId,
          changedById: user.userId,
          note: dto.note,
        },
      }),
    ]);
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: AuditAction.STAGE_CHANGE,
      entity: 'Startup',
      entityId: id,
      changes: { fromStageId: current.currentStageId, toStageId: dto.stageId, note: dto.note },
    });
    return this.findOne(id, user);
  }

  async archive(id: string, user: AuthUser) {
    await this.findOwned(id, user.organizationId);
    await this.prisma.startup.update({
      where: { id },
      data: { status: StartupStatus.ARCHIVED, archivedAt: new Date(), updatedById: user.userId },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: AuditAction.ARCHIVE,
      entity: 'Startup',
      entityId: id,
    });
    return { success: true };
  }

  async restore(id: string, user: AuthUser) {
    const startup = await this.findOwned(id, user.organizationId);
    if (startup.status !== StartupStatus.ARCHIVED) return { success: true };
    await this.prisma.startup.update({
      where: { id },
      data: { status: StartupStatus.ACTIVE, archivedAt: null, updatedById: user.userId },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: AuditAction.RESTORE,
      entity: 'Startup',
      entityId: id,
    });
    return { success: true };
  }

  async addNote(id: string, dto: CreateNoteDto, user: AuthUser) {
    const startup = await this.findOwned(id, user.organizationId);
    this.assertMutable(startup.status);
    const note = await this.prisma.startupNote.create({
      data: { startupId: id, authorId: user.userId, content: dto.content.trim() },
      include: { author: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: AuditAction.CREATE,
      entity: 'StartupNote',
      entityId: note.id,
      changes: { startupId: id },
    });
    return note;
  }

  async industries(user: AuthUser) {
    const rows = await this.prisma.startup.findMany({
      where: { organizationId: user.organizationId, industry: { not: null } },
      select: { industry: true },
      distinct: ['industry'],
      orderBy: { industry: 'asc' },
    });
    return rows.map((row) => row.industry).filter(Boolean);
  }

  private async findOwned(id: string, organizationId: string) {
    const startup = await this.prisma.startup.findFirst({ where: { id, organizationId } });
    if (!startup) throw new NotFoundException('Startap topilmadi');
    return startup;
  }

  private assertMutable(status: StartupStatus) {
    if (status === StartupStatus.ARCHIVED) {
      throw new ConflictException('Arxivlangan startap faqat o‘qish rejimida. Avval uni tiklang.');
    }
  }

  private async assertStage(stageId: string, organizationId: string) {
    const stage = await this.prisma.startupStage.findFirst({
      where: { id: stageId, organizationId, isActive: true },
    });
    if (!stage) throw new ConflictException('Tanlangan bosqich mavjud emas');
  }

  private async assertCurator(curatorId: string | undefined, organizationId: string) {
    if (!curatorId) return;
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: curatorId } },
      include: { user: { select: { isActive: true } } },
    });
    if (!membership?.user.isActive) throw new ConflictException('Tanlangan kurator faol tashkilot a’zosi emas');
  }

  private async uniqueSlug(name: string, organizationId: string) {
    const base = slugify(name) || 'startup';
    const existing = await this.prisma.startup.findFirst({
      where: { organizationId, slug: base },
      select: { id: true },
    });
    return existing ? `${base}-${Date.now().toString(36)}` : base;
  }
}
