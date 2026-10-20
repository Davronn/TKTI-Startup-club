import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { hash, verify } from '@node-rs/argon2';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AccessTokenPayload, RefreshTokenPayload } from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { memberships: { include: { organization: true }, take: 1 } },
    });
    if (!user || !user.isActive || !(await verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Email yoki parol noto‘g‘ri');
    }
    const membership = user.memberships[0];
    if (!membership) throw new UnauthorizedException('Tashkilotga kirish huquqi topilmadi');

    const session = await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: 'pending',
        userAgent,
        ipAddress,
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
          ipAddress,
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
        user: { include: { memberships: { include: { organization: true }, take: 1 } } },
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

  async logout(refreshToken?: string) {
    if (!refreshToken) return;
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        ignoreExpiration: true,
      });
      await this.prisma.userSession.updateMany({
        where: { id: payload.sessionId, userId: payload.sub, revokedAt: null },
        data: { revokedAt: new Date() },
      });
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

  private async createTokens(user: any, membership: any, sessionId: string) {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
      email: user.email,
      fullName: user.fullName,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = { sub: user.id, sessionId, type: 'refresh' };
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
