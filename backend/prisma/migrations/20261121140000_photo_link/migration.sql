-- Photo upload link: players pick their name and upload a photo.
ALTER TABLE "Tournament" ADD COLUMN "photoToken" TEXT;

CREATE UNIQUE INDEX "Tournament_photoToken_key" ON "Tournament"("photoToken");
