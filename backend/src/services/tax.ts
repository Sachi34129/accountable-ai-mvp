import { detectTaxOpportunities } from './openai.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import type { TransactionData } from '../types/index.js';

export async function analyzeTaxOpportunities(userId: string, assessmentYear: string) {
  try {
    logger.info(`Analyzing tax opportunities for user ${userId}, year ${assessmentYear}`);

    // Get all transactions for the user
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    // Convert to TransactionData format
    const txData: TransactionData[] = transactions.map((tx) => ({
      id: tx.id,
      date: tx.date.toISOString(),
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      merchant: tx.merchant || undefined,
      direction: tx.direction as 'income' | 'expense',
      category: tx.category || undefined,
      subCategory: tx.subCategory || undefined,
      isRecurring: tx.isRecurring,
      labels: tx.labels,
      confidence: tx.confidence || undefined,
    }));

    // Detect opportunities
    const opportunities = await detectTaxOpportunities(txData, assessmentYear);

    // Save tax notes
    const taxNotes = await Promise.all(
      opportunities.map((opp) =>
        prisma.taxNote.create({
          data: {
            userId,
            assessmentYear,
            section: opp.section,
            title: opp.title,
            potentialDeduction: opp.potentialDeduction,
            evidenceTransactionIds: opp.evidenceTransactionIds,
            explanation: opp.explanation,
            confidence: opp.confidence,
            uncertaintyNote: opp.uncertaintyNote || null,
          },
        })
      )
    );

    logger.info(`Created ${taxNotes.length} tax notes for user ${userId}`);
    return taxNotes;
  } catch (error) {
    logger.error('Error analyzing tax opportunities:', error);
    throw error;
  }
}

