import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';

const router = Router();

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
        callbackURL: `${process.env.OAUTH_CALLBACK_URL}/google`,
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in profile'), undefined);
        }

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
        return done(error, undefined);
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
    })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      // In a real implementation, generate JWT token here
      const user = req.user as { id: string; email: string };
      logger.info(`User logged in via Google: ${user.email}`);
      
      // For MVP, redirect with user ID (in production, use JWT)
      res.redirect(`/auth/success?userId=${user.id}`);
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
    })
  );

  router.get(
    '/github/callback',
    passport.authenticate('github', { failureRedirect: '/login' }),
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

export default router;

