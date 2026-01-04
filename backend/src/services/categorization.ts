import { categorizeTransaction } from './openai.js';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import type { TransactionData } from '../types/index.js';

export async function categorizeTransactions(transactionIds: string[], userId: string) {
  try {
    logger.info(`Categorizing ${transactionIds.length} transactions for user ${userId}`);

    // Get user persona
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { persona: true },
    });

    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId,
      },
    });

    // Categorize each transaction
    const results = await Promise.all(
      transactions.map(async (tx) => {
        const txData: TransactionData = {
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
        };

        const categorization = await categorizeTransaction(txData, user?.persona);

        // Update transaction
        await prisma.transaction.update({
          where: { id: tx.id },
          data: {
            category: categorization.category,
            subCategory: categorization.subCategory || null,
            explanation: categorization.explanation,
            confidence: categorization.confidence,
          },
        });

        return {
          transactionId: tx.id,
          category: categorization.category,
          confidence: categorization.confidence,
        };
      })
    );

    logger.info(`Categorization completed for ${results.length} transactions`);
    return results;
  } catch (error) {
    logger.error('Error categorizing transactions:', error);
    throw error;
  }
}

