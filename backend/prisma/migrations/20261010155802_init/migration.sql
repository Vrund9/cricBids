-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'READY', 'LIVE', 'PAUSED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PlayerStatus" AS ENUM ('AVAILABLE', 'LIVE', 'SOLD', 'UNSOLD');

-- CreateEnum
CREATE TYPE "PlayerSource" AS ENUM ('EXCEL', 'FORM', 'MANUAL');

-- CreateEnum
CREATE TYPE "PlayerOrder" AS ENUM ('RANDOM', 'CATEGORY_RANDOM', 'SEQUENTIAL');

-- CreateEnum
CREATE TYPE "BidSource" AS ENUM ('AUCTIONEER', 'REMOTE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "resetTokenHash" TEXT,
    "resetTokenExp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "venue" TEXT,
    "auctionDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "teamPurse" INTEGER NOT NULL DEFAULT 100000,
    "basePrice" INTEGER NOT NULL DEFAULT 2000,
    "bidIncrements" JSONB NOT NULL,
    "categoryBasePrices" JSONB,
    "minSquad" INTEGER NOT NULL DEFAULT 11,
    "maxSquad" INTEGER NOT NULL DEFAULT 15,
    "playerOrder" "PlayerOrder" NOT NULL DEFAULT 'RANDOM',
    "bidTimerSec" INTEGER NOT NULL DEFAULT 0,
    "setupComplete" BOOLEAN NOT NULL DEFAULT false,
    "registrationOpen" BOOLEAN NOT NULL DEFAULT false,
    "registrationToken" TEXT NOT NULL,
    "registrationFields" JSONB NOT NULL,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "liveToken" TEXT NOT NULL,
    "remoteBidding" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "logoUrl" TEXT,
    "ownerName" TEXT,
    "purse" INTEGER NOT NULL,
    "bidToken" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "serial" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "category" TEXT,
    "battingStyle" TEXT,
    "bowlingStyle" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "city" TEXT,
    "age" INTEGER,
    "photoUrl" TEXT,
    "basePrice" INTEGER,
    "extra" JSONB,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "source" "PlayerSource" NOT NULL DEFAULT 'MANUAL',
    "status" "PlayerStatus" NOT NULL DEFAULT 'AVAILABLE',
    "soldTeamId" TEXT,
    "soldPrice" INTEGER,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "round" INTEGER NOT NULL,
    "source" "BidSource" NOT NULL DEFAULT 'AUCTIONEER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuctionState" (
    "tournamentId" TEXT NOT NULL,
    "currentPlayerId" TEXT,
    "currentBid" INTEGER,
    "leadingTeamId" TEXT,
    "round" INTEGER NOT NULL DEFAULT 1,
    "queue" TEXT[],
    "timerEndsAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 0,
    "lastEvent" JSONB,
    "startedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuctionState_pkey" PRIMARY KEY ("tournamentId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_registrationToken_key" ON "Tournament"("registrationToken");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_liveToken_key" ON "Tournament"("liveToken");

-- CreateIndex
CREATE INDEX "Tournament_ownerId_idx" ON "Tournament"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_bidToken_key" ON "Team"("bidToken");

-- CreateIndex
CREATE INDEX "Team_tournamentId_idx" ON "Team"("tournamentId");

-- CreateIndex
CREATE INDEX "Player_tournamentId_status_idx" ON "Player"("tournamentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Player_tournamentId_serial_key" ON "Player"("tournamentId", "serial");

-- CreateIndex
CREATE INDEX "Bid_playerId_round_idx" ON "Bid"("playerId", "round");

-- CreateIndex
CREATE INDEX "Bid_tournamentId_createdAt_idx" ON "Bid"("tournamentId", "createdAt");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_soldTeamId_fkey" FOREIGN KEY ("soldTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuctionState" ADD CONSTRAINT "AuctionState_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
