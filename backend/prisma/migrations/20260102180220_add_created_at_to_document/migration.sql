-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");
