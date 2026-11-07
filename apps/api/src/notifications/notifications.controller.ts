import { Controller, Get, Post } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';

@Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get('status')
  status() {
    return this.service.status();
  }

  /** Sozlamani tekshirish uchun hozirning o‘zida xabar yuboradi (vazifa bo‘lmasa ham). */
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post('test')
  async test(@CurrentUser() user: AuthUser) {
    const sent = await this.service.sendDigest(user.organizationId, { force: true });
    return { sent };
  }
}
