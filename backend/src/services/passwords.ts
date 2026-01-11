import crypto from 'crypto';

// Format: scrypt$N$r$p$saltHex$hashHex
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const N = 16384;
  const r = 8;
  const p = 1;
  const keylen = 32;
  const hash = crypto.scryptSync(password, salt, keylen, { N, r, p }) as Buffer;
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6) return false;
    const algo = parts[0];
    if (algo !== 'scrypt') return false;
    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = Buffer.from(parts[4], 'hex');
    const expected = Buffer.from(parts[5], 'hex');
    const actual = crypto.scryptSync(password, salt, expected.length, { N, r, p }) as Buffer;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}


