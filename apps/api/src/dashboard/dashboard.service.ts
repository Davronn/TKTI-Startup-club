import { Injectable } from '@nestjs/common';
import { MilestoneStatus, StartupStatus } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthUser) {
    const organizationId = user.organizationId;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [total, statuses, stages, recentStartups, recentActivity, addedThisMonth, overdueMilestones, dueSoonCount] =
      await Promise.all([
        this.prisma.startup.count({
          where: { organizationId, status: { not: StartupStatus.ARCHIVED } },
        }),
        this.prisma.startup.groupBy({
          by: ['status'],
          where: { organizationId },
          _count: { _all: true },
        }),
        this.prisma.startupStage.findMany({
          where: { organizationId, isActive: true },
          orderBy: { position: 'asc' },
          include: {
            _count: {
              select: { startups: { where: { status: { not: StartupStatus.ARCHIVED } } } },
            },
          },
        }),
        this.prisma.startup.findMany({
          where: { organizationId, status: { not: StartupStatus.ARCHIVED } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            currentStage: true,
            curator: { select: { id: true, fullName: true } },
          },
        }),
        this.prisma.auditLog.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 8,
          // Kuzatuvchi/menejer ham dashboardni ko‘radi: IP manzil va o‘zgarishlar tafsilotini bermaymiz
          select: {
            id: true,
            action: true,
            entity: true,
            entityId: true,
            createdAt: true,
            user: { select: { id: true, fullName: true } },
          },
        }),
        this.prisma.startup.count({
          where: { organizationId, createdAt: { gte: monthStart } },
        }),
        this.prisma.startupMilestone.findMany({
          where: {
            organizationId,
            dueDate: { lt: today },
            status: { notIn: [MilestoneStatus.COMPLETED, MilestoneStatus.CANCELLED] },
            startup: { status: { not: StartupStatus.ARCHIVED } },
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
          include: {
            startup: { select: { id: true, name: true } },
            assignee: { select: { id: true, fullName: true } },
          },
        }),
        this.prisma.startupMilestone.count({
          where: {
            organizationId,
            dueDate: { gte: today, lte: weekEnd },
            status: { notIn: [MilestoneStatus.COMPLETED, MilestoneStatus.CANCELLED] },
            startup: { status: { not: StartupStatus.ARCHIVED } },
          },
        }),
      ]);

    const statusCounts = Object.fromEntries(statuses.map((item) => [item.status, item._count._all]));
    return {
      summary: {
        total,
        active: statusCounts.ACTIVE ?? 0,
        paused: statusCounts.PAUSED ?? 0,
        graduated: statusCounts.GRADUATED ?? 0,
        archived: statusCounts.ARCHIVED ?? 0,
        addedThisMonth,
      },
      stages: stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        position: stage.position,
        count: stage._count.startups,
      })),
      recentStartups,
      recentActivity,
      attention: { overdueMilestones, dueSoonCount },
    };
  }
}
