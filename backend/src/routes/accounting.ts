import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { uploadToS3 } from '../services/storage.js';
import { prisma } from '../db/prisma.js';
import { resolveEntityForUser } from '../services/accounting/entity.js';
import { parseCsvStrict } from '../services/accounting/csv.js';
import { normalizeRawTransaction } from '../services/accounting/normalize.js';
import { categorizeNormalizedTransaction } from '../services/accounting/categorize.js';
import { ensureDefaultCategories, ensureSeedRulesForEntity } from '../services/accounting/seed.js';
import { ocrSpaceExtractText } from '../services/ocrSpace.js';
import { extractTransactionsFromTextGemini } from '../services/gemini.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB (global constraint)
});

function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function requireString(v: any, msg: string): string {
  if (!v || typeof v !== 'string') throw new AppError(400, msg);
  return v;
}

function parseDirection(v: string): 'inflow' | 'outflow' {
  const s = v.toLowerCase().trim();
  if (s === 'inflow' || s === 'credit' || s === 'cr') return 'inflow';
  if (s === 'outflow' || s === 'debit' || s === 'dr') return 'outflow';
  throw new AppError(400, 'Invalid direction. Use inflow/outflow.');
}

function parseAmount(v: string): number {
  const n = Number(String(v).replace(/,/g, '').trim());
  if (!Number.isFinite(n)) throw new AppError(400, 'Invalid amount');
  return Math.abs(n);
}

function getRequestedEntityId(req: AuthRequest): string | null {
  const h = req.headers['x-entity-id'];
  if (typeof h === 'string' && h.trim()) return h.trim();
  const q = (req.query as any)?.entityId;
  if (typeof q === 'string' && q.trim()) return q.trim();
  const b = (req.body as any)?.entityId;
  if (typeof b === 'string' && b.trim()) return b.trim();
  return null;
}

function parseAiDate(dateStr: string): Date {
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) throw new AppError(400, `Invalid date from extractor: ${dateStr}`);
  return dt;
}

function mapDocTypeToSourceType(docType: string | undefined): 'bank' | 'upi' | 'card' | 'cash' {
  const t = String(docType || '').toLowerCase();
  if (t === 'statement') return 'bank';
  if (t === 'invoice') return 'card';
  if (t === 'receipt') return 'cash';
  return 'bank';
}

