import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, MilestoneStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { rejectNulls } from '../common/reject-nulls';

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(startupId: string, user: AuthUser) {
    await this.assertStartup(startupId, user.organizationId);
    return this.prisma.startupMilestone.findMany({
      where: { startupId, organizationId: user.organizationId },
      include: {
        assignee: { select: { id: true, fullName: true, avatarUrl: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(startupId: string, dto: CreateMilestoneDto, user: AuthUser) {
    await this.assertMutableStartup(startupId, user.organizationId);
    await this.assertAssignee(dto.assigneeId, user.organizationId);
    const milestone = await this.prisma.startupMilestone.create({
      data: {
        organizationId: user.organizationId,
        startupId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        completedAt: dto.status === MilestoneStatus.COMPLETED ? new Date() : null,
        assigneeId: dto.assigneeId || null,
        createdById: user.userId,
        updatedById: user.userId,
      },
      include: { assignee: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
    await this.log(user, AuditAction.CREATE, milestone.id, { startupId, title: milestone.title });
    return milestone;
  }

  async update(startupId: string, milestoneId: string, dto: UpdateMilestoneDto, user: AuthUser) {
    rejectNulls(dto, ['title', 'status', 'priority']);
    await this.assertMutableStartup(startupId, user.organizationId);
    const current = await this.assertMilestone(milestoneId, startupId, user.organizationId);
    await this.assertAssignee(dto.assigneeId, user.organizationId);
    const milestone = await this.prisma.startupMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.status !== undefined && {
          status: dto.status,
          completedAt:
            dto.status === MilestoneStatus.COMPLETED
              ? current.completedAt || new Date()
              : null,
        }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId || null }),
        updatedById: user.userId,
      },
      include: { assignee: { select: { id: true, fullName: true, avatarUrl: true } } },
    });
    await this.log(user, AuditAction.UPDATE, milestoneId, dto);
    return milestone;
  }

  async remove(startupId: string, milestoneId: string, user: AuthUser) {
    await this.assertMutableStartup(startupId, user.organizationId);
    await this.assertMilestone(milestoneId, startupId, user.organizationId);
    await this.prisma.startupMilestone.delete({ where: { id: milestoneId } });
    await this.log(user, AuditAction.DELETE, milestoneId, { startupId });
    return { success: true };
  }

  private async assertStartup(id: string, organizationId: string) {
    const startup = await this.prisma.startup.findFirst({ where: { id, organizationId }, select: { id: true, status: true } });
    if (!startup) throw new NotFoundException('Startap topilmadi');
    return startup;
  }

  private async assertMutableStartup(id: string, organizationId: string) {
    const startup = await this.assertStartup(id, organizationId);
    if (startup.status === 'ARCHIVED') {
      throw new ConflictException('Arxivlangan startap vazifalari faqat o‘qish rejimida');
    }
  }

  private async assertMilestone(id: string, startupId: string, organizationId: string) {
    const milestone = await this.prisma.startupMilestone.findFirst({ where: { id, startupId, organizationId } });
    if (!milestone) throw new NotFoundException('Vazifa topilmadi');
    return milestone;
  }

  private async assertAssignee(id: string | null | undefined, organizationId: string) {
    if (!id) return;
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: id } },
      include: { user: { select: { isActive: true } } },
    });
    if (!membership?.user.isActive) throw new NotFoundException('Faol mas’ul foydalanuvchi topilmadi');
  }

  private log(user: AuthUser, action: AuditAction, entityId: string, changes: unknown) {
    return this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action,
      entity: 'StartupMilestone',
      entityId,
      changes: changes as Prisma.InputJsonValue,
    });
  }
}
