import { Controller, Get, Query } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { ListAuditDto } from './dto/list-audit.dto';

@Controller('audit')
@Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  list(@Query() query: ListAuditDto, @CurrentUser() user: AuthUser) {
    return this.service.list(query, user);
  }
}
