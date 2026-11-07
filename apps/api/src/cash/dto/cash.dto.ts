import { CashAccount, CashTransactionKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Yaratish va to‘liq tahrirlash (PUT) uchun bir xil DTO: hujjat raqami va komissiya serverda hisoblanadi. */
export class SaveCashTransactionDto {
  @IsEnum(CashTransactionKind)
  kind!: CashTransactionKind;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1e13)
  amount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(1e6)
  quantity?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1e12)
  unitPrice?: number | null;

  @Matches(ISO_DATE, { message: 'Sana YYYY-MM-DD formatida bo‘lishi kerak' })
  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  person?: string;

  @IsOptional()
  @IsEnum(CashAccount)
  account?: CashAccount | null;

  @IsOptional()
  @IsEnum(CashAccount)
  fromAccount?: CashAccount | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recipient?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(49.99)
  commissionPct?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  usage?: string;

  @IsOptional()
  @IsUUID()
  receiptId?: string | null;

  @IsOptional()
  @IsUUID()
  startupId?: string | null;
}

export class UpdateCashUsageDto {
  @IsString()
  @MaxLength(2000)
  usage!: string;
}

export class ArchiveCashTransactionDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class UpdateCashSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  orgName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  unitName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  head?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  accountant?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1e13)
  openingCash?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1e13)
  openingCard?: number;

  @IsOptional()
  @Matches(ISO_DATE, { message: 'Sana YYYY-MM-DD formatida bo‘lishi kerak' })
  openingDate?: string | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(49.99)
  defaultCommissionPct?: number;
}

export class CashExportQueryDto {
  @IsIn(['xlsx', 'docx', 'csv'])
  format!: 'xlsx' | 'docx' | 'csv';

  @IsOptional()
  @Matches(ISO_DATE)
  from?: string;

  @IsOptional()
  @Matches(ISO_DATE)
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @Type(() => String)
  @IsUUID()
  startupId?: string;
}
