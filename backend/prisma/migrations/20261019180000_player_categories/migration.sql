-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "useCategories" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "categoryList" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Tournaments that already have categorised players keep working category-wise.
UPDATE "Tournament" t
SET "useCategories" = true,
    "categoryList" = sub.cats
FROM (
  SELECT "tournamentId", array_agg(DISTINCT "category" ORDER BY "category") AS cats
  FROM "Player"
  WHERE "category" IS NOT NULL AND "category" <> ''
  GROUP BY "tournamentId"
) sub
WHERE sub."tournamentId" = t.id;
