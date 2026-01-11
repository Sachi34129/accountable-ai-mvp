-- Tax compliance (ITR v1) models: TaxDocument, TaxExtractionRun, TaxField, TaxValidationIssue, ITRComputationRun, ITRLineItem

-- CreateTable
CREATE TABLE "TaxDocument" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "sha256" TEXT NOT NULL,
  "storageUri" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'uploaded',
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaxDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxExtractionRun" (
  "id" TEXT NOT NULL,
  "taxDocumentId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "rawOcrTextHash" TEXT NOT NULL,
  "extractedJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaxExtractionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxField" (
  "id" TEXT NOT NULL,
  "extractionRunId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "valueJson" JSONB NOT NULL,
  "sourcePage" INTEGER,
  "sourceTextSnippet" TEXT,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaxField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxValidationIssue" (
  "id" TEXT NOT NULL,
  "extractionRunId" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "fieldRefsJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TaxValidationIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITRComputationRun" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "extractionRunId" TEXT NOT NULL,
  "assessmentYear" TEXT NOT NULL,
  "regime" TEXT NOT NULL,
  "rulesVersion" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "computedJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ITRComputationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ITRLineItem" (
  "id" TEXT NOT NULL,
  "computationRunId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "sourceRefsJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ITRLineItem_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "TaxDocument_userId_idx" ON "TaxDocument"("userId");
CREATE INDEX "TaxDocument_uploadedAt_idx" ON "TaxDocument"("uploadedAt");
CREATE UNIQUE INDEX "TaxDocument_userId_sha256_key" ON "TaxDocument"("userId", "sha256");

CREATE INDEX "TaxExtractionRun_taxDocumentId_idx" ON "TaxExtractionRun"("taxDocumentId");
CREATE INDEX "TaxExtractionRun_createdAt_idx" ON "TaxExtractionRun"("createdAt");

CREATE INDEX "TaxField_extractionRunId_idx" ON "TaxField"("extractionRunId");
CREATE INDEX "TaxField_key_idx" ON "TaxField"("key");

CREATE INDEX "TaxValidationIssue_extractionRunId_idx" ON "TaxValidationIssue"("extractionRunId");
CREATE INDEX "TaxValidationIssue_severity_idx" ON "TaxValidationIssue"("severity");
CREATE INDEX "TaxValidationIssue_code_idx" ON "TaxValidationIssue"("code");

CREATE INDEX "ITRComputationRun_userId_idx" ON "ITRComputationRun"("userId");
CREATE INDEX "ITRComputationRun_assessmentYear_idx" ON "ITRComputationRun"("assessmentYear");
CREATE INDEX "ITRComputationRun_createdAt_idx" ON "ITRComputationRun"("createdAt");

CREATE INDEX "ITRLineItem_computationRunId_idx" ON "ITRLineItem"("computationRunId");
CREATE INDEX "ITRLineItem_code_idx" ON "ITRLineItem"("code");

-- Foreign keys
ALTER TABLE "TaxDocument"
ADD CONSTRAINT "TaxDocument_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaxExtractionRun"
ADD CONSTRAINT "TaxExtractionRun_taxDocumentId_fkey"
FOREIGN KEY ("taxDocumentId") REFERENCES "TaxDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaxField"
ADD CONSTRAINT "TaxField_extractionRunId_fkey"
FOREIGN KEY ("extractionRunId") REFERENCES "TaxExtractionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaxValidationIssue"
ADD CONSTRAINT "TaxValidationIssue_extractionRunId_fkey"
FOREIGN KEY ("extractionRunId") REFERENCES "TaxExtractionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ITRComputationRun"
ADD CONSTRAINT "ITRComputationRun_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ITRComputationRun"
ADD CONSTRAINT "ITRComputationRun_extractionRunId_fkey"
FOREIGN KEY ("extractionRunId") REFERENCES "TaxExtractionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ITRLineItem"
ADD CONSTRAINT "ITRLineItem_computationRunId_fkey"
FOREIGN KEY ("computationRunId") REFERENCES "ITRComputationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;


