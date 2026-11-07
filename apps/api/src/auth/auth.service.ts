import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AccessTokenPayload, AuthUser, RefreshTokenPayload } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';
import { hashPassword } from './password';
import { LoginAttemptLimiter } from './login-attempts';

@Injectable()
export class AuthService {
  private readonly dummyPasswordHash = hashPassword('timing-check-only-password');
  private readonly loginLimiter = new LoginAttemptLimiter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const email = dto.email.toLowerCase().trim();
    const retryAfter = this.loginLimiter.retryAfterSeconds(email);
    if (retryAfter) {
      throw new HttpException(
        `Juda ko‘p noto‘g‘ri urinish. ${Math.ceil(retryAfter / 60)} daqiqadan so‘ng qayta urinib ko‘ring.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { memberships: { include: { organization: true }, take: 1 } },
    });
    const passwordMatches = await verify(user?.passwordHash ?? await this.dummyPasswordHash, dto.password);
    if (!user || !user.isActive || !passwordMatches) {
      this.loginLimiter.registerFailure(email);
      throw new UnauthorizedException('Email yoki parol noto‘g‘ri');
    }
    this.loginLimiter.reset(email);
    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('Tashkilotga kirish huquqi topilmadi');

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending',
        userAgent: userAgent?.slice(0, 500),
        ipAddress: ipAddress?.slice(0, 64),
        expiresAt: new Date(Date.now() + this.refreshDays * 86_400_000),
      },
    });
    const tokens = await this.createTokens(user, membership, session.id);
    await this.prisma.$transaction([
      this.prisma.userSession.update({
        where: { id: session.id },
        data: { refreshTokenHash: await hash(tokens.refreshToken) },
      }),
      this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
      this.prisma.auditLog.create({
        data: {
          organizationId: membership.organizationId,
          userId: user.id,
          action: AuditAction.LOGIN,
          entity: 'User',
          entityId: user.id,
          ipAddress: ipAddress?.slice(0, 64),
        },
      }),
    ]);

    return {
      ...tokens,
      user: this.toSafeUser(user, membership),
      organization: membership.organization,
    };
  }

  async refresh(refreshToken: string) {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sessiya muddati tugagan');
    }
    if (payload.type !== 'refresh') throw new UnauthorizedException('Noto‘g‘ri token turi');

    const session = await this.prisma.userSession.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          include: {
            memberships: {
              where: { organizationId: payload.organizationId },
              include: { organization: true },
              take: 1,
            },
          },
        },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      !session.user.isActive ||
      !(await verify(session.refreshTokenHash, refreshToken))
    ) {
      throw new UnauthorizedException('Sessiya haqiqiy emas');
    }
    const membership = session.user.memberships[0];
    if (!membership) throw new UnauthorizedException('Kirish huquqi topilmadi');
    const tokens = await this.createTokens(session.user, membership, session.id);
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: await hash(tokens.refreshToken) },
    });
    return {
      ...tokens,
      user: this.toSafeUser(session.user, membership),
      organization: membership.organization,
    };
  }

  async logout(refreshToken?: string, ipAddress?: string) {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        ignoreExpiration: true,
      });
      if (payload.type !== 'refresh') return;
      const revoked = await this.prisma.userSession.updateMany({
        where: { id: payload.sessionId, userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (revoked.count) {
        await this.prisma.auditLog.create({
          data: {
            organizationId: payload.organizationId,
            userId: payload.sub,
            action: AuditAction.LOGOUT,
            entity: 'UserSession',
            entityId: payload.sessionId,
            ipAddress: ipAddress?.slice(0, 64),
          },
        }).catch(() => undefined);
      }
    } catch {
      return;
    }
  }

  async me(userId: string, organizationId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      include: { user: true, organization: true },
    });
    if (!membership || !membership.user.isActive) throw new UnauthorizedException();
    return {
      user: this.toSafeUser(membership.user, membership),
      organization: membership.organization,
    };
  }

  async changePassword(dto: ChangePasswordDto, user: AuthUser) {
    const account = await this.prisma.user.findUnique({ where: { id: user.userId } });
    if (!account || !(await verify(account.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Joriy parol noto‘g‘ri');
    }
    if (await verify(account.passwordHash, dto.newPassword)) {
      throw new UnauthorizedException('Yangi parol joriy paroldan farq qilishi kerak');
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.userId }, data: { passwordHash } }),
      this.prisma.userSession.updateMany({
        where: { userId: user.userId, id: { not: user.sessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          userId: user.userId,
          action: AuditAction.UPDATE,
          entity: 'UserPassword',
          entityId: user.userId,
          changes: { otherSessionsRevoked: true },
        },
      }),
    ]);
    return { success: true };
  }

  async sessions(user: AuthUser) {
    const sessions = await this.prisma.userSession.findMany({
      where: { userId: user.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
    });
    return sessions.map((session) => ({ ...session, isCurrent: session.id === user.sessionId }));
  }

  async revokeSession(sessionId: string, user: AuthUser) {
    if (sessionId === user.sessionId) {
      throw new ConflictException('Joriy sessiya uchun yon menyudagi Chiqish tugmasidan foydalaning');
    }
    const result = await this.prisma.userSession.updateMany({
      where: { id: sessionId, userId: user.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count) throw new NotFoundException('Faol sessiya topilmadi');
    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.userId,
        action: AuditAction.LOGOUT,
        entity: 'UserSession',
        entityId: sessionId,
        changes: { revokedRemotely: true },
      },
    });
    return { success: true };
  }

  private async createTokens(user: any, membership: any, sessionId: string) {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      sessionId,
      organizationId: membership.organizationId,
      role: membership.role,
      email: user.email,
      fullName: user.fullName,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sessionId,
      organizationId: membership.organizationId,
      type: 'refresh',
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('ACCESS_TOKEN_TTL', '15m') as any,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: `${this.refreshDays}d`,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private toSafeUser(user: any, membership: any) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: membership.role,
      organizationId: membership.organizationId,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private get refreshDays() {
    return Number(this.config.get('REFRESH_TOKEN_TTL_DAYS', 7));
  }
}
