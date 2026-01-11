-- AlterTable
ALTER TABLE "User"
ADD COLUMN     "name" TEXT,
ADD COLUMN     "pan" TEXT,
ADD COLUMN     "role" TEXT,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "googleSub" TEXT,
ADD COLUMN     "passwordHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");


