import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto, req.headers['user-agent'], req.ip);
    this.setCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, organization: result.organization };
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) throw new UnauthorizedException('Refresh token topilmadi');
    const result = await this.authService.refresh(refreshToken);
    this.setCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, organization: result.organization };
  }

  @Post('logout')
  @Public()
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.refresh_token);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { success: true };
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.userId, user.organizationId);
  }

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    const secure = this.config.get('NODE_ENV') === 'production';
    const common = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
    res.cookie('access_token', accessToken, { ...common, maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refreshToken, {
      ...common,
      maxAge: Number(this.config.get('REFRESH_TOKEN_TTL_DAYS', 7)) * 86_400_000,
    });
  }
}
