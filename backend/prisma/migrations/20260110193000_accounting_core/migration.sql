-- CreateTable
CREATE TABLE "Entity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "storageUri" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawTransaction" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "uploadedFileId" TEXT,
    "sourceType" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "direction" TEXT NOT NULL,
    "rawDescription" TEXT NOT NULL,
    "referenceId" TEXT,
    "rawJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RawTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormalizedTransaction" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "rawTransactionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "direction" TEXT NOT NULL,
    "descriptionClean" TEXT NOT NULL,
    "referenceExtracted" TEXT,
    "timezone" TEXT NOT NULL,
    "normalizationVersion" TEXT NOT NULL,
    "normalizationDiffJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NormalizedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ledgerType" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionCategorization" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "normalizedTransactionId" TEXT NOT NULL,
    "categoryId" TEXT,
    "method" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionCategorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategorizationRule" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "matchers" JSONB NOT NULL,
    "categoryId" TEXT NOT NULL,
    "explanationTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategorizationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOverrideRule" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "matchers" JSONB NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOverrideRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Entity_userId_idx" ON "Entity"("userId");

-- CreateIndex
CREATE INDEX "Entity_userId_isDefault_idx" ON "Entity"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "UploadedFile_entityId_idx" ON "UploadedFile"("entityId");

-- CreateIndex
CREATE INDEX "UploadedFile_uploadedAt_idx" ON "UploadedFile"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_entityId_sha256_key" ON "UploadedFile"("entityId", "sha256");

-- CreateIndex
CREATE INDEX "RawTransaction_entityId_idx" ON "RawTransaction"("entityId");

-- CreateIndex
CREATE INDEX "RawTransaction_uploadedFileId_idx" ON "RawTransaction"("uploadedFileId");

-- CreateIndex
CREATE INDEX "RawTransaction_transactionDate_idx" ON "RawTransaction"("transactionDate");

-- CreateIndex
CREATE INDEX "RawTransaction_referenceId_idx" ON "RawTransaction"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "NormalizedTransaction_rawTransactionId_key" ON "NormalizedTransaction"("rawTransactionId");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_entityId_idx" ON "NormalizedTransaction"("entityId");

-- CreateIndex
CREATE INDEX "NormalizedTransaction_date_idx" ON "NormalizedTransaction"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCategorization_normalizedTransactionId_key" ON "TransactionCategorization"("normalizedTransactionId");

-- CreateIndex
CREATE INDEX "TransactionCategorization_entityId_idx" ON "TransactionCategorization"("entityId");

-- CreateIndex
CREATE INDEX "TransactionCategorization_status_idx" ON "TransactionCategorization"("status");

-- CreateIndex
CREATE INDEX "TransactionCategorization_decidedAt_idx" ON "TransactionCategorization"("decidedAt");

-- CreateIndex
CREATE INDEX "CategorizationRule_entityId_idx" ON "CategorizationRule"("entityId");

-- CreateIndex
CREATE INDEX "CategorizationRule_enabled_idx" ON "CategorizationRule"("enabled");

-- CreateIndex
CREATE INDEX "CategorizationRule_priority_idx" ON "CategorizationRule"("priority");

-- CreateIndex
CREATE INDEX "UserOverrideRule_entityId_idx" ON "UserOverrideRule"("entityId");

-- CreateIndex
CREATE INDEX "UserOverrideRule_createdByUserId_idx" ON "UserOverrideRule"("createdByUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawTransaction" ADD CONSTRAINT "RawTransaction_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawTransaction" ADD CONSTRAINT "RawTransaction_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormalizedTransaction" ADD CONSTRAINT "NormalizedTransaction_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormalizedTransaction" ADD CONSTRAINT "NormalizedTransaction_rawTransactionId_fkey" FOREIGN KEY ("rawTransactionId") REFERENCES "RawTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionCategorization" ADD CONSTRAINT "TransactionCategorization_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionCategorization" ADD CONSTRAINT "TransactionCategorization_normalizedTransactionId_fkey" FOREIGN KEY ("normalizedTransactionId") REFERENCES "NormalizedTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionCategorization" ADD CONSTRAINT "TransactionCategorization_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorizationRule" ADD CONSTRAINT "CategorizationRule_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategorizationRule" ADD CONSTRAINT "CategorizationRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOverrideRule" ADD CONSTRAINT "UserOverrideRule_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOverrideRule" ADD CONSTRAINT "UserOverrideRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;


