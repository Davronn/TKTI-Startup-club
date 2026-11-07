import { StartupStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export const STARTUP_SORT_FIELDS = ['updatedAt', 'name', 'joinedAt', 'stage', 'status', 'curator', 'team'] as const;
export type StartupSortField = (typeof STARTUP_SORT_FIELDS)[number];

export class ListStartupsDto {
  @IsOptional()
  @IsIn(STARTUP_SORT_FIELDS)
  sort?: StartupSortField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  stageId?: string;

  @IsOptional()
  @IsEnum(StartupStatus)
  status?: StartupStatus;

  @IsOptional()
  @IsUUID()
  curatorId?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}
