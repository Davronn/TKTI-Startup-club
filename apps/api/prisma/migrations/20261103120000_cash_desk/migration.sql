-- CreateEnum
CREATE TYPE "CashTransactionKind" AS ENUM ('IN', 'OUT', 'MOVE');

-- CreateEnum
CREATE TYPE "CashAccount" AS ENUM ('CASH', 'CARD');

-- CreateTable
CREATE TABLE "cash_transactions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "kind" "CashTransactionKind" NOT NULL,
    "doc_no" INTEGER NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "date" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "person" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(14,3),
    "unit_price" DECIMAL(20,2),
    "account" "CashAccount",
    "from_account" "CashAccount",
    "to_account" "CashAccount",
    "recipient" TEXT NOT NULL DEFAULT '',
    "commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "commission" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "usage" TEXT NOT NULL DEFAULT '',
    "startup_id" UUID,
    "receipt_id" UUID,
    "archived_at" TIMESTAMP(3),
    "archive_reason" TEXT NOT NULL DEFAULT '',
    "archived_by_id" UUID,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_receipts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_settings" (
    "organization_id" UUID NOT NULL,
    "org_name" TEXT NOT NULL DEFAULT 'TKTI',
    "unit_name" TEXT NOT NULL DEFAULT 'Startaplarni rivojlantirish va ekotizimni joriy etish bo‘limi',
    "head" TEXT NOT NULL DEFAULT '',
    "accountant" TEXT NOT NULL DEFAULT '',
    "opening_cash" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "opening_card" DECIMAL(20,2) NOT NULL DEFAULT 0,
    "opening_date" DATE,
    "default_commission_pct" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_settings_pkey" PRIMARY KEY ("organization_id")
);

-- CreateIndex
CREATE INDEX "cash_transactions_organization_id_date_idx" ON "cash_transactions"("organization_id", "date");

-- CreateIndex
CREATE INDEX "cash_transactions_startup_id_idx" ON "cash_transactions"("startup_id");

-- CreateIndex
CREATE UNIQUE INDEX "cash_transactions_organization_id_kind_doc_no_key" ON "cash_transactions"("organization_id", "kind", "doc_no");

-- CreateIndex
CREATE INDEX "cash_receipts_organization_id_idx" ON "cash_receipts"("organization_id");

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_startup_id_fkey" FOREIGN KEY ("startup_id") REFERENCES "startups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "cash_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_archived_by_id_fkey" FOREIGN KEY ("archived_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_transactions" ADD CONSTRAINT "cash_transactions_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_receipts" ADD CONSTRAINT "cash_receipts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_receipts" ADD CONSTRAINT "cash_receipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_settings" ADD CONSTRAINT "cash_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_settings" ADD CONSTRAINT "cash_settings_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
