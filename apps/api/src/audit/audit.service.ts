import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
}
