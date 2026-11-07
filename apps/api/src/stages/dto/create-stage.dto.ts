import { IsHexColor, IsInt, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';

export class CreateStageDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
