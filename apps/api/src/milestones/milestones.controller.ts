import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/milestone.dto';
import { MilestonesService } from './milestones.service';

@Controller('startups/:startupId/milestones')
export class MilestonesController {
  constructor(private readonly service: MilestonesService) {}

  @Get()
  list(@Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string, @CurrentUser() user: AuthUser) {
    return this.service.list(startupId, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Post()
  create(
    @Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string,
    @Body() dto: CreateMilestoneDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(startupId, dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Patch(':milestoneId')
  update(
    @Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string,
    @Param('milestoneId', new ParseUUIDPipe({ version: '4' })) milestoneId: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(startupId, milestoneId, dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)
  @Delete(':milestoneId')
  remove(
    @Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string,
    @Param('milestoneId', new ParseUUIDPipe({ version: '4' })) milestoneId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.remove(startupId, milestoneId, user);
  }
}
