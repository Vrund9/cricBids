-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentKind" ADD VALUE 'EXTRA_TEAMS';
ALTER TYPE "PaymentKind" ADD VALUE 'THEME_UNLOCK';
ALTER TYPE "PaymentKind" ADD VALUE 'AUCTION_FEE';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "retained" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "auctionFeePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "extraTeams" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "themeUnlocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "auctionsCreated" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fullAccess" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PlanCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "redeemedById" TEXT,
    "redeemedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanCode_code_key" ON "PlanCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PlanCode_redeemedById_key" ON "PlanCode"("redeemedById");

-- AddForeignKey
ALTER TABLE "PlanCode" ADD CONSTRAINT "PlanCode_redeemedById_fkey" FOREIGN KEY ("redeemedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: number each owner's existing auctions in creation order.
UPDATE "Tournament" t SET "sequence" = s.n
FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY "ownerId" ORDER BY "createdAt") AS n FROM "Tournament") s
WHERE t.id = s.id;

UPDATE "User" u SET "auctionsCreated" = c.n
FROM (SELECT "ownerId", COUNT(*) AS n FROM "Tournament" GROUP BY "ownerId") c
WHERE u.id = c."ownerId";

-- Auctions created before pay-per-use keep what they already had: themes were free and there was no auction fee.
UPDATE "Tournament" SET "themeUnlocked" = true, "auctionFeePaid" = true;
