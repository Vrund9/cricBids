-- CreateEnum
CREATE TYPE "TournamentPlan" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "plan" "TournamentPlan" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "planActivatedAt" TIMESTAMP(3),
ADD COLUMN     "theme" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "seasonPassUntil" TIMESTAMP(3);