// Upload any document (PDF/image) -> OCR (OCR.Space) -> Extract transactions (Gemini) -> Store in accounting staging tables
router.post('/documents/upload', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    if (!req.file) throw new AppError(400, 'No file uploaded');

    const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
    if (!entity) throw new AppError(404, 'Business not found');

    await ensureDefaultCategories();
    await ensureSeedRulesForEntity(entity.id);

    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const mime = req.file.mimetype || 'application/octet-stream';
    if (!allowed.includes(mime)) {
      throw new AppError(400, `Unsupported file type: ${mime}. Use PDF, PNG, JPG/JPEG, or WEBP.`);
    }

    const sha = sha256Hex(req.file.buffer);
    // Idempotency: same file content for the same business should not crash.
    // If already imported, return the existing upload and counts.
    const existing = await prisma.uploadedFile.findFirst({
      where: { entityId: entity.id, sha256: sha },
    });
    if (existing) {
      const existingCount = await prisma.rawTransaction.count({ where: { entityId: entity.id, uploadedFileId: existing.id } });
      return res.json({
        success: true,
        uploadedFileId: existing.id,
        rawCount: existingCount,
        status: existing.status,
        detectedDocumentType: null,
        extractionConfidence: null,
        ocrTextLength: null,
        message: 'This document was already imported for this business.',
      });
    }

    const timestamp = Date.now();
    const ext = req.file.originalname.split('.').pop() || (mime === 'application/pdf' ? 'pdf' : 'img');
    const key = `accounting-docs/${req.userId}/${timestamp}-${sha}.${ext}`;
    const storageUri = await uploadToS3(req.file.buffer, key, mime);

    // OCR (works for images and PDFs including scanned PDFs)
    const extractedText = await ocrSpaceExtractText({
      fileBuffer: req.file.buffer,
      filename: req.file.originalname || `${timestamp}.${ext}`,
      mimeType: mime,
    });
    if (!extractedText.trim()) throw new AppError(422, 'OCR returned empty text. Try a clearer scan.');

    // LLM extraction
    const extracted = await extractTransactionsFromTextGemini({
      text: extractedText,
      sourceHint: mime,
    });

    const docType = extracted?.metadata?.documentType || 'other';
    const inferredSourceType = mapDocTypeToSourceType(docType);

    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        entityId: entity.id,
        sourceType: inferredSourceType,
        originalName: req.file.originalname,
        mimeType: mime,
        sizeBytes: req.file.size,
        sha256: sha,
        storageUri,
        status: 'staged',
      },
    });

    const createdRawIds: string[] = [];
    for (const tx of extracted.transactions || []) {
      if (!tx?.date || typeof tx.amount !== 'number' || !tx.description) continue;
      const dt = parseAiDate(tx.date);
      const direction = tx.direction === 'income' ? 'inflow' : 'outflow';
      const amount = Math.abs(tx.amount);
      const merchant = tx.merchant ? String(tx.merchant).trim() : '';
      const desc = String(tx.description).trim();
      const rawDescription = merchant ? `${merchant} - ${desc}` : desc;

      const raw = await prisma.rawTransaction.create({
        data: {
          entityId: entity.id,
          uploadedFileId: uploadedFile.id,
          sourceType: inferredSourceType,
          transactionDate: dt,
          amount,
          direction,
          rawDescription,
          referenceId: undefined,
          rawJson: {
            extracted: tx,
            metadata: extracted.metadata,
          },
        },
      });
      createdRawIds.push(raw.id);

      const normPayload = normalizeRawTransaction(raw);
      const norm = await prisma.normalizedTransaction.create({ data: normPayload as any });

      const cat = await categorizeNormalizedTransaction({
        entityId: entity.id,
        normalizedTransactionId: norm.id,
        descriptionClean: norm.descriptionClean,
        referenceExtracted: norm.referenceExtracted,
        direction: norm.direction,
        amount: norm.amount,
      });

      await prisma.transactionCategorization.create({
        data: {
          entityId: entity.id,
          normalizedTransactionId: norm.id,
          categoryId: cat.categoryId || undefined,
          method: cat.method,
          confidence: cat.confidence,
          explanation: cat.explanation,
          status: cat.status,
        },
      });
    }

    if (createdRawIds.length === 0) throw new AppError(422, 'No transactions found in this document.');

    res.json({
      success: true,
      uploadedFileId: uploadedFile.id,
      rawCount: createdRawIds.length,
      status: uploadedFile.status,
      detectedDocumentType: docType,
      extractionConfidence: extracted?.metadata?.confidence ?? null,
      ocrTextLength: extractedText.length,
    });
  } catch (err) {
    next(err);
  }
});

