import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChangeStageDto {
  @IsUUID()
  stageId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
