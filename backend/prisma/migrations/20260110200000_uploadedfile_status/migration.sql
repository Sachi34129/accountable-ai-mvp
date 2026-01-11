-- AlterTable
ALTER TABLE "UploadedFile"
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'staged',
ADD COLUMN     "committedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "UploadedFile_status_idx" ON "UploadedFile"("status");


