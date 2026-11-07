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
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const INTERNAL_FILE_URL = /^\/api\/backend\/startups\/[0-9a-f-]{36}\/files\/[0-9a-f-]{36}$/i;

export class CreateStartupMemberDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  role?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
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
  @MaxLength(120)
  industry?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  website?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
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
  // Tizimga yuklangan logotip ichki manzil bilan saqlanadi; tashqi havola esa to‘liq URL bo‘lishi kerak
  @ValidateIf((dto: CreateStartupDto) => !INTERNAL_FILE_URL.test(dto.logoUrl ?? ''))
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  logoUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
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
