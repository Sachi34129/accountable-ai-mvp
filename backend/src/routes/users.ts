import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { clearSessionFromRequest } from '../services/sessions.js';
import { verifyPassword } from '../services/passwords.js';

const router = Router();

function cleanPhone(raw: any): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Basic: allow + and digits, 7-15 digits.
  const normalized = s.startsWith('+') ? `+${s.slice(1).replace(/\D/g, '')}` : s.replace(/\D/g, '');
  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  if (digits.length < 7 || digits.length > 15) throw new AppError(400, 'Invalid phone number');
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
}

// Get current user (for settings/profile)
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new AppError(401, 'Unauthorized');

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        pan: user.pan,
        role: user.role,
        phone: (user as any).phone || null,
        onboardingCompleted: user.onboardingCompleted,
        hasPassword: Boolean((user as any).passwordHash),
        isGoogleUser: Boolean(user.googleSub),
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update current user profile + mark onboarding completed
router.post('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');

    const { name, pan, role } = req.body as any;
    if (!name || typeof name !== 'string') throw new AppError(400, 'Name is required');
    if (!pan || typeof pan !== 'string') throw new AppError(400, 'PAN is required');

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        name,
        pan: pan.toUpperCase(),
        role: role || undefined,
        onboardingCompleted: true,
      },
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        pan: user.pan,
        phone: (user as any).phone || null,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Update profile details (settings): name/pan/role/phone (does NOT force onboardingCompleted)
router.put('/me/profile', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const { name, pan, role, phone } = req.body as any;

    const data: any = {};
    if (name != null) {
      if (typeof name !== 'string' || !name.trim()) throw new AppError(400, 'Invalid name');
      data.name = name.trim();
    }
    if (pan != null) {
      if (typeof pan !== 'string' || !pan.trim()) throw new AppError(400, 'Invalid PAN');
      data.pan = pan.trim().toUpperCase();
    }
    if (role != null) {
      if (typeof role !== 'string' || !role.trim()) throw new AppError(400, 'Invalid role');
      data.role = role.trim();
    }
    if (phone !== undefined) {
      data.phone = cleanPhone(phone);
    }

    if (!Object.keys(data).length) throw new AppError(400, 'No fields to update');

    const user = await prisma.user.update({ where: { id: req.userId }, data });
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        pan: user.pan,
        role: user.role,
        phone: (user as any).phone || null,
        onboardingCompleted: user.onboardingCompleted,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Change email (settings)
router.put('/me/email', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const newEmail = typeof req.body?.newEmail === 'string' ? req.body.newEmail.trim().toLowerCase() : '';
    if (!newEmail) throw new AppError(400, 'newEmail is required');

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) throw new AppError(401, 'Unauthorized');

    // If this is a password-based account, require current password.
    if ((user as any).passwordHash) {
      const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
      if (!currentPassword) throw new AppError(400, 'currentPassword is required');
      const ok = verifyPassword(currentPassword, (user as any).passwordHash);
      if (!ok) throw new AppError(401, 'Invalid password');
    } else if (user.googleSub) {
      // For Google-only accounts, we keep email tied to provider to avoid lockouts.
      throw new AppError(400, 'Email cannot be changed for Google-only accounts');
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== user.id) throw new AppError(409, 'Email already in use');

    const updated = await prisma.user.update({ where: { id: user.id }, data: { email: newEmail } });
    res.json({ success: true, user: { id: updated.id, email: updated.email } });
  } catch (err) {
    next(err);
  }
});

// Delete account (and ALL related data via cascading deletes) + clear session cookie
router.delete('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) throw new AppError(401, 'Unauthorized');
    const userId = req.userId;

    await clearSessionFromRequest(req, res);
    await prisma.user.delete({ where: { id: userId } });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;


