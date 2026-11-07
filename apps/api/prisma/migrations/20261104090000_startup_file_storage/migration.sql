-- CreateEnum
CREATE TYPE "StartupFileKind" AS ENUM ('LOGO', 'DOCUMENT');

-- AlterTable
ALTER TABLE "startup_files" ADD COLUMN "kind" "StartupFileKind" NOT NULL DEFAULT 'DOCUMENT',
ADD COLUMN "data" BYTEA;
