import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessTokenPayload, AuthUser } from '../auth.types';

const cookieExtractor = (request: Request): string | null =>
  request?.cookies?.['__Host-access_token'] ?? request?.cookies?.access_token ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    if (payload.type !== 'access') throw new UnauthorizedException('Noto‘g‘ri token turi');
    const session = await this.prisma.userSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: {
            memberships: { where: { organizationId: payload.organizationId }, take: 1 },
          },
        },
      },
    });
    const membership = session?.user.memberships[0];
    if (!session?.user.isActive || !membership) throw new UnauthorizedException('Sessiya bekor qilingan');
    return {
      userId: payload.sub,
      sessionId: payload.sessionId,
      organizationId: payload.organizationId,
      role: membership.role,
      email: session.user.email,
      fullName: session.user.fullName,
    };
  }
}
