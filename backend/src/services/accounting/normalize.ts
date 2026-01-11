import type { RawTransaction } from '@prisma/client';

export const NORMALIZATION_VERSION = 'acct_norm_v1';

function cleanDescription(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

function extractReference(description: string): string | null {
  // Deterministic extraction of explicit reference patterns only.
  const patterns = [
    /\bUTR[:\s-]*([A-Z0-9]{8,22})\b/i,
    /\bRRN[:\s-]*([0-9]{10,18})\b/i,
    /\bUPI\s*Ref[:\s-]*([0-9]{10,20})\b/i,
    /\bRef(?:erence)?[:\s-]*([A-Z0-9-]{6,30})\b/i,
  ];
  for (const re of patterns) {
    const m = description.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

export function normalizeRawTransaction(raw: RawTransaction) {
  const timezone = 'Asia/Kolkata';
  const descriptionClean = cleanDescription(raw.rawDescription);
  const referenceExtracted = raw.referenceId || extractReference(descriptionClean) || undefined;

  const diff: any = {
    timezone,
    normalizationVersion: NORMALIZATION_VERSION,
    description: { from: raw.rawDescription, to: descriptionClean },
    referenceExtracted: referenceExtracted || null,
  };

  return {
    entityId: raw.entityId,
    rawTransactionId: raw.id,
    date: raw.transactionDate,
    amount: raw.amount,
    direction: raw.direction,
    descriptionClean,
    referenceExtracted,
    timezone,
    normalizationVersion: NORMALIZATION_VERSION,
    normalizationDiffJson: diff,
  };
}


