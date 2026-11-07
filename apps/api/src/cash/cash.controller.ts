import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrganizationRole } from '@prisma/client';
import { Response } from 'express';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CASH_RECEIPT_MAX_BYTES } from './cash.constants';
import { CashService, UploadedReceipt } from './cash.service';
import {
  ArchiveCashTransactionDto,
  CashExportQueryDto,
  SaveCashTransactionDto,
  UpdateCashSettingsDto,
  UpdateCashUsageDto,
} from './dto/cash.dto';

const EDITORS = [OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER] as const;
const ADMINS = [OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN] as const;
const uuid = new ParseUUIDPipe({ version: '4' });

/**
 * Bo‘lim kassasi. Rollar asosiy tizimdan:
 * kuzatuvchi — ko‘rish va hisobot yuklash; menejer — yozuv kiritish; admin — sozlamalar va butunlay o‘chirish.
 */
@Controller('cash')
export class CashController {
  constructor(private readonly service: CashService) {}

  @Get('transactions')
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  @Get('transactions/:id')
  findOne(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user);
  }

  @Roles(...EDITORS)
  @Post('transactions')
  create(@Body() dto: SaveCashTransactionDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Roles(...EDITORS)
  @Put('transactions/:id')
  update(@Param('id', uuid) id: string, @Body() dto: SaveCashTransactionDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Roles(...EDITORS)
  @Patch('transactions/:id/usage')
  usage(@Param('id', uuid) id: string, @Body() dto: UpdateCashUsageDto, @CurrentUser() user: AuthUser) {
    return this.service.updateUsage(id, dto.usage, user);
  }

  @Roles(...EDITORS)
  @Post('transactions/:id/archive')
  archive(@Param('id', uuid) id: string, @Body() dto: ArchiveCashTransactionDto, @CurrentUser() user: AuthUser) {
    return this.service.archive(id, dto.reason, user);
  }

  @Roles(...EDITORS)
  @Post('transactions/:id/restore')
  restore(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.service.restore(id, user);
  }

  @Roles(...ADMINS)
  @Delete('transactions/:id')
  purge(@Param('id', uuid) id: string, @CurrentUser() user: AuthUser) {
    return this.service.purge(id, user);
  }

  @Roles(...EDITORS)
  @Post('receipts')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: CASH_RECEIPT_MAX_BYTES, files: 1 } }))
  upload(@UploadedFile() file: UploadedReceipt | undefined, @CurrentUser() user: AuthUser) {
    return this.service.uploadReceipt(file, user);
  }

  @Get('receipts/:id')
  async receipt(
    @Param('id', uuid) id: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const receipt = await this.service.getReceipt(id, user);
    res.set({
      'Content-Type': receipt.mimeType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      // PDF/rasm ichidagi har qanday skript ishlamasin
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    });
    return new StreamableFile(Buffer.from(receipt.data));
  }

  @Get('settings')
  settings(@CurrentUser() user: AuthUser) {
    return this.service.getSettings(user);
  }

  @Roles(...ADMINS)
  @Put('settings')
  updateSettings(@Body() dto: UpdateCashSettingsDto, @CurrentUser() user: AuthUser) {
    return this.service.updateSettings(dto, user);
  }

  @Get('export')
  async export(
    @Query() query: CashExportQueryDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.service.export(query, user);
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
      'Cache-Control': 'no-store',
    });
    return new StreamableFile(file.buffer);
  }
}
