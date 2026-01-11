import crypto from 'crypto';
import type { Request, Response } from 'express';
import { prisma } from '../db/prisma.js';

const COOKIE_NAME = 'session';

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join('=') || '');
  }
  return out;
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function createSessionAndSetCookie(res: Response, userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export async function clearSessionFromRequest(req: Request, res: Response) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (token) {
    const tokenHash = sha256Hex(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const tokenHash = sha256Hex(token);

  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.deleteMany({ where: { tokenHash } });
    return null;
  }
  return session.userId;
}


