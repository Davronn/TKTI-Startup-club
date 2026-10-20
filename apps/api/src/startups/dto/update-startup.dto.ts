import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { StartupStatus } from '@prisma/client';
import { CreateStartupDto } from './create-startup.dto';

export class UpdateStartupDto extends PartialType(CreateStartupDto) {
  @IsOptional()
  @IsEnum(StartupStatus)
  status?: StartupStatus;
}
