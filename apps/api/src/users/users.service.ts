import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from '@node-rs/argon2';
import { AuditAction, OrganizationRole, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(current: AuthUser) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { organizationId: current.organizationId },
      include: { user: true },
      orderBy: { user: { fullName: 'asc' } },
    });
    return memberships.map(({ user, role }) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      role,
    }));
  }

  async create(dto: CreateUserDto, current: AuthUser) {
    if (dto.role === OrganizationRole.SUPER_ADMIN && current.role !== OrganizationRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin rolini faqat super admin bera oladi');
    }
    const email = dto.email.toLowerCase().trim();
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email, fullName: dto.fullName.trim(), passwordHash: await hash(dto.password) },
        });
        await tx.organizationMember.create({
          data: {
            organizationId: current.organizationId,
            userId: created.id,
            role: dto.role ?? OrganizationRole.MANAGER,
          },
        });
        return created;
      });
      await this.audit.log({
        organizationId: current.organizationId,
        userId: current.userId,
        action: AuditAction.CREATE,
        entity: 'User',
        entityId: user.id,
        changes: { email, role: dto.role ?? OrganizationRole.MANAGER },
      });
      return { id: user.id, email: user.email, fullName: user.fullName };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Bu email bilan foydalanuvchi mavjud');
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, current: AuthUser) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: current.organizationId, userId: id } },
    });
    if (!membership) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (membership.role === OrganizationRole.SUPER_ADMIN && current.role !== OrganizationRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin ma’lumotlarini o‘zgartira olmaysiz');
    }
    if (dto.role === OrganizationRole.SUPER_ADMIN && current.role !== OrganizationRole.SUPER_ADMIN) {
      throw new ForbiddenException('Super admin rolini faqat super admin bera oladi');
    }
    if (id === current.userId && dto.isActive === false) {
      throw new ConflictException('O‘zingizni bloklay olmaysiz');
    }
    if (id === current.userId && dto.role && dto.role !== current.role) {
      throw new ConflictException('O‘z rolingizni o‘zgartira olmaysiz');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { fullName: dto.fullName, isActive: dto.isActive },
      }),
      this.prisma.organizationMember.update({
        where: { id: membership.id },
        data: { role: dto.role },
      }),
    ]);
    await this.audit.log({
      organizationId: current.organizationId,
      userId: current.userId,
      action: AuditAction.UPDATE,
      entity: 'User',
      entityId: id,
      changes: dto as any,
    });
    return { success: true };
  }
}