// Upload statement/export file (v1: supports strict CSV only)
router.post('/uploads', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    if (!req.file) throw new AppError(400, 'No file uploaded');

    const sourceType = requireString(req.body.sourceType, 'sourceType is required (bank|upi|card|cash)');
    const format = (req.body.format || 'csv') as string;
    if (format !== 'csv') throw new AppError(400, 'Only csv format is supported in v1');

    await ensureDefaultCategories();
    const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
    if (!entity) throw new AppError(404, 'Entity not found');
    await ensureSeedRulesForEntity(entity.id);

    const sha = sha256Hex(req.file.buffer);
    const timestamp = Date.now();
    const ext = req.file.originalname.split('.').pop() || 'csv';
    const key = `accounting/${req.userId}/${timestamp}-${sha}.${ext}`;
    const storageUri = await uploadToS3(req.file.buffer, key, req.file.mimetype || 'text/csv');

    const uploadedFile = await prisma.uploadedFile.create({
      data: {
        entityId: entity.id,
        sourceType,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype || 'text/csv',
        sizeBytes: req.file.size,
        sha256: sha,
        storageUri,
        status: 'staged',
      },
    });

    const csvText = req.file.buffer.toString('utf8');
    const { headers, rows } = parseCsvStrict(csvText);
    const headerMap = new Map(headers.map((h, idx) => [h.toLowerCase(), idx]));

    const reqCols = ['date', 'amount', 'direction', 'description'];
    for (const c of reqCols) {
      if (!headerMap.has(c)) throw new AppError(400, `CSV missing required column: ${c}`);
    }
    const refIdx = headerMap.get('reference') ?? headerMap.get('ref') ?? null;

    const createdRawIds: string[] = [];

    for (const row of rows) {
      const dateStr = row[headerMap.get('date')!]!;
      const amountStr = row[headerMap.get('amount')!]!;
      const directionStr = row[headerMap.get('direction')!]!;
      const desc = row[headerMap.get('description')!]!;
      const ref = refIdx != null ? row[refIdx] : undefined;

      const dt = new Date(dateStr);
      if (Number.isNaN(dt.getTime())) throw new AppError(400, `Invalid date: ${dateStr}`);

      const raw = await prisma.rawTransaction.create({
        data: {
          entityId: entity.id,
          uploadedFileId: uploadedFile.id,
          sourceType,
          transactionDate: dt,
          amount: parseAmount(amountStr),
          direction: parseDirection(directionStr),
          rawDescription: desc,
          referenceId: ref || undefined,
          rawJson: {
            date: dateStr,
            amount: amountStr,
            direction: directionStr,
            description: desc,
            reference: ref || null,
            headers,
            row,
          },
        },
      });
      createdRawIds.push(raw.id);

      const normPayload = normalizeRawTransaction(raw);
      const norm = await prisma.normalizedTransaction.create({ data: normPayload as any });

      const cat = await categorizeNormalizedTransaction({
        entityId: entity.id,
        normalizedTransactionId: norm.id,
        descriptionClean: norm.descriptionClean,
        referenceExtracted: norm.referenceExtracted,
        direction: norm.direction,
        amount: norm.amount,
      });

      await prisma.transactionCategorization.create({
        data: {
          entityId: entity.id,
          normalizedTransactionId: norm.id,
          categoryId: cat.categoryId || undefined,
          method: cat.method,
          confidence: cat.confidence,
          explanation: cat.explanation,
          status: cat.status,
        },
      });
    }

    res.json({
      success: true,
      uploadedFileId: uploadedFile.id,
      rawCount: createdRawIds.length,
      status: uploadedFile.status,
    });
  } catch (err) {
    next(err);
  }
});

// Manual cash entry (no file)
router.post('/manual-cash', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    await ensureDefaultCategories();
    const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
    if (!entity) throw new AppError(404, 'Entity not found');
    await ensureSeedRulesForEntity(entity.id);

    const dateStr = requireString(req.body.date, 'date is required');
    const amountStr = requireString(req.body.amount, 'amount is required');
    const directionStr = requireString(req.body.direction, 'direction is required');
    const description = requireString(req.body.description, 'description is required');
    const reference = req.body.reference ? String(req.body.reference) : undefined;

    const dt = new Date(dateStr);
    if (Number.isNaN(dt.getTime())) throw new AppError(400, `Invalid date: ${dateStr}`);

    const raw = await prisma.rawTransaction.create({
      data: {
        entityId: entity.id,
        uploadedFileId: undefined,
        sourceType: 'cash',
        transactionDate: dt,
        amount: parseAmount(amountStr),
        direction: parseDirection(directionStr),
        rawDescription: description,
        referenceId: reference,
        rawJson: { date: dateStr, amount: amountStr, direction: directionStr, description, reference: reference || null },
      },
    });

    const normPayload = normalizeRawTransaction(raw);
    const norm = await prisma.normalizedTransaction.create({ data: normPayload as any });

    const cat = await categorizeNormalizedTransaction({
      entityId: entity.id,
      normalizedTransactionId: norm.id,
      descriptionClean: norm.descriptionClean,
      referenceExtracted: norm.referenceExtracted,
      direction: norm.direction,
      amount: norm.amount,
    });

    const categorization = await prisma.transactionCategorization.create({
      data: {
        entityId: entity.id,
        normalizedTransactionId: norm.id,
        categoryId: cat.categoryId || undefined,
        method: cat.method,
        confidence: cat.confidence,
        explanation: cat.explanation,
        status: cat.status,
      },
    });

    res.json({ success: true, rawTransactionId: raw.id, normalizedTransactionId: norm.id, categorization });
  } catch (err) {
    next(err);
  }
});

