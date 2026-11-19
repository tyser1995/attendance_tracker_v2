-- AlterTable
ALTER TABLE "attendances" ADD COLUMN "importedAt" DATETIME;
ALTER TABLE "attendances" ADD COLUMN "importSource" TEXT;

-- CreateIndex
CREATE INDEX "attendances_importedAt_idx" ON "attendances"("importedAt");
