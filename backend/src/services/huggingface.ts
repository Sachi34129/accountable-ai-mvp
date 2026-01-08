import dotenv from 'dotenv';
dotenv.config();

import { HfInference } from '@huggingface/inference';
import { logger } from '../utils/logger.js';
import type {
    ExtractionResult,
    TransactionData,
    CategorizationResult,
    TaxOpportunity,
    Insight,
} from '../types/index.js';

// Initialize Hugging Face client
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL = process.env.HUGGINGFACE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';

if (!HF_API_KEY) {
    logger.error('HUGGINGFACE_API_KEY is not set in environment variables');
    throw new Error('HUGGINGFACE_API_KEY is required');
}

const hf = new HfInference(HF_API_KEY);

logger.info('🤗 Hugging Face AI Service Initialized');
logger.info(`   Model: ${HF_MODEL}`);
logger.info('   Accountable AI: Enabled');

/**
 * ACCOUNTABLE AI SYSTEM PROMPT
 * Enforces responsible AI behavior across all operations
 */
const ACCOUNTABLE_AI_PROMPT = `You are an accountable AI assistant. Follow these principles:

1. FACTUAL: Base all answers on evidence and data provided
2. TRANSPARENT: Explain your reasoning clearly
3. BIAS-AWARE: Acknowledge potential biases or limitations
4. UNCERTAINTY: Explicitly state when you're uncertain or making assumptions
5. HELPFUL: Provide actionable, practical guidance

Always structure responses as valid JSON when requested.`;

/**
 * Call Hugging Face Inference API with retry logic
 */