// Manual override (user correction) + audit logging + learning rule
router.post('/transactions/:normalizedId/override', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
    if (!entity) throw new AppError(404, 'Entity not found');

    const normalizedId = req.params.normalizedId;
    const categoryId = requireString(req.body.categoryId, 'categoryId is required');
    const reason =
      typeof (req.body as any)?.reason === 'string' && String((req.body as any).reason).trim()
        ? String((req.body as any).reason).trim()
        : 'Manual category selection';

    const normalized = await prisma.normalizedTransaction.findFirst({
      where: { id: normalizedId, entityId: entity.id },
    });
    if (!normalized) throw new AppError(404, 'Transaction not found');

    const before = await prisma.transactionCategorization.findUnique({
      where: { normalizedTransactionId: normalizedId },
    });

    // Create a user override rule (learning) keyed by descriptionContains
    const matchers = { direction: normalized.direction, descriptionContains: normalized.descriptionClean };
    const overrideRule = await prisma.userOverrideRule.create({
      data: {
        entityId: entity.id,
        createdByUserId: req.userId,
        enabled: true,
        matchers,
        categoryId,
      },
    });

    const after = await prisma.transactionCategorization.upsert({
      where: { normalizedTransactionId: normalizedId },
      update: {
        categoryId,
        method: 'manual',
        confidence: 1.0,
        explanation: `User override`,
        status: 'confirmed',
        decidedAt: new Date(),
      },
      create: {
        entityId: entity.id,
        normalizedTransactionId: normalizedId,
        categoryId,
        method: 'manual',
        confidence: 1.0,
        explanation: `User override`,
        status: 'confirmed',
      },
    });

    await prisma.auditLog.create({
      data: {
        entityId: entity.id,
        actorUserId: req.userId,
        action: 'TRANSACTION_CATEGORY_OVERRIDE',
        targetType: 'NormalizedTransaction',
        targetId: normalizedId,
        reason,
        beforeJson: before as any,
        afterJson: after as any,
      },
    });

    res.json({ success: true, categorization: after, overrideRuleId: overrideRule.id });
  } catch (err) {
    next(err);
  }
});

