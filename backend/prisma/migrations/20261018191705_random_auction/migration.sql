-- AlterEnum
ALTER TYPE "PaymentKind" ADD VALUE 'RANDOM_AUCTION';

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "randomUnlocked" BOOLEAN NOT NULL DEFAULT false;
