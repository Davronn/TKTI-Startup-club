import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateStartupMemberDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  linkedinUrl?: string;

  @IsOptional()
  @IsBoolean()
  isFounder?: boolean;
}

export class CreateStartupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsUUID()
  currentStageId: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  problem?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  solution?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  teamSize?: number;

  @IsOptional()
  @IsDateString()
  foundedAt?: string;

  @IsOptional()
  @IsDateString()
  joinedAt?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  logoUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  pitchDeckUrl?: string;

  @IsOptional()
  @IsUUID()
  curatorId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateStartupMemberDto)
  members?: CreateStartupMemberDto[];
}
