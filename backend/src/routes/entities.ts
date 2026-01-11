import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { ensureDefaultEntityForUser } from '../services/accounting/entity.js';

const router = Router();

function normalizeGstin(raw: string): string {
  return String(raw || '').trim().toUpperCase();
}

function isLikelyGstin(gstin: string): boolean {
  // Basic sanity: 15 chars, alphanumeric. (We can add checksum validation later.)
  return /^[0-9A-Z]{15}$/.test(gstin);
}

async function requireEntityOwnedByUser(userId: string, entityId: string) {
  const ent = await prisma.entity.findFirst({ where: { id: entityId, userId } });
  if (!ent) throw new AppError(404, 'Entity not found');
  return ent;
}

// List entities for current user (includes GSTINs)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');

    let entities = await prisma.entity.findMany({
      where: { userId: req.userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: { Gstins: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
    });

    // Guarantee a default "Personal" entity exists for every user.
    if (entities.length === 0) {
      await ensureDefaultEntityForUser(req.userId);
      entities = await prisma.entity.findMany({
        where: { userId: req.userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        include: { Gstins: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
      });
    }

    res.json({
      success: true,
      entities: entities.map((e) => ({
        id: e.id,
        name: e.name,
        isDefault: e.isDefault,
        createdAt: e.createdAt,
        gstins: e.Gstins.map((g) => ({ id: g.id, gstin: g.gstin, isPrimary: g.isPrimary, createdAt: g.createdAt })),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// Create entity for current user
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    if (!name) throw new AppError(400, 'name is required');

    const makeDefault = Boolean(req.body?.isDefault);
    if (makeDefault) {
      await prisma.entity.updateMany({ where: { userId: req.userId, isDefault: true }, data: { isDefault: false } });
    }

    const created = await prisma.entity.create({
      data: { userId: req.userId, name, isDefault: makeDefault },
      include: { Gstins: true },
    });

    res.json({
      success: true,
      entity: {
        id: created.id,
        name: created.name,
        isDefault: created.isDefault,
        createdAt: created.createdAt,
        gstins: [],
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update entity metadata (name / set default)
router.put('/:entityId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entityId = req.params.entityId;
    await requireEntityOwnedByUser(req.userId, entityId);

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : undefined;
    const isDefault = typeof req.body?.isDefault === 'boolean' ? req.body.isDefault : undefined;

    if (isDefault === true) {
      await prisma.entity.updateMany({ where: { userId: req.userId, isDefault: true }, data: { isDefault: false } });
    }

    const updated = await prisma.entity.update({
      where: { id: entityId },
      data: {
        ...(name ? { name } : {}),
        ...(typeof isDefault === 'boolean' ? { isDefault } : {}),
      },
      include: { Gstins: { orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }] } },
    });

    res.json({
      success: true,
      entity: {
        id: updated.id,
        name: updated.name,
        isDefault: updated.isDefault,
        createdAt: updated.createdAt,
        gstins: updated.Gstins.map((g) => ({ id: g.id, gstin: g.gstin, isPrimary: g.isPrimary, createdAt: g.createdAt })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// List GSTINs for an entity
router.get('/:entityId/gstins', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entityId = req.params.entityId;
    await requireEntityOwnedByUser(req.userId, entityId);

    const gstins = await prisma.entityGstin.findMany({
      where: { entityId },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    res.json({
      success: true,
      entityId,
      gstins: gstins.map((g) => ({ id: g.id, gstin: g.gstin, isPrimary: g.isPrimary, createdAt: g.createdAt })),
    });
  } catch (err) {
    next(err);
  }
});

// Add GSTIN to an entity
router.post('/:entityId/gstins', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entityId = req.params.entityId;
    await requireEntityOwnedByUser(req.userId, entityId);

    const gstin = normalizeGstin(req.body?.gstin);
    if (!gstin) throw new AppError(400, 'gstin is required');
    if (!isLikelyGstin(gstin)) throw new AppError(400, 'Invalid GSTIN format');

    const isPrimary = Boolean(req.body?.isPrimary);
    if (isPrimary) {
      await prisma.entityGstin.updateMany({ where: { entityId, isPrimary: true }, data: { isPrimary: false } });
    }

    const created = await prisma.entityGstin.create({
      data: { entityId, gstin, isPrimary },
    });

    res.json({
      success: true,
      gstin: { id: created.id, gstin: created.gstin, isPrimary: created.isPrimary, createdAt: created.createdAt },
    });
  } catch (err) {
    next(err);
  }
});

// Update GSTIN flags (primary)
router.put('/:entityId/gstins/:gstinId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entityId = req.params.entityId;
    const gstinId = req.params.gstinId;
    await requireEntityOwnedByUser(req.userId, entityId);

    const isPrimary = typeof req.body?.isPrimary === 'boolean' ? req.body.isPrimary : undefined;
    if (typeof isPrimary !== 'boolean') throw new AppError(400, 'isPrimary is required');

    const existing = await prisma.entityGstin.findFirst({ where: { id: gstinId, entityId } });
    if (!existing) throw new AppError(404, 'GSTIN not found');

    if (isPrimary) {
      await prisma.entityGstin.updateMany({ where: { entityId, isPrimary: true }, data: { isPrimary: false } });
    }

    const updated = await prisma.entityGstin.update({ where: { id: gstinId }, data: { isPrimary } });
    res.json({
      success: true,
      gstin: { id: updated.id, gstin: updated.gstin, isPrimary: updated.isPrimary, createdAt: updated.createdAt },
    });
  } catch (err) {
    next(err);
  }
});

// Delete GSTIN from an entity
router.delete('/:entityId/gstins/:gstinId', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const entityId = req.params.entityId;
    const gstinId = req.params.gstinId;
    await requireEntityOwnedByUser(req.userId, entityId);

    const existing = await prisma.entityGstin.findFirst({ where: { id: gstinId, entityId } });
    if (!existing) throw new AppError(404, 'GSTIN not found');

    await prisma.entityGstin.delete({ where: { id: gstinId } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;


