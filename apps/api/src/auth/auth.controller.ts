import { Body, Controller, Delete, Get, Header, Param, ParseUUIDPipe, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './auth.types';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, req.headers['user-agent'], req.ip);
    this.setCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, organization: result.organization };
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.['__Host-refresh_token'] ?? req.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('Refresh token topilmadi');
    const result = await this.authService.refresh(refreshToken);
    this.setCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, organization: result.organization };
  }

  @Post('logout')
  @Public()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(
      req.cookies?.['__Host-refresh_token'] ?? req.cookies?.refresh_token,
      req.ip,
    );
    this.clearAuthCookies(res);
    return { success: true };
  }

  @Public()
  @Get('csrf')
  @Header('Cache-Control', 'no-store')
  csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const existing = req.cookies?.['__Host-csrf_token'] ?? req.cookies?.csrf_token;
    const csrfToken = existing || randomBytes(32).toString('base64url');
    res.cookie(this.cookieName('csrf_token'), csrfToken, {
      httpOnly: false,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });
    return { csrfToken };
  }

  @Post('change-password')
  changePassword(@Body() dto: ChangePasswordDto, @CurrentUser() user: AuthUser) {
    return this.authService.changePassword(dto, user);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.userId, user.organizationId);
  }

  @Get('sessions')
  sessions(@CurrentUser() user: AuthUser) {
    return this.authService.sessions(user);
  }

  @Delete('sessions/:id')
  revokeSession(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @CurrentUser() user: AuthUser) {
    return this.authService.revokeSession(id, user);
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const common = { httpOnly: true, secure: this.isProduction, sameSite: 'strict' as const, path: '/' };
    res.setHeader('Cache-Control', 'no-store');
    res.cookie(this.cookieName('access_token'), accessToken, { ...common, maxAge: 15 * 60 * 1000 });
    res.cookie(this.cookieName('refresh_token'), refreshToken, {
      ...common,
      maxAge: Number(this.config.get('REFRESH_TOKEN_TTL_DAYS', 7)) * 86_400_000,
    });
  }

  private clearAuthCookies(res: Response) {
    for (const name of ['access_token', 'refresh_token', '__Host-access_token', '__Host-refresh_token']) {
      res.clearCookie(name, { path: '/', secure: name.startsWith('__Host-'), sameSite: 'strict' });
    }
  }

  private cookieName(name: string) {
    return this.isProduction ? `__Host-${name}` : name;
  }

  private get isProduction() {
    return this.config.get('NODE_ENV') === 'production';
  }
}
