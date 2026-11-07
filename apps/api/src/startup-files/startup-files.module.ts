import { Module } from '@nestjs/common';
import { StartupFilesController } from './startup-files.controller';
import { StartupFilesService } from './startup-files.service';

@Module({ controllers: [StartupFilesController], providers: [StartupFilesService] })
export class StartupFilesModule {}
