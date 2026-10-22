import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth.types';
import { ListAuditDto } from './dto/list-audit.dto';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(data: {
    organizationId: string;
    userId?: string;
    action: AuditAction;
    entity: string;
    entityId?: string;
    changes?: Prisma.InputJsonValue;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async list(query: ListAuditDto, user: AuthUser) {
    const where: Prisma.AuditLogWhereInput = {
      organizationId: user.organizationId,
      ...(query.action && { action: query.action }),
      ...(query.entity && { entity: query.entity }),
    };
    const page = query.page || 1;
    const limit = query.limit || 30;
    const [items, total, entities] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where: { organizationId: user.organizationId },
        select: { entity: true },
        distinct: ['entity'],
        orderBy: { entity: 'asc' },
      }),
    ]);
    return {
      items,
      entities: entities.map((item) => item.entity),
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }
}
