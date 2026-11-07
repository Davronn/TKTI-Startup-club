import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { StagesModule } from './stages/stages.module';
import { StartupsModule } from './startups/startups.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';
import { FinanceModule } from './finance/finance.module';
import { MilestonesModule } from './milestones/milestones.module';
import { validateEnvironment } from './config/environment';
import { CsrfGuard } from './auth/csrf.guard';
import { CashModule } from './cash/cash.module';
import { StartupFilesModule } from './startup-files/startup-files.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '../../.env', '.env'],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    StagesModule,
    StartupsModule,
    StartupFilesModule,
    FinanceModule,
    MilestonesModule,
    CashModule,
    DashboardModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
