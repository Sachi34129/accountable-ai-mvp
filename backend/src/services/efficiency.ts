import { callHuggingFace } from './huggingface.js';
import { logger } from '../utils/logger.js';
import { EfficiencyMetric, TransactionData } from '../types/index.js';

/**
 * EMPLOYEE EFFICIENCY AGENT
 * Analyzes financial behavior to suggest productivity and cost-saving improvements.
 */
export async function analyzeEfficiency(transactions: TransactionData[]): Promise<EfficiencyMetric[]> {
    try {
        logger.info('Analyzing employee efficiency with Hugging Face Agent');

        const prompt = `Analyze these financial transactions and generate efficiency metrics:
- Spending speed (velocity)
- Recurring cost optimization
- Anomaly detection regarding productivity tools

Transactions:
${JSON.stringify(transactions.slice(0, 30))}

Return JSON array:
[
  {
    "metric": "Transaction Velocity",
    "value": 85,
    "unit": "%",
    "trend": "up",
    "insight": "Your expense processing speed has increased by 10% this month."
  }
]

Return ONLY valid JSON.`;

        const response = await callHuggingFace(prompt);

        const jsonMatch = response.match(/(\[[\s\S]*\])/);
        if (!jsonMatch) throw new Error('No JSON array found in response');

        return JSON.parse(jsonMatch[1]) as EfficiencyMetric[];
    } catch (error) {
        logger.error('Error in efficiency analysis:', error);
        throw error;
    }
}