// Review queue (shows categorized transactions for manual review)
router.get('/review', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    await ensureDefaultCategories();
    const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
    if (!entity) throw new AppError(404, 'Entity not found');

    const status = typeof req.query.status === 'string' ? req.query.status : 'needs_review';
    const take = Math.min(parseInt(String(req.query.take || '50'), 10) || 50, 200);
    const uploadedFileId = typeof req.query.uploadedFileId === 'string' ? req.query.uploadedFileId : null;

    const items = await prisma.transactionCategorization.findMany({
      where: {
        entityId: entity.id,
        status,
        ...(uploadedFileId
          ? {
              NormalizedTransaction: {
                RawTransaction: { uploadedFileId },
              },
            }
          : {}),
      },
      orderBy: { decidedAt: 'desc' },
      take,
      include: {
        Category: true,
        NormalizedTransaction: {
          include: {
            RawTransaction: true,
          },
        },
      },
    });

    res.json({
      success: true,
      entityId: entity.id,
      items: items.map((i) => ({
        id: i.id,
        normalizedTransactionId: i.normalizedTransactionId,
        method: i.method,
        confidence: i.confidence,
        explanation: i.explanation,
        status: i.status,
        decidedAt: i.decidedAt,
        category: i.Category ? { id: i.Category.id, code: i.Category.code, name: i.Category.name } : null,
        transaction: {
          id: i.NormalizedTransaction.id,
          date: i.NormalizedTransaction.date,
          amount: i.NormalizedTransaction.amount,
          direction: i.NormalizedTransaction.direction,
          descriptionClean: i.NormalizedTransaction.descriptionClean,
          referenceExtracted: i.NormalizedTransaction.referenceExtracted,
          uploadedFileId: i.NormalizedTransaction.RawTransaction?.uploadedFileId || null,
        },
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/categories', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    await ensureDefaultCategories();
    const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json({
      success: true,
      categories: cats.map((c) => ({ id: c.id, code: c.code, name: c.name, ledgerType: c.ledgerType })),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/uploads', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
    if (!entity) throw new AppError(404, 'Entity not found');
    const status = typeof req.query.status === 'string' ? req.query.status : 'staged';

    const files = await prisma.uploadedFile.findMany({
      where: { entityId: entity.id, status },
      orderBy: { uploadedAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      items: files.map((f) => ({
        id: f.id,
        originalName: f.originalName,
        sourceType: f.sourceType,
        status: f.status,
        uploadedAt: f.uploadedAt,
        rawSha256: f.sha256,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/uploads/:uploadedFileId/commit', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
    if (!entity) throw new AppError(404, 'Entity not found');
    const uploadedFileId = req.params.uploadedFileId;

    const file = await prisma.uploadedFile.findFirst({ where: { id: uploadedFileId, entityId: entity.id } });
    if (!file) throw new AppError(404, 'Upload not found');

    const notConfirmed = await prisma.transactionCategorization.count({
      where: {
        entityId: entity.id,
        status: 'needs_review',
        NormalizedTransaction: { RawTransaction: { uploadedFileId } },
      },
    });

    if (notConfirmed > 0) {
      throw new AppError(400, `Cannot commit: ${notConfirmed} transactions still need review.`);
    }

    const updated = await prisma.uploadedFile.update({
      where: { id: uploadedFileId },
      data: { status: 'committed', committedAt: new Date() },
    });

    res.json({ success: true, uploadedFileId: updated.id, status: updated.status, committedAt: updated.committedAt });
  } catch (err) {
    next(err);
  }
});

// Analytics for dashboard (real data; committed uploads by default)
router.get('/analytics', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
    if (!entity) throw new AppError(404, 'Business not found');

    const includeStaged = String(req.query.includeStaged || 'false') === 'true';

    // Totals (use raw SQL for efficient aggregation)
    const totalsRows = (await prisma.$queryRawUnsafe(
      `
      SELECT
        COALESCE(SUM(CASE WHEN nt.direction = 'inflow' THEN nt.amount ELSE 0 END), 0) AS "totalInflow",
        COALESCE(SUM(CASE WHEN nt.direction = 'outflow' THEN nt.amount ELSE 0 END), 0) AS "totalOutflow",
        COUNT(*)::int AS "txCount"
      FROM "NormalizedTransaction" nt
      JOIN "RawTransaction" rt ON rt.id = nt."rawTransactionId"
      LEFT JOIN "UploadedFile" uf ON uf.id = rt."uploadedFileId"
      WHERE nt."entityId" = $1
        AND (
          rt."uploadedFileId" IS NULL
          OR ${includeStaged ? 'TRUE' : `uf.status = 'committed'`}
        )
    `,
      entity.id
    )) as any[];

    const totals = totalsRows?.[0] || { totalInflow: 0, totalOutflow: 0, txCount: 0 };

    const needsReview = await prisma.transactionCategorization.count({
      where: { entityId: entity.id, status: 'needs_review' },
    });

    // Monthly trend (last 6 months)
    const monthlyRows = (await prisma.$queryRawUnsafe(
      `
      SELECT
        date_trunc('month', nt.date) AS "month",
        COALESCE(SUM(CASE WHEN nt.direction = 'inflow' THEN nt.amount ELSE 0 END), 0) AS "inflow",
        COALESCE(SUM(CASE WHEN nt.direction = 'outflow' THEN nt.amount ELSE 0 END), 0) AS "outflow",
        COUNT(*)::int AS "count"
      FROM "NormalizedTransaction" nt
      JOIN "RawTransaction" rt ON rt.id = nt."rawTransactionId"
      LEFT JOIN "UploadedFile" uf ON uf.id = rt."uploadedFileId"
      WHERE nt."entityId" = $1
        AND (
          rt."uploadedFileId" IS NULL
          OR ${includeStaged ? 'TRUE' : `uf.status = 'committed'`}
        )
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 6
    `,
      entity.id
    )) as any[];

    const monthly = (monthlyRows || [])
      .map((r: any) => ({
        month: new Date(r.month).toISOString().slice(0, 7), // YYYY-MM
        inflow: Number(r.inflow || 0),
        outflow: Number(r.outflow || 0),
        count: Number(r.count || 0),
      }))
      .reverse();

    // Category breakdown (top 10 by absolute amount)
    const catRows = (await prisma.$queryRawUnsafe(
      `
      SELECT
        COALESCE(c.code, 'UNCLASSIFIED') AS "code",
        COALESCE(c.name, 'Unclassified') AS "name",
        COALESCE(SUM(nt.amount), 0) AS "amount",
        COUNT(*)::int AS "count"
      FROM "TransactionCategorization" tc
      JOIN "NormalizedTransaction" nt ON nt.id = tc."normalizedTransactionId"
      JOIN "RawTransaction" rt ON rt.id = nt."rawTransactionId"
      LEFT JOIN "UploadedFile" uf ON uf.id = rt."uploadedFileId"
      LEFT JOIN "Category" c ON c.id = tc."categoryId"
      WHERE tc."entityId" = $1
        AND (
          rt."uploadedFileId" IS NULL
          OR ${includeStaged ? 'TRUE' : `uf.status = 'committed'`}
        )
      GROUP BY 1,2
      ORDER BY ABS(COALESCE(SUM(nt.amount),0)) DESC
      LIMIT 10
    `,
      entity.id
    )) as any[];

    const byCategory = (catRows || []).map((r: any) => ({
      code: String(r.code),
      name: String(r.name),
      amount: Number(r.amount || 0),
      count: Number(r.count || 0),
    }));

    res.json({
      success: true,
      entityId: entity.id,
      includeStaged,
      totals: {
        totalInflow: Number(totals.totalInflow || 0),
        totalOutflow: Number(totals.totalOutflow || 0),
        net: Number(totals.totalInflow || 0) - Number(totals.totalOutflow || 0),
        txCount: Number(totals.txCount || 0),
        needsReviewCount: needsReview,
      },
      monthly,
      byCategory,
    });
  } catch (err) {
    next(err);
  }
});

// Profit & Loss report (deterministic, based on categorized committed transactions)
router.get('/reports/pnl', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
    if (!entity) throw new AppError(404, 'Business not found');

    const month = typeof req.query.month === 'string' ? req.query.month : null; // YYYY-MM
    let start: Date | null = null;
    let end: Date | null = null;
    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) throw new AppError(400, 'month must be YYYY-MM');
      start = new Date(`${month}-01T00:00:00.000Z`);
      end = new Date(start);
      end.setUTCMonth(end.getUTCMonth() + 1);
    }

    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT
        c."ledgerType" AS "ledgerType",
        COALESCE(SUM(nt.amount), 0) AS "amount"
      FROM "TransactionCategorization" tc
      JOIN "NormalizedTransaction" nt ON nt.id = tc."normalizedTransactionId"
      JOIN "RawTransaction" rt ON rt.id = nt."rawTransactionId"
      LEFT JOIN "UploadedFile" uf ON uf.id = rt."uploadedFileId"
      LEFT JOIN "Category" c ON c.id = tc."categoryId"
      WHERE tc."entityId" = $1
        AND (rt."uploadedFileId" IS NULL OR uf.status = 'committed')
        AND (c."ledgerType" IS NOT NULL)
        ${start && end ? 'AND nt.date >= $2 AND nt.date < $3' : ''}
      GROUP BY 1
    `,
      ...(start && end ? [entity.id, start, end] : [entity.id])
    )) as any[];

    const income = Number(rows.find((r) => r.ledgerType === 'income')?.amount || 0);
    const expense = Number(rows.find((r) => r.ledgerType === 'expense')?.amount || 0);
    const profit = income - expense;

    res.json({
      success: true,
      entityId: entity.id,
      period: month || 'all',
      totals: { income, expense, profit },
      notes: [
        'Deterministic report from committed transactions only.',
        'Does not include uncategorized items unless categorized.',
      ],
    });
  } catch (err) {
    next(err);
  }
});

// Audit readiness report (deterministic)
router.get('/reports/audit-readiness', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entity = await resolveEntityForUser(req.userId, getRequestedEntityId(req));
    if (!entity) throw new AppError(404, 'Business not found');

    const total = await prisma.transactionCategorization.count({ where: { entityId: entity.id } });
    const confirmed = await prisma.transactionCategorization.count({ where: { entityId: entity.id, status: 'confirmed' } });
    const needsReview = await prisma.transactionCategorization.count({ where: { entityId: entity.id, status: 'needs_review' } });
    const pct = total > 0 ? Math.round((confirmed / total) * 100) : 0;

    res.json({
      success: true,
      entityId: entity.id,
      readinessPercent: pct,
      totals: { total, confirmed, needsReview },
      notes: ['Deterministic: readiness is % confirmed categorizations.', 'No AI auto-approval.'],
    });
  } catch (err) {
    next(err);
  }
});

export default router;


