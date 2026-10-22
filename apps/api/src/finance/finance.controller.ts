import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/auth.types';
import {
  CreateFinanceTransactionDto,
  CreateFundingRoundDto,
  UpdateFinanceProfileDto,
  UpdateFinanceTransactionDto,
  UpdateFundingRoundDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';

@Controller('startups/:startupId/finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get()
  overview(@Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string, @CurrentUser() user: AuthUser) {
    return this.service.overview(startupId, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Patch('profile')
  updateProfile(
    @Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string,
    @Body() dto: UpdateFinanceProfileDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateProfile(startupId, dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Post('transactions')
  createTransaction(
    @Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string,
    @Body() dto: CreateFinanceTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createTransaction(startupId, dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Patch('transactions/:transactionId')
  updateTransaction(
    @Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string,
    @Param('transactionId', new ParseUUIDPipe({ version: '4' })) transactionId: string,
    @Body() dto: UpdateFinanceTransactionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateTransaction(startupId, transactionId, dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)
  @Delete('transactions/:transactionId')
  deleteTransaction(
    @Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string,
    @Param('transactionId', new ParseUUIDPipe({ version: '4' })) transactionId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.deleteTransaction(startupId, transactionId, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Post('funding-rounds')
  createFundingRound(
    @Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string,
    @Body() dto: CreateFundingRoundDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.createFundingRound(startupId, dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN, OrganizationRole.MANAGER)
  @Patch('funding-rounds/:roundId')
  updateFundingRound(
    @Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string,
    @Param('roundId', new ParseUUIDPipe({ version: '4' })) roundId: string,
    @Body() dto: UpdateFundingRoundDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.updateFundingRound(startupId, roundId, dto, user);
  }

  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ADMIN)
  @Delete('funding-rounds/:roundId')
  deleteFundingRound(
    @Param('startupId', new ParseUUIDPipe({ version: '4' })) startupId: string,
    @Param('roundId', new ParseUUIDPipe({ version: '4' })) roundId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.deleteFundingRound(startupId, roundId, user);
  }
}
