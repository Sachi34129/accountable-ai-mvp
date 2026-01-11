import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validator.js';
import { form16IdParamSchema, itrComputeSchema, taxQuerySchema } from '../utils/schemas.js';
import { analyzeTaxOpportunities } from '../services/tax.js';
import { prisma } from '../db/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { uploadToS3 } from '../services/storage.js';
import { runForm16Extraction } from '../services/tax/form16Extract.js';
import { validateForm16Extraction } from '../services/tax/form16Validate.js';
import { computeItrFromLatestForm16 } from '../services/tax/itrCompute.js';
import { explainItrIssues, explainItrWorksheet } from '../services/tax/itrExplain.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB
});

function sha256Hex(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

router.get('/', authenticate, validate(taxQuerySchema), async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError(401, 'User ID required');
    }

    const assessmentYear = (req.query.assessmentYear as string) || new Date().getFullYear().toString();

    // Check if tax notes already exist for this year
    const existingNotes = await prisma.taxNote.findMany({
      where: {
        userId: req.userId,
        assessmentYear,
      },
    });

    if (existingNotes.length > 0) {
      logger.info(`Returning existing tax notes for user ${req.userId}, year ${assessmentYear}`);
      return res.json({
        assessmentYear,
        taxNotes: existingNotes,
        count: existingNotes.length,
      });
    }

    // Generate new tax opportunities
    const taxNotes = await analyzeTaxOpportunities(req.userId, assessmentYear);

    res.json({
      assessmentYear,
      taxNotes,
      count: taxNotes.length,
    });
  } catch (error) {
    next(error);
  }
});

// --- ITR v1 (Form 16) ---
router.post('/form16/upload', authenticate, upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    if (!req.file) throw new AppError(400, 'No file uploaded');
    const mime = req.file.mimetype || 'application/octet-stream';
    if (mime !== 'application/pdf') throw new AppError(400, 'Form 16 upload must be a PDF');

    const sha = sha256Hex(req.file.buffer);
    const key = `tax/form16/${req.userId}/${Date.now()}-${sha}.pdf`;
    const storageUri = await uploadToS3(req.file.buffer, key, mime);

    const doc = await prisma.taxDocument.create({
      data: {
        userId: req.userId,
        type: 'FORM16',
        originalName: req.file.originalname || 'form16.pdf',
        mimeType: mime,
        sizeBytes: req.file.size,
        sha256: sha,
        storageUri,
        status: 'uploaded',
      },
    });

    res.json({ success: true, taxDocumentId: doc.id, status: doc.status });
  } catch (err) {
    next(err);
  }
});

router.post('/form16/:id/extract', authenticate, validate(form16IdParamSchema), async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const taxDocumentId = req.params.id;

    const { extractionRunId, extracted } = await runForm16Extraction({ userId: req.userId, taxDocumentId });
    const issues = await validateForm16Extraction({ extractionRunId, extracted });

    await prisma.taxDocument.update({
      where: { id: taxDocumentId },
      data: { status: issues.some((i) => i.severity === 'error') ? 'error' : 'validated' },
    });

    res.json({ success: true, taxDocumentId, extractionRunId, issues });
  } catch (err) {
    next(err);
  }
});

router.get('/form16/:id/status', authenticate, validate(form16IdParamSchema), async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const taxDocumentId = req.params.id;

    const doc = await prisma.taxDocument.findFirst({ where: { id: taxDocumentId, userId: req.userId } });
    if (!doc) throw new AppError(404, 'Form 16 not found');

    const run = await prisma.taxExtractionRun.findFirst({ where: { taxDocumentId: doc.id }, orderBy: { createdAt: 'desc' } });
    const issues = run
      ? await prisma.taxValidationIssue.findMany({ where: { extractionRunId: run.id }, orderBy: { createdAt: 'asc' } })
      : [];

    res.json({
      success: true,
      taxDocumentId: doc.id,
      status: doc.status,
      latestExtractionRunId: run?.id || null,
      issues,
      ready: Boolean(run) && !issues.some((i) => i.severity === 'error'),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/itr/compute', authenticate, validate(itrComputeSchema), async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const { assessmentYear, regime, taxDocumentId } = req.body as any;

    const out = await computeItrFromLatestForm16({
      userId: req.userId,
      assessmentYear,
      regime,
      taxDocumentId: taxDocumentId || null,
    });

    res.json({ success: true, ...out });
  } catch (err) {
    next(err);
  }
});

