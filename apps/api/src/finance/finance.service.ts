import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  FinanceCategory,
  FinanceTransactionStatus,
  FinanceTransactionType,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFinanceTransactionDto,
  CreateFundingRoundDto,
  UpdateFinanceProfileDto,
  UpdateFinanceTransactionDto,
  UpdateFundingRoundDto,
} from './dto/finance.dto';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async overview(startupId: string, user: AuthUser) {
    await this.assertStartup(startupId, user.organizationId);
    const [profile, transactions, fundingRounds] = await Promise.all([
      this.prisma.startupFinanceProfile.findUnique({ where: { startupId } }),
      this.prisma.startupFinanceTransaction.findMany({
        where: { startupId, organizationId: user.organizationId },
        include: {
          createdBy: { select: { id: true, fullName: true } },
          fundingRound: { select: { id: true, name: true } },
        },
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
      }),
      this.prisma.startupFundingRound.findMany({
        where: { startupId, organizationId: user.organizationId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const baseCurrency = profile?.baseCurrency || 'UZS';
    const completed = transactions.filter((item) => item.status === FinanceTransactionStatus.COMPLETED);
    const income = this.sum(completed.filter((item) => item.type === FinanceTransactionType.INCOME));
    const funding = this.sum(completed.filter((item) => item.type === FinanceTransactionType.FUNDING));
    const expenses = this.sum(completed.filter((item) => item.type === FinanceTransactionType.EXPENSE));
    const openingBalance = Number(profile?.openingBalance || 0);
    const cashBalance = openingBalance + income + funding - expenses;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setUTCHours(0, 0, 0, 0);
    ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
    const recentExpenses = this.sum(
      completed.filter(
        (item) => item.type === FinanceTransactionType.EXPENSE && item.occurredAt >= ninetyDaysAgo,
      ),
    );
    const monthlyBurn = recentExpenses / 3;

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const thisMonth = completed.filter((item) => item.occurredAt >= monthStart);
    const monthIncome = this.sum(thisMonth.filter((item) => item.type !== FinanceTransactionType.EXPENSE));
    const monthExpense = this.sum(thisMonth.filter((item) => item.type === FinanceTransactionType.EXPENSE));

    const expenseByCategory = Object.values(FinanceCategory)
      .map((category) => ({
        category,
        amount: this.sum(
          completed.filter(
            (item) => item.type === FinanceTransactionType.EXPENSE && item.category === category,
          ),
        ),
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const budgetSpent = profile?.budgetAmount
      ? this.sum(
          completed.filter((item) => {
            if (item.type !== FinanceTransactionType.EXPENSE) return false;
            if (profile.budgetStartDate && item.occurredAt < profile.budgetStartDate) return false;
            if (profile.budgetEndDate && item.occurredAt > profile.budgetEndDate) return false;
            return true;
          }),
        )
      : 0;

    return {
      profile: profile || {
        startupId,
        baseCurrency,
        openingBalance: 0,
        budgetAmount: null,
        budgetStartDate: null,
        budgetEndDate: null,
        notes: null,
      },
      summary: {
        baseCurrency,
        openingBalance,
        income,
        funding,
        expenses,
        cashBalance,
        monthlyBurn,
        runwayMonths: monthlyBurn > 0 ? Math.max(0, cashBalance / monthlyBurn) : null,
        monthIncome,
        monthExpense,
        budgetAmount: profile?.budgetAmount ? Number(profile.budgetAmount) : null,
        budgetSpent,
        budgetRemaining: profile?.budgetAmount ? Number(profile.budgetAmount) - budgetSpent : null,
        expenseByCategory,
      },
      transactions,
      fundingRounds,
    };
  }

  async updateProfile(startupId: string, dto: UpdateFinanceProfileDto, user: AuthUser) {
    await this.assertMutableStartup(startupId, user.organizationId);
    if (dto.budgetStartDate && dto.budgetEndDate && dto.budgetStartDate > dto.budgetEndDate) {
      throw new ConflictException('Budjet boshlanish sanasi tugash sanasidan keyin bo‘lishi mumkin emas');
    }
    const data = {
      ...(dto.baseCurrency !== undefined && { baseCurrency: this.currency(dto.baseCurrency) }),
      ...(dto.openingBalance !== undefined && { openingBalance: dto.openingBalance }),
      ...(dto.budgetAmount !== undefined && { budgetAmount: dto.budgetAmount }),
      ...(dto.budgetStartDate !== undefined && {
        budgetStartDate: dto.budgetStartDate ? new Date(dto.budgetStartDate) : null,
      }),
      ...(dto.budgetEndDate !== undefined && {
        budgetEndDate: dto.budgetEndDate ? new Date(dto.budgetEndDate) : null,
      }),
      ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
      updatedById: user.userId,
    };
    const profile = await this.prisma.startupFinanceProfile.upsert({
      where: { startupId },
      create: { startupId, ...data },
      update: data,
    });
    await this.log(user, AuditAction.UPDATE, 'StartupFinanceProfile', startupId, dto);
    return profile;
  }

  async createTransaction(startupId: string, dto: CreateFinanceTransactionDto, user: AuthUser) {
    await this.assertMutableStartup(startupId, user.organizationId);
    if (dto.fundingRoundId) await this.assertRound(dto.fundingRoundId, startupId, user.organizationId);
    const profile = await this.prisma.startupFinanceProfile.findUnique({ where: { startupId } });
    const currency = this.currency(dto.currency || profile?.baseCurrency || 'UZS');
    const exchangeRate = dto.exchangeRate || 1;
    const transaction = await this.prisma.startupFinanceTransaction.create({
      data: {
        organizationId: user.organizationId,
        startupId,
        fundingRoundId: dto.fundingRoundId || null,
        type: dto.type,
        category: dto.category,
        status: dto.status,
        title: dto.title.trim(),
        amount: dto.amount,
        currency,
        exchangeRate,
        baseAmount: this.baseAmount(dto.amount, exchangeRate),
        counterparty: dto.counterparty?.trim() || null,
        paymentMethod: dto.paymentMethod?.trim() || null,
        reference: dto.reference?.trim() || null,
        occurredAt: new Date(dto.occurredAt),
        receiptUrl: dto.receiptUrl?.trim() || null,
        notes: dto.notes?.trim() || null,
        createdById: user.userId,
        updatedById: user.userId,
      },
    });
    await this.log(user, AuditAction.CREATE, 'StartupFinanceTransaction', transaction.id, {
      startupId,
      type: dto.type,
      amount: dto.amount,
      currency,
    });
    return transaction;
  }

  async updateTransaction(
    startupId: string,
    transactionId: string,
    dto: UpdateFinanceTransactionDto,
    user: AuthUser,
  ) {
    await this.assertMutableStartup(startupId, user.organizationId);
    const current = await this.assertTransaction(transactionId, startupId, user.organizationId);
    if (dto.fundingRoundId) await this.assertRound(dto.fundingRoundId, startupId, user.organizationId);
    const amount = dto.amount ?? Number(current.amount);
    const exchangeRate = dto.exchangeRate ?? Number(current.exchangeRate);
    const transaction = await this.prisma.startupFinanceTransaction.update({
      where: { id: transactionId },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.currency !== undefined && { currency: this.currency(dto.currency) }),
        ...(dto.exchangeRate !== undefined && { exchangeRate: dto.exchangeRate }),
        ...(dto.fundingRoundId !== undefined && { fundingRoundId: dto.fundingRoundId || null }),
        ...(dto.counterparty !== undefined && { counterparty: dto.counterparty?.trim() || null }),
        ...(dto.paymentMethod !== undefined && { paymentMethod: dto.paymentMethod?.trim() || null }),
        ...(dto.reference !== undefined && { reference: dto.reference?.trim() || null }),
        ...(dto.occurredAt !== undefined && { occurredAt: new Date(dto.occurredAt) }),
        ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl?.trim() || null }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        baseAmount: this.baseAmount(amount, exchangeRate),
        updatedById: user.userId,
      },
    });
    await this.log(user, AuditAction.UPDATE, 'StartupFinanceTransaction', transactionId, dto);
    return transaction;
  }

  async deleteTransaction(startupId: string, transactionId: string, user: AuthUser) {
    await this.assertMutableStartup(startupId, user.organizationId);
    await this.assertTransaction(transactionId, startupId, user.organizationId);
    await this.prisma.startupFinanceTransaction.delete({ where: { id: transactionId } });
    await this.log(user, AuditAction.DELETE, 'StartupFinanceTransaction', transactionId, { startupId });
    return { success: true };
  }

  async createFundingRound(startupId: string, dto: CreateFundingRoundDto, user: AuthUser) {
    await this.assertMutableStartup(startupId, user.organizationId);
    const profile = await this.prisma.startupFinanceProfile.findUnique({ where: { startupId } });
    const exchangeRate = dto.exchangeRate || 1;
    const round = await this.prisma.startupFundingRound.create({
      data: {
        organizationId: user.organizationId,
        startupId,
        type: dto.type,
        status: dto.status,
        name: dto.name.trim(),
        targetAmount: dto.targetAmount,
        raisedAmount: dto.raisedAmount || 0,
        currency: this.currency(dto.currency || profile?.baseCurrency || 'UZS'),
        exchangeRate,
        baseRaisedAmount: this.baseAmount(dto.raisedAmount || 0, exchangeRate),
        preMoneyValuation: dto.preMoneyValuation,
        postMoneyValuation: dto.postMoneyValuation,
        equityPercent: dto.equityPercent,
        investorName: dto.investorName?.trim() || null,
        openedAt: dto.openedAt ? new Date(dto.openedAt) : null,
        closedAt: dto.closedAt ? new Date(dto.closedAt) : null,
        notes: dto.notes?.trim() || null,
        createdById: user.userId,
        updatedById: user.userId,
      },
    });
    await this.log(user, AuditAction.CREATE, 'StartupFundingRound', round.id, { startupId, name: round.name });
    return round;
  }

  async updateFundingRound(
    startupId: string,
    roundId: string,
    dto: UpdateFundingRoundDto,
    user: AuthUser,
  ) {
    await this.assertMutableStartup(startupId, user.organizationId);
    const current = await this.assertRound(roundId, startupId, user.organizationId);
    const raisedAmount = dto.raisedAmount ?? Number(current.raisedAmount);
    const exchangeRate = dto.exchangeRate ?? Number(current.exchangeRate);
    const round = await this.prisma.startupFundingRound.update({
      where: { id: roundId },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
        ...(dto.raisedAmount !== undefined && { raisedAmount: dto.raisedAmount }),
        ...(dto.currency !== undefined && { currency: this.currency(dto.currency) }),
        ...(dto.exchangeRate !== undefined && { exchangeRate: dto.exchangeRate }),
        ...(dto.preMoneyValuation !== undefined && { preMoneyValuation: dto.preMoneyValuation }),
        ...(dto.postMoneyValuation !== undefined && { postMoneyValuation: dto.postMoneyValuation }),
        ...(dto.equityPercent !== undefined && { equityPercent: dto.equityPercent }),
        ...(dto.investorName !== undefined && { investorName: dto.investorName?.trim() || null }),
        ...(dto.openedAt !== undefined && { openedAt: dto.openedAt ? new Date(dto.openedAt) : null }),
        ...(dto.closedAt !== undefined && { closedAt: dto.closedAt ? new Date(dto.closedAt) : null }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        baseRaisedAmount: this.baseAmount(raisedAmount, exchangeRate),
        updatedById: user.userId,
      },
    });
    await this.log(user, AuditAction.UPDATE, 'StartupFundingRound', roundId, dto);
    return round;
  }

  async deleteFundingRound(startupId: string, roundId: string, user: AuthUser) {
    await this.assertMutableStartup(startupId, user.organizationId);
    await this.assertRound(roundId, startupId, user.organizationId);
    await this.prisma.startupFundingRound.delete({ where: { id: roundId } });
    await this.log(user, AuditAction.DELETE, 'StartupFundingRound', roundId, { startupId });
    return { success: true };
  }

  private sum(items: { baseAmount: Prisma.Decimal }[]) {
    return items.reduce((total, item) => total + Number(item.baseAmount), 0);
  }

  private baseAmount(amount: number, exchangeRate: number) {
    return new Prisma.Decimal(amount).mul(exchangeRate).toDecimalPlaces(2);
  }

  private currency(value: string) {
    return value.trim().toUpperCase();
  }

  private async assertStartup(id: string, organizationId: string) {
    const startup = await this.prisma.startup.findFirst({ where: { id, organizationId }, select: { id: true, status: true } });
    if (!startup) throw new NotFoundException('Startap topilmadi');
    return startup;
  }

  private async assertMutableStartup(id: string, organizationId: string) {
    const startup = await this.assertStartup(id, organizationId);
    if (startup.status === 'ARCHIVED') {
      throw new ConflictException('Arxivlangan startap moliyasi faqat o‘qish rejimida');
    }
    return startup;
  }

  private async assertTransaction(id: string, startupId: string, organizationId: string) {
    const transaction = await this.prisma.startupFinanceTransaction.findFirst({
      where: { id, startupId, organizationId },
    });
    if (!transaction) throw new NotFoundException('Moliyaviy operatsiya topilmadi');
    return transaction;
  }

  private async assertRound(id: string, startupId: string, organizationId: string) {
    const round = await this.prisma.startupFundingRound.findFirst({
      where: { id, startupId, organizationId },
    });
    if (!round) throw new NotFoundException('Investitsiya raundi topilmadi');
    return round;
  }

  private log(
    user: AuthUser,
    action: AuditAction,
    entity: string,
    entityId: string,
    changes: unknown,
  ) {
    return this.audit.log({
      organizationId: user.organizationId,
      userId: user.userId,
      action,
      entity,
      entityId,
      changes: changes as Prisma.InputJsonValue,
    });
  }
}
