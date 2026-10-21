import { PartialType } from '@nestjs/mapped-types';
import {
  FinanceCategory,
  FinanceTransactionStatus,
  FinanceTransactionType,
  FundingRoundStatus,
  FundingRoundType,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const currencyMessage = 'Valuta 3 harfli ISO kod bo‘lishi kerak (masalan, UZS yoki USD)';

export class UpdateFinanceProfileDto {
  @IsOptional()
  @Matches(/^[A-Za-z]{3}$/, { message: currencyMessage })
  baseCurrency?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  openingBalance?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  budgetAmount?: number | null;

  @IsOptional()
  @IsDateString()
  budgetStartDate?: string | null;

  @IsOptional()
  @IsDateString()
  budgetEndDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class CreateFinanceTransactionDto {
  @IsEnum(FinanceTransactionType)
  type!: FinanceTransactionType;

  @IsEnum(FinanceCategory)
  category!: FinanceCategory;

  @IsOptional()
  @IsEnum(FinanceTransactionStatus)
  status?: FinanceTransactionStatus;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @Matches(/^[A-Za-z]{3}$/, { message: currencyMessage })
  currency?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  counterparty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(500)
  receiptUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsOptional()
  @IsString()
  fundingRoundId?: string;
}

export class UpdateFinanceTransactionDto extends PartialType(CreateFinanceTransactionDto) {}

export class CreateFundingRoundDto {
  @IsEnum(FundingRoundType)
  type!: FundingRoundType;

  @IsOptional()
  @IsEnum(FundingRoundStatus)
  status?: FundingRoundStatus;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  targetAmount?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  raisedAmount?: number;

  @IsOptional()
  @Matches(/^[A-Za-z]{3}$/, { message: currencyMessage })
  currency?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0.000001)
  exchangeRate?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  preMoneyValuation?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  postMoneyValuation?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  equityPercent?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  investorName?: string;

  @IsOptional()
  @IsDateString()
  openedAt?: string;

  @IsOptional()
  @IsDateString()
  closedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

export class UpdateFundingRoundDto extends PartialType(CreateFundingRoundDto) {}
