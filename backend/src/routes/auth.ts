import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import { createSessionAndSetCookie, clearSessionFromRequest } from '../services/sessions.js';
import { validate } from '../middleware/validator.js';
import { loginSchema, signupSchema } from '../utils/schemas.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../services/passwords.js';
import { ensureDefaultEntityForUser } from '../services/accounting/entity.js';

const router = Router();

function getPrimaryFrontendUrl(): string {
  const raw = process.env.FRONTEND_URL || 'http://localhost:5173';
  return raw.split(',')[0]!.trim();
}

function getGoogleCallbackUrl(): string {
  // Prefer explicit callback base, but ensure we include the actual callback path.
  const base = process.env.OAUTH_CALLBACK_URL || 'http://localhost:3000/api/auth';
  const trimmed = base.endsWith('/') ? base.slice(0, -1) : base;
  // Accept either ".../api/auth" or ".../api/auth/google" (legacy) and normalize to ".../api/auth/google/callback"
  if (trimmed.endsWith('/google/callback')) return trimmed;
  if (trimmed.endsWith('/google')) return `${trimmed}/callback`;
  return `${trimmed}/google/callback`;
}

// Only initialize OAuth strategies if credentials are provided
const hasGoogleOAuth = process.env.GOOGLE_CLIENT_ID && 
                       process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id' &&
                       process.env.GOOGLE_CLIENT_SECRET &&
                       process.env.GOOGLE_CLIENT_SECRET !== 'your_google_client_secret';

const hasGitHubOAuth = process.env.GITHUB_CLIENT_ID && 
                       process.env.GITHUB_CLIENT_ID !== 'your_github_client_id' &&
                       process.env.GITHUB_CLIENT_SECRET &&
                       process.env.GITHUB_CLIENT_SECRET !== 'your_github_client_secret';

// Google OAuth Strategy (only if credentials are provided)
if (hasGoogleOAuth) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: getGoogleCallbackUrl(),
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in profile'), undefined);
        }

        const googleSub = profile.id;
        const displayName = profile.displayName || profile.name?.givenName || undefined;

        let user =
          (googleSub
            ? await prisma.user.findUnique({ where: { googleSub } }).catch(() => null)
            : null) ||
          (await prisma.user.findUnique({ where: { email } }));

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: displayName,
              persona: 'default',
              googleSub,
            },
          });
        } else {
          // Backfill provider id / name if missing
          const updateData: any = {};
          if (googleSub && !user.googleSub) updateData.googleSub = googleSub;
          if (displayName && !user.name) updateData.name = displayName;
          if (Object.keys(updateData).length) {
            user = await prisma.user.update({ where: { id: user.id }, data: updateData });
          }
        }

        await ensureDefaultEntityForUser(user.id);
        return done(null, user);
      } catch (error) {
        return done(error, undefined);
      }
    }
  ));
} else {
  logger.info('Google OAuth not configured - skipping initialization');
}

// GitHub OAuth Strategy (only if credentials are provided)
if (hasGitHubOAuth) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        callbackURL: `${process.env.OAUTH_CALLBACK_URL}/github`,
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
        
        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              persona: 'default',
            },
          });
        }

        return done(null, user);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        return done(err, undefined);
      }
    }
  ));
} else {
  logger.info('GitHub OAuth not configured - skipping initialization');
}

// Google OAuth routes (only if configured)
if (hasGoogleOAuth) {
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: `${getPrimaryFrontendUrl()}?oauth=error`, session: false }),
    (req, res) => {
      const user = req.user as { id: string; email: string };
      logger.info(`User logged in via Google: ${user.email}`);

      // Issue DB-backed session cookie and redirect to frontend root.
      void createSessionAndSetCookie(res, user.id)
        .then(() => res.redirect(getPrimaryFrontendUrl()))
        .catch(() => res.redirect(`${getPrimaryFrontendUrl()}?oauth=error`));
    }
  );
} else {
  router.get('/google', (req, res) => {
    res.status(501).json({ error: 'Google OAuth not configured' });
  });
}

// GitHub OAuth routes (only if configured)
if (hasGitHubOAuth) {
  router.get(
    '/github',
    passport.authenticate('github', {
      scope: ['user:email'],
      session: false,
    })
  );

  router.get(
    '/github/callback',
    passport.authenticate('github', { failureRedirect: '/login', session: false }),
    (req, res) => {
      const user = req.user as { id: string; email: string };
      logger.info(`User logged in via GitHub: ${user.email}`);
      
      res.redirect(`/auth/success?userId=${user.id}`);
    }
  );
} else {
  router.get('/github', (req, res) => {
    res.status(501).json({ error: 'GitHub OAuth not configured' });
  });
}

// Success route (for OAuth callback)
router.get('/success', (req, res) => {
  const userId = req.query.userId as string;
  res.json({
    success: true,
    userId,
    message: 'Authentication successful',
    // In production, return JWT token here
  });
});

// Email/password sign up
router.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as any;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'User already exists. Please sign in.' });
    }

    const passwordHash = hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        persona: 'default',
        passwordHash,
      },
    });

    await ensureDefaultEntityForUser(user.id);
    await createSessionAndSetCookie(res, user.id);
    res.status(201).json({ success: true, user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
});

// Email/password sign in
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as any;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    await ensureDefaultEntityForUser(user.id);
    await createSessionAndSetCookie(res, user.id);
    res.json({ success: true, user: { id: user.id, email: user.email } });
  } catch (err) {
    next(err);
  }
});

// Logout
router.post('/logout', async (req, res, next) => {
  try {
    await clearSessionFromRequest(req, res);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Who am I (cookie auth)
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    if (!req.userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Ensure default Personal entity exists for every user (including existing users).
    await ensureDefaultEntityForUser(user.id);

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

export default router;