export async function callHuggingFace(prompt: string, systemPrompt?: string, retries = 3): Promise<string> {
    const fullPrompt = systemPrompt
        ? `${systemPrompt}\n\n${prompt}`
        : `${ACCOUNTABLE_AI_PROMPT}\n\n${prompt}`;

    try {
        logger.info(`Calling Hugging Face API with model: ${HF_MODEL}`);

        const response = await hf.textGeneration({
            model: HF_MODEL,
            inputs: fullPrompt,
            parameters: {
                max_new_tokens: 2048,
                temperature: 0.3,
                return_full_text: false,
            },
        });

        const generatedText = response.generated_text || '';
        logger.info(`HF API response received (${generatedText.length} chars)`);

        return generatedText;
    } catch (error: any) {
        logger.error(`Hugging Face API error: ${error.message}`);

        // Retry logic with exponential backoff
        if (retries > 0 && (error.message.includes('rate limit') || error.message.includes('timeout'))) {
            const waitTime = Math.pow(2, 3 - retries) * 1000;
            logger.warn(`Retrying in ${waitTime}ms... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return callHuggingFace(prompt, systemPrompt, retries - 1);
        }

        throw error;
    }
}

/**
 * Extract JSON from text response (handles markdown code blocks)
 */
function extractJSON(text: string): any {
    // Try to find JSON in markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || text.match(/(\{[\s\S]*\})/);

    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[1]);
        } catch (e) {
            logger.warn('Failed to parse extracted JSON, trying full text');
        }
    }

    // Try parsing the full text
    try {
        return JSON.parse(text);
    } catch (e) {
        logger.error(`Failed to parse JSON from response: ${text.substring(0, 200)}...`);
        throw new Error('Invalid JSON response from AI');
    }
}

/* ------------------------------------------------------------------ */
/* DOCUMENT EXTRACTION */
/* ------------------------------------------------------------------ */

export async function extractFromDocument(
    imageUrl: string,
    mimeType: string
): Promise<ExtractionResult> {
    try {
        logger.info('Extracting transactions from document using Hugging Face API');

        // Note: For image extraction, we'll use a text-based approach
        // In production, you might want to use OCR first or a vision model
        const prompt = `Extract financial transactions from a document. 

Return a JSON object with this exact structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "amount": 0.0,
      "currency": "INR",
      "description": "string",
      "merchant": "string or null",
      "direction": "income or expense",
      "category": "string or null",
      "subCategory": "string or null",
      "isRecurring": false,
      "labels": [],
      "confidence": 0.8
    }
  ],
  "metadata": {
    "documentType": "receipt",
    "extractedAt": "${new Date().toISOString()}",
    "confidence": 0.8,
    "model": "${HF_MODEL}",
    "version": "1.0"
  }
}

If you cannot extract transactions from the provided information, return an empty transactions array.
Return ONLY valid JSON, no additional text.`;

        const response = await callHuggingFace(prompt);
        const result = extractJSON(response) as ExtractionResult;

        // Validate structure
        if (!result.transactions || !Array.isArray(result.transactions)) {
            logger.warn('Invalid extraction result, returning empty');
            return {
                transactions: [],
                metadata: {
                    documentType: 'other',
                    extractedAt: new Date().toISOString(),
                    confidence: 0,
                    model: HF_MODEL,
                    version: '1.0',
                },
            };
        }

        return result;
    } catch (error) {
        logger.error('Error extracting from document:', error);
        throw error;
    }
}

/* ------------------------------------------------------------------ */
/* TRANSACTION CATEGORIZATION */
/* ------------------------------------------------------------------ */

export async function categorizeTransaction(
    transaction: TransactionData,
    userPersona?: string
): Promise<CategorizationResult> {
    try {
        const prompt = `Categorize this financial transaction into standard categories:

Categories:
- Income: salary, freelance, investment_return, other_income
- Expense: food_dining, groceries, transportation, utilities, entertainment, shopping, healthcare, education, subscription, fees, other
- Investment: mutual_fund, stocks, bonds, fixed_deposit, other
- Subscription: streaming, software, gym, other
- Fees: bank_fees, transaction_fees, penalty, other

Transaction:
- Amount: ${transaction.amount} ${transaction.currency}
- Description: ${transaction.description}
- Merchant: ${transaction.merchant || 'N/A'}
- Direction: ${transaction.direction}
- Date: ${transaction.date}
${userPersona ? `\nUser Context: ${userPersona}` : ''}

Return JSON:
{
  "category": "string",
  "subCategory": "string or null",
  "explanation": "Clear explanation of why this category was chosen",
  "confidence": 0.0-1.0
}

Return ONLY valid JSON.`;

        const response = await callHuggingFace(prompt);
        return extractJSON(response) as CategorizationResult;
    } catch (error) {
        logger.error('Error categorizing transaction:', error);
        throw error;
    }
}

/* ------------------------------------------------------------------ */
/* TAX OPPORTUNITY DETECTION */
/* ------------------------------------------------------------------ */

export async function detectTaxOpportunities(
    transactions: TransactionData[],
    assessmentYear: string
): Promise<TaxOpportunity[]> {
    try {
        const prompt = `Analyze these transactions for Indian tax deduction opportunities for assessment year ${assessmentYear}.

Key sections:
- 80C: Life insurance, ELSS, PPF, NSC, tax-saving FDs, home loan principal
- 80D: Health insurance premiums
- 80G: Donations to registered charities
- 24(b): Home loan interest
- HRA: House Rent Allowance
- 80E: Education loan interest
- 80TTA/80TTB: Interest on savings

Transactions:
${JSON.stringify(transactions.slice(0, 20), null, 2)}

Return JSON:
{
  "opportunities": [
    {
      "section": "80C",
      "title": "Brief title",
      "potentialDeduction": 0.0,
      "evidenceTransactionIds": [],
      "explanation": "Why this qualifies and how much can be claimed",
      "confidence": 0.0-1.0,
      "uncertaintyNote": "Any caveats or uncertainties"
    }
  ]
}

Return ONLY valid JSON.`;

        const response = await callHuggingFace(prompt);
        const result = extractJSON(response);

        return Array.isArray(result.opportunities) ? result.opportunities : [];
    } catch (error) {
        logger.error('Error detecting tax opportunities:', error);
        throw error;
    }
}

/* ------------------------------------------------------------------ */
/* INSIGHTS GENERATION */
/* ------------------------------------------------------------------ */

export async function generateInsights(
    transactions: TransactionData[],
    period: string,
    userPersona?: string
): Promise<Insight[]> {
    try {
        const prompt = `Generate financial insights from these transactions for period: ${period}

Insight types:
- spending_velocity: Unusual spending rate changes
- anomaly: Unexpected or unusual transactions
- payment_tip: Suggestions for better financial management
- trend: Patterns in spending or income

Transactions:
${JSON.stringify(transactions.slice(0, 30), null, 2)}
${userPersona ? `\nUser Context: ${userPersona}` : ''}

Return JSON:
{
  "insights": [
    {
      "type": "spending_velocity|anomaly|payment_tip|trend",
      "summary": "Brief summary",
      "eli5": "Explain like I'm 5 - simple explanation",
      "data": {},
      "explanation": "Detailed explanation with reasoning",
      "confidence": 0.0-1.0
    }
  ]
}

Return ONLY valid JSON.`;

        const response = await callHuggingFace(prompt);
        const result = extractJSON(response);

        return Array.isArray(result.insights) ? result.insights : [];
    } catch (error) {
        logger.error('Error generating insights:', error);
        throw error;
    }
}

/* ------------------------------------------------------------------ */
/* FINANCIAL CHAT */
/* ------------------------------------------------------------------ */

export async function chatWithFinances(
    message: string,
    context: {
        transactions: TransactionData[];
        insights?: Insight[];
        taxNotes?: TaxOpportunity[];
    }
): Promise<string> {
    try {
        const prompt = `You are a helpful financial assistant. Answer the user's question using the provided financial data.

Financial Context:
Recent Transactions: ${JSON.stringify(context.transactions.slice(0, 20), null, 2)}
${context.insights ? `\nInsights: ${JSON.stringify(context.insights, null, 2)}` : ''}
${context.taxNotes ? `\nTax Notes: ${JSON.stringify(context.taxNotes, null, 2)}` : ''}

User Question: ${message}

Provide a clear, helpful answer. Cite specific transactions or data when relevant. If you're uncertain about something, say so explicitly.`;

        const response = await callHuggingFace(prompt);
        return response || 'I apologize, but I could not generate a response.';
    } catch (error) {
        logger.error('Error in financial chat:', error);
        throw error;
    }
}

/* ------------------------------------------------------------------ */
/* DISPUTE EMAIL GENERATION */
/* ------------------------------------------------------------------ */

export async function generateDisputeEmail(
    transaction: TransactionData,
    reason?: string
): Promise<{ subject: string; body: string; recipient?: string }> {
    try {
        const prompt = `Draft a professional dispute email for this transaction:

Transaction:
${JSON.stringify(transaction, null, 2)}

Dispute Reason: ${reason || 'General dispute - transaction not recognized'}

Return JSON:
{
  "subject": "Professional email subject line",
  "body": "Polite, clear email body with all transaction details",
  "recipient": "merchant email if known, otherwise null"
}

Return ONLY valid JSON.`;

        const response = await callHuggingFace(prompt);
        return extractJSON(response);
    } catch (error) {
        logger.error('Error generating dispute email:', error);
        throw error;
    }
}
