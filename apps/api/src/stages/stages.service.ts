import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { slugify } from '../common/slug';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';

@Injectable()
export class StagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(user: AuthUser) {
    return this.prisma.startupStage.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { position: 'asc' },
      include: { _count: { select: { startups: true } } },
    });
  }

  async create(dto: CreateStageDto, user: AuthUser) {
    const last = await this.prisma.startupStage.aggregate({
      where: { organizationId: user.organizationId },
      _max: { position: true },
    });
    const stage = await this.prisma.startupStage.create({
      data: {
        organizationId: user.organizationId,
        name: dto.name.trim(),
        slug: `${slugify(dto.name)}-${Date.now().toString(36)}`,
        color: dto.color ?? '#64748B',
        position: dto.position ?? (last._max.position ?? -1) + 1,
      },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: AuditAction.CREATE,
      entity: 'StartupStage',
      entityId: stage.id,
      changes: { name: stage.name, color: stage.color },
    });
    return stage;
  }

  async update(id: string, dto: UpdateStageDto, user: AuthUser) {
    const stage = await this.prisma.startupStage.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { _count: { select: { startups: true } } },
    });
    if (!stage) throw new NotFoundException('Bosqich topilmadi');
    if (dto.isActive === false && stage._count.startups > 0) {
      throw new ConflictException('Ichida startaplar bor bosqichni o‘chirib bo‘lmaydi');
    }
    const updated = await this.prisma.startupStage.update({
      where: { id },
      data: {
        name: dto.name,
        color: dto.color,
        position: dto.position,
        isActive: dto.isActive,
      },
    });
    await this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action: AuditAction.UPDATE,
      entity: 'StartupStage',
      entityId: id,
      changes: dto as any,
    });
    return updated;
  }
}
