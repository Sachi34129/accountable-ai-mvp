-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceUri" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extractionStatus" TEXT NOT NULL DEFAULT 'pending',
    "extractedAt" TIMESTAMP(3),
    "provenanceModel" TEXT,
    "provenanceVersion" TEXT,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "direction" TEXT NOT NULL,
    "category" TEXT,
    "subCategory" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "labels" TEXT[],
    "confidence" DOUBLE PRECISION,
    "explanation" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assessmentYear" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "potentialDeduction" DOUBLE PRECISION NOT NULL,
    "evidenceTransactionIds" TEXT[],
    "explanation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "uncertaintyNote" TEXT,

    CONSTRAINT "TaxNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "eli5" TEXT,
    "data" JSONB,
    "explanation" TEXT,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totals" JSONB NOT NULL,
    "highlights" TEXT[],
    "charts" TEXT[],
    "insightIds" TEXT[],
    "taxNoteIds" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_extractionStatus_idx" ON "Document"("extractionStatus");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_category_idx" ON "Transaction"("category");

-- CreateIndex
CREATE INDEX "TaxNote_userId_idx" ON "TaxNote"("userId");

-- CreateIndex
CREATE INDEX "TaxNote_assessmentYear_idx" ON "TaxNote"("assessmentYear");

-- CreateIndex
CREATE INDEX "Insight_userId_idx" ON "Insight"("userId");

-- CreateIndex
CREATE INDEX "Insight_period_idx" ON "Insight"("period");

-- CreateIndex
CREATE INDEX "Insight_type_idx" ON "Insight"("type");

-- CreateIndex
CREATE INDEX "Report_userId_idx" ON "Report"("userId");

-- CreateIndex
CREATE INDEX "Report_month_idx" ON "Report"("month");

-- CreateIndex
CREATE UNIQUE INDEX "Report_userId_month_key" ON "Report"("userId", "month");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxNote" ADD CONSTRAINT "TaxNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
