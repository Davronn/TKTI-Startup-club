import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { StagesService } from './stages.service';

@Controller('stages')
export class StagesController {
  constructor(private readonly service: StagesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)
  @Post()
  create(@Body() dto: CreateStageDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStageDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }
}
