import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import {
  DOCUMENT_MAX_BYTES,
  isInlineType,
  LOGO_MAX_BYTES,
  StartupFilesService,
  UploadedStartupFile,
} from './startup-files.service';

const EDITORS = [OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER] as const;
const uuid = new ParseUUIDPipe();

/** RFC 5987: o‘zbekcha harflar bilan fayl nomi ham to‘g‘ri chiqadi. */
function contentDisposition(type: 'inline' | 'attachment', name: string) {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

@Controller('startups/:startupId')
export class StartupFilesController {
  constructor(private readonly service: StartupFilesService) {}

  @Get('files')
  list(@Param('startupId', uuid) startupId: string, @CurrentUser() user: AuthUser) {
    return this.service.list(startupId, user);
  }

  @Roles(...EDITORS)
  @Post('files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: DOCUMENT_MAX_BYTES, files: 1 } }))
  upload(
    @Param('startupId', uuid) startupId: string,
    @UploadedFile() file: UploadedStartupFile | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.uploadDocument(startupId, file, user);
  }

  @Get('files/:fileId')
  async content(
    @Param('startupId', uuid) startupId: string,
    @Param('fileId', uuid) fileId: string,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.service.getContent(startupId, fileId, user);
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': contentDisposition(isInlineType(file.contentType) ? 'inline' : 'attachment', file.name),
      // Fayl id'si o‘zgarmaydi (yangi fayl — yangi id), shuning uchun keshlash xavfsiz
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      // PDF/rasm ichidagi har qanday skript ishlamasin
      'Content-Security-Policy': "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    });
    return new StreamableFile(Buffer.from(file.data!));
  }

  @Roles(...EDITORS)
  @Delete('files/:fileId')
  remove(
    @Param('startupId', uuid) startupId: string,
    @Param('fileId', uuid) fileId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.removeDocument(startupId, fileId, user);
  }

  @Roles(...EDITORS)
  @Post('logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: LOGO_MAX_BYTES, files: 1 } }))
  uploadLogo(
    @Param('startupId', uuid) startupId: string,
    @UploadedFile() file: UploadedStartupFile | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.uploadLogo(startupId, file, user);
  }

  @Roles(...EDITORS)
  @Delete('logo')
  removeLogo(@Param('startupId', uuid) startupId: string, @CurrentUser() user: AuthUser) {
    return this.service.removeLogo(startupId, user);
  }
}
