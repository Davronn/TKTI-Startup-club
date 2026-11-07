import { IsBoolean, IsHexColor, IsInt, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';

export class UpdateStageDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
