import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ChangeStageDto } from './dto/change-stage.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { CreateStartupDto } from './dto/create-startup.dto';
import { ListStartupsDto } from './dto/list-startups.dto';
import { UpdateStartupDto } from './dto/update-startup.dto';
import { StartupsService } from './startups.service';

@Controller('startups')
export class StartupsController {
  constructor(private readonly service: StartupsService) {}

  @Get()
  list(@Query() query: ListStartupsDto, @CurrentUser() user: AuthUser) {
    return this.service.list(query, user);
  }

  @Get('pipeline')
  pipeline(@CurrentUser() user: AuthUser) {
    return this.service.pipeline(user);
  }

  @Get('industries')
  industries(@CurrentUser() user: AuthUser) {
    return this.service.industries(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Post()
  create(@Body() dto: CreateStartupDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateStartupDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Post(':id/stage')
  changeStage(
    @Param('id') id: string,
    @Body() dto: ChangeStageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.changeStage(id, dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.addNote(id, dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)
  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.archive(id, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)
  @Post(':id/restore')
  restore(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.restore(id, user);
  }
}
