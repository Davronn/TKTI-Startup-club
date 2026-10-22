import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { Request } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

    this.assertTrustedOrigin(request);
    const header = request.headers['x-csrf-token'];
    const headerToken = Array.isArray(header) ? header[0] : header;
    const cookieToken = request.cookies?.['__Host-csrf_token'] ?? request.cookies?.csrf_token;
    if (!headerToken || !cookieToken || !this.matches(headerToken, cookieToken)) {
      throw new ForbiddenException('So‘rov xavfsizlik tekshiruvidan o‘tmadi. Sahifani yangilang.');
    }
    return true;
  }

  private assertTrustedOrigin(request: Request) {
    const source = request.headers.origin || request.headers.referer;
    if (!source) return;
    let origin: string;
    try {
      origin = new URL(source).origin;
    } catch {
      throw new ForbiddenException('Noto‘g‘ri so‘rov manbasi');
    }
    const parsedOrigin = new URL(origin);
    const isLocalDevelopment =
      this.config.get('NODE_ENV') !== 'production' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(parsedOrigin.hostname);
    if (isLocalDevelopment) return;
    const allowed = this.config
      .get<string>('WEB_ORIGIN', 'http://localhost:3000')
      .split(',')
      .map((item) => item.trim().replace(/\/$/, ''))
      .filter(Boolean);
    const renderHostname = this.config.get<string>('RENDER_EXTERNAL_HOSTNAME');
    if (renderHostname) allowed.push(`https://${renderHostname}`);
    if (!allowed.includes(origin)) throw new ForbiddenException('So‘rov manbasiga ruxsat berilmagan');
  }

  private matches(left: string, right: string) {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }
}
