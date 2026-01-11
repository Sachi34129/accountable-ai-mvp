import { generateInsights } from './openai.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { logger } from '../utils/logger.js';
import type { TransactionData, Insight } from '../types/index.js';

export async function generateFinancialInsights(
  userId: string,
  period: string,
  type?: string
): Promise<Insight[]> {
  try {
    logger.info(`Generating insights for user ${userId}, period ${period}, type ${type || 'all'}`);

    // Get user persona
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { persona: true },
    });

    // Get transactions for the period
    const startDate = new Date(period);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: 'desc' },
    });

    // Convert to TransactionData format
    const txData: TransactionData[] = transactions.map((tx) => ({
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

    // Generate insights
    const insights = await generateInsights(txData, period, user?.persona);

    // Filter by type if specified
    const filteredInsights = type ? insights.filter((i) => i.type === type) : insights;

    // Save insights
    const savedInsights = await Promise.all(
      filteredInsights.map((insight) =>
        prisma.insight.create({
          data: {
            userId,
            period,
            type: insight.type,
            summary: insight.summary,
            eli5: insight.eli5 || null,
            data: insight.data ? (insight.data as Prisma.InputJsonValue) : undefined,
            explanation: insight.explanation || null,
            confidence: insight.confidence || null,
          },
        })
      )
    );

    logger.info(`Generated ${savedInsights.length} insights for user ${userId}`);
    return filteredInsights;
  } catch (error) {
    logger.error('Error generating insights:', error);
    throw error;
  }
}

