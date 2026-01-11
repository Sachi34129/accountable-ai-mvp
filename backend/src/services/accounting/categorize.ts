import { prisma } from '../../db/prisma.js';
import { aiCategorize } from './aiCategorize.js';

type CategorizationOutput = {
  categoryId: string | null;
  method: 'manual' | 'rule' | 'history' | 'ai' | 'uncategorized';
  confidence: number;
  explanation: string;
  status: 'confirmed' | 'needs_review';
};

function includesInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function matcherMatches(matchers: any, descriptionClean: string, reference: string | null, direction: string, amount: number): boolean {
  if (!matchers || typeof matchers !== 'object') return false;
  if (matchers.direction && matchers.direction !== direction) return false;
  if (typeof matchers.minAmount === 'number' && amount < matchers.minAmount) return false;
  if (typeof matchers.maxAmount === 'number' && amount > matchers.maxAmount) return false;
  if (matchers.descriptionContains && !includesInsensitive(descriptionClean, String(matchers.descriptionContains))) return false;
  if (matchers.referenceEquals && (!reference || reference !== String(matchers.referenceEquals))) return false;
  if (matchers.descriptionRegex) {
    try {
      const re = new RegExp(String(matchers.descriptionRegex), 'i');
      if (!re.test(descriptionClean)) return false;
    } catch {
      return false;
    }
  }
  return true;
}

export async function categorizeNormalizedTransaction(params: {
  entityId: string;
  normalizedTransactionId: string;
  descriptionClean: string;
  referenceExtracted?: string | null;
  direction: string;
  amount: number;
}): Promise<CategorizationOutput> {
  const { entityId, normalizedTransactionId, descriptionClean, referenceExtracted, direction, amount } = params;

  // 1) Manual override rules (user-specific learning)
  const overrides = await prisma.userOverrideRule.findMany({
    where: { entityId, enabled: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  for (const rule of overrides) {
    if (matcherMatches(rule.matchers as any, descriptionClean, referenceExtracted || null, direction, amount)) {
      return {
        categoryId: rule.categoryId,
        method: 'manual',
        confidence: 1.0,
        explanation: 'Matched a user override rule based on prior correction.',
        status: 'confirmed',
      };
    }
  }

  // 2) Explicit system rules (deterministic)
  const rules = await prisma.categorizationRule.findMany({
    where: { entityId, enabled: true },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });
  for (const rule of rules) {
    if (matcherMatches(rule.matchers as any, descriptionClean, referenceExtracted || null, direction, amount)) {
      return {
        categoryId: rule.categoryId,
        method: 'rule',
        confidence: 0.85,
        explanation: rule.explanationTemplate || 'Matched an explicit categorization rule.',
        status: 'confirmed',
      };
    }
  }

  // 3) Historical behavior (deterministic heuristic: same cleaned description -> same category)
  const recent = await prisma.normalizedTransaction.findMany({
    where: { entityId, descriptionClean },
    take: 10,
    orderBy: { date: 'desc' },
    include: { Categorization: true },
  });
  const recentCats = recent
    .map((r) => r.Categorization?.categoryId)
    .filter((c): c is string => Boolean(c));
  if (recentCats.length) {
    const most = recentCats.sort((a, b) => recentCats.filter((x) => x === a).length - recentCats.filter((x) => x === b).length).pop()!;
    return {
      categoryId: most,
      method: 'history',
      confidence: 0.7,
      explanation: 'Matched your historical categorization for similar transactions (same description).',
      status: 'needs_review', // conservative until user confirms learning
    };
  }

  // 4) AI inference (Gemini) - only after manual/rules/history
  const ai = await aiCategorize({
    entityId,
    descriptionClean,
    direction,
    amount,
    referenceExtracted: referenceExtracted || null,
  });
  if (ai?.categoryId) {
    const status: 'confirmed' | 'needs_review' = ai.confidence >= 0.8 ? 'confirmed' : 'needs_review';
    return {
      categoryId: ai.categoryId,
      method: 'ai',
      confidence: ai.confidence,
      explanation: `AI suggestion: ${ai.explanation}`,
      status,
    };
  }

  // 5) Uncategorized
  return {
    categoryId: null,
    method: 'uncategorized',
    confidence: 0.0,
    explanation: 'No rule or prior behavior matched. Requires manual review.',
    status: 'needs_review',
  };
}


