CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE', 'FUNDING');
CREATE TYPE "FinanceTransactionStatus" AS ENUM ('PLANNED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "FinanceCategory" AS ENUM ('SALES', 'SERVICES', 'GRANT', 'INVESTMENT', 'LOAN', 'EQUIPMENT', 'SOFTWARE', 'MARKETING', 'SALARY', 'RENT', 'OPERATIONS', 'TAX', 'TRAVEL', 'OTHER');
CREATE TYPE "FundingRoundType" AS ENUM ('BOOTSTRAP', 'GRANT', 'PRE_SEED', 'SEED', 'SERIES_A', 'SERIES_B', 'SERIES_C', 'OTHER');
CREATE TYPE "FundingRoundStatus" AS ENUM ('PLANNED', 'OPEN', 'CLOSED', 'CANCELLED');

CREATE TABLE "startup_finance_profiles" (
    "startup_id" UUID NOT NULL,
    "base_currency" VARCHAR(3) NOT NULL DEFAULT 'UZS',
    "opening_balance" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "budget_amount" DECIMAL(20,2),
    "budget_start_date" DATE,
    "budget_end_date" DATE,
    "notes" TEXT,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "startup_finance_profiles_pkey" PRIMARY KEY ("startup_id")
);

CREATE TABLE "startup_funding_rounds" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "startup_id" UUID NOT NULL,
    "type" "FundingRoundType" NOT NULL,
    "status" "FundingRoundStatus" NOT NULL DEFAULT 'PLANNED',
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(20,2),
    "raised_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'UZS',
    "exchange_rate" DECIMAL(20,6) NOT NULL DEFAULT 1,
    "base_raised_amount" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "pre_money_valuation" DECIMAL(20,2),
    "post_money_valuation" DECIMAL(20,2),
    "equity_percent" DECIMAL(7,4),
    "investor_name" TEXT,
    "opened_at" DATE,
    "closed_at" DATE,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "startup_funding_rounds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "startup_finance_transactions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "startup_id" UUID NOT NULL,
    "funding_round_id" UUID,
    "type" "FinanceTransactionType" NOT NULL,
    "category" "FinanceCategory" NOT NULL,
    "status" "FinanceTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "title" TEXT NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'UZS',
    "exchange_rate" DECIMAL(20,6) NOT NULL DEFAULT 1,
    "base_amount" DECIMAL(20,2) NOT NULL,
    "counterparty" TEXT,
    "payment_method" TEXT,
    "reference" TEXT,
    "occurred_at" DATE NOT NULL,
    "receipt_url" TEXT,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "startup_finance_transactions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "startup_finance_transactions_organization_id_startup_id_occurred_at_idx" ON "startup_finance_transactions"("organization_id", "startup_id", "occurred_at");
CREATE INDEX "startup_finance_transactions_startup_id_type_status_idx" ON "startup_finance_transactions"("startup_id", "type", "status");
CREATE INDEX "startup_finance_transactions_funding_round_id_idx" ON "startup_finance_transactions"("funding_round_id");
CREATE INDEX "startup_funding_rounds_organization_id_startup_id_status_idx" ON "startup_funding_rounds"("organization_id", "startup_id", "status");
CREATE INDEX "startup_funding_rounds_startup_id_created_at_idx" ON "startup_funding_rounds"("startup_id", "created_at");

ALTER TABLE "startup_finance_profiles" ADD CONSTRAINT "startup_finance_profiles_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_finance_profiles" ADD CONSTRAINT "startup_finance_profiles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_funding_rounds" ADD CONSTRAINT "startup_funding_rounds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_funding_rounds" ADD CONSTRAINT "startup_funding_rounds_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_funding_rounds" ADD CONSTRAINT "startup_funding_rounds_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_funding_rounds" ADD CONSTRAINT "startup_funding_rounds_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_finance_transactions" ADD CONSTRAINT "startup_finance_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_finance_transactions" ADD CONSTRAINT "startup_finance_transactions_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "startup_finance_transactions" ADD CONSTRAINT "startup_finance_transactions_funding_round_id_fkey" FOREIGN KEY ("funding_round_id") REFERENCES "startup_funding_rounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "startup_finance_transactions" ADD CONSTRAINT "startup_finance_transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "startup_finance_transactions" ADD CONSTRAINT "startup_finance_transactions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