router.get('/itr/latest', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const latest = await prisma.iTRComputationRun.findFirst({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { LineItems: true, ExtractionRun: { include: { TaxDocument: true } } },
    });
    if (!latest) return res.json({ success: true, run: null });

    const issues = await prisma.taxValidationIssue.findMany({
      where: { extractionRunId: latest.extractionRunId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      run: {
        id: latest.id,
        assessmentYear: latest.assessmentYear,
        regime: latest.regime,
        rulesVersion: latest.rulesVersion,
        schemaVersion: latest.schemaVersion,
        computed: latest.computedJson,
        createdAt: latest.createdAt,
        taxDocumentId: latest.ExtractionRun.TaxDocument.id,
        taxDocumentName: latest.ExtractionRun.TaxDocument.originalName,
        issues,
        lineItems: latest.LineItems.map((l) => ({
          code: l.code,
          label: l.label,
          amount: l.amount,
          sourceRefs: l.sourceRefsJson,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/itr/handoff', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const latest = await prisma.iTRComputationRun.findFirst({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { LineItems: true, ExtractionRun: { include: { TaxDocument: true } } },
    });
    if (!latest) throw new AppError(404, 'No ITR computation run found');

    const issues = await prisma.taxValidationIssue.findMany({
      where: { extractionRunId: latest.extractionRunId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      handoff: {
        taxDocument: {
          id: latest.ExtractionRun.TaxDocument.id,
          name: latest.ExtractionRun.TaxDocument.originalName,
          sha256: latest.ExtractionRun.TaxDocument.sha256,
          uploadedAt: latest.ExtractionRun.TaxDocument.uploadedAt,
        },
        extractionRun: {
          id: latest.extractionRunId,
          model: latest.ExtractionRun.model,
          version: latest.ExtractionRun.version,
          rawOcrTextHash: latest.ExtractionRun.rawOcrTextHash,
        },
        issues,
        computation: {
          id: latest.id,
          assessmentYear: latest.assessmentYear,
          regime: latest.regime,
          rulesVersion: latest.rulesVersion,
          schemaVersion: latest.schemaVersion,
          computed: latest.computedJson,
          lineItems: latest.LineItems,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/itr/explain', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const latest = await prisma.iTRComputationRun.findFirst({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { ExtractionRun: true },
    });
    if (!latest) throw new AppError(404, 'No ITR computation run found');

    const issues = await prisma.taxValidationIssue.findMany({
      where: { extractionRunId: latest.extractionRunId },
      orderBy: { createdAt: 'asc' },
    });

    const explained = await explainItrIssues({
      issues: issues.map((i) => ({ severity: i.severity, code: i.code, message: i.message })),
      context: { assessmentYear: latest.assessmentYear, regime: latest.regime },
    });

    res.json({ success: true, explanation: explained });
  } catch (err) {
    next(err);
  }
});

router.post('/itr/explain-worksheet', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const latest = await prisma.iTRComputationRun.findFirst({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      include: { LineItems: true },
    });
    if (!latest) throw new AppError(404, 'No ITR computation run found');

    const explained = await explainItrWorksheet({
      context: { assessmentYear: latest.assessmentYear, regime: latest.regime, rulesVersion: latest.rulesVersion },
      lineItems: latest.LineItems.map((l) => ({
        code: l.code,
        label: l.label,
        amount: l.amount,
        sourceRefs: l.sourceRefsJson,
      })),
    });

    res.json({ success: true, explanation: explained });
  } catch (err) {
    next(err);
  }
});

export default router;

