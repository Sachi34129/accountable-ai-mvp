import { prisma } from '../../db/prisma.js';
import { generateJsonWithGemini } from '../gemini.js';

export async function aiCategorize(params: {
  entityId: string;
  descriptionClean: string;
  direction: string;
  amount: number;
  referenceExtracted?: string | null;
}): Promise<{ categoryId: string | null; confidence: number; explanation: string } | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  if (!cats.length) return null;

  const allowed = cats.map((c) => ({ code: c.code, name: c.name, ledgerType: c.ledgerType }));

  // Minimal pattern context for conservative classification (do NOT infer from one-off).
  const recentSame = await prisma.normalizedTransaction.findMany({
    where: { entityId: params.entityId, descriptionClean: params.descriptionClean },
    select: { date: true, amount: true, direction: true },
    orderBy: { date: 'desc' },
    take: 12,
  });

  const occurrences = recentSame.length;
  const amounts = recentSame.map((r) => r.amount);
  const minAmt = amounts.length ? Math.min(...amounts) : null;
  const maxAmt = amounts.length ? Math.max(...amounts) : null;
  const stableAmount = minAmt != null && maxAmt != null ? (maxAmt - minAmt) / Math.max(1, maxAmt) <= 0.05 : false;

  const prompt = `You are a Chartered Accountant–grade transaction classification agent.
Your job is to identify the correct *accounting nature* of a bank/UPI/card transaction using explicit rules, not intuition.

ABSOLUTE CONSTRAINTS:
- Be conservative. Never guess.
- If evidence is insufficient, output UNCLASSIFIED_REVIEW_REQUIRED.
- Merchant name alone is never sufficient. Amount alone is never sufficient. A single occurrence is never sufficient.
- Follow the priority order strictly, but note: the system already applied user overrides + explicit deterministic rules + history. You are ONLY the fallback.

CLASSIFICATION PRIORITY (DO NOT VIOLATE):
1) Strong merchant identity match
2) Transaction pattern match (recurrence, EMI-like, rent-like, salary-like)
3) Weak heuristic inference
4) UNCLASSIFIED_REVIEW_REQUIRED

CONFIDENCE RULE:
- 0.90–1.00: explicit rule + strong pattern
- 0.70–0.89: rule + partial pattern (still needs review unless very strong)
- 0.50–0.69: weak rule → needs review
- <0.50: must be UNCLASSIFIED_REVIEW_REQUIRED

ALLOWED CATEGORIES (choose one or UNCLASSIFIED_REVIEW_REQUIRED):
${JSON.stringify(allowed, null, 2)}

TRANSACTION:
${JSON.stringify(
    {
      description: params.descriptionClean,
      direction: params.direction, // inflow|outflow
      amount: params.amount,
      reference: params.referenceExtracted || null,
    },
    null,
    2
  )}

HISTORICAL CONTEXT (same cleaned description only):
${JSON.stringify(
    {
      occurrences,
      stableAmount,
      last12: recentSame.map((r) => ({ date: r.date.toISOString().slice(0, 10), amount: r.amount, direction: r.direction })),
    },
    null,
    2
  )}

OUTPUT ONLY JSON with this exact shape:
{
  "categoryCode": "one of allowed code OR UNCLASSIFIED_REVIEW_REQUIRED",
  "confidence": 0.0,
  "status": "CONFIRMED" | "NEEDS_REVIEW" | "UNCLASSIFIED",
  "explanation": "Short, rule-referenced explanation. If UNCLASSIFIED, explain what evidence is missing."
}

If you cannot cite at least 2 strong signals, return UNCLASSIFIED_REVIEW_REQUIRED with confidence < 0.5.`;

  try {
    const data = await generateJsonWithGemini({ prompt, temperature: 0.1, maxOutputTokens: 512 });
    const code = typeof data?.categoryCode === 'string' ? data.categoryCode : null;
    const confidence = Math.max(0, Math.min(1, Number(data?.confidence ?? 0)));
    const explanation = typeof data?.explanation === 'string' ? data.explanation : 'AI suggestion';

    if (!code) return null;
    if (code === 'UNCLASSIFIED_REVIEW_REQUIRED' || confidence < 0.5) return null;
    const cat = cats.find((c) => c.code === code);
    if (!cat) return null;

    return { categoryId: cat.id, confidence, explanation };
  } catch {
    return null;
  }
}


