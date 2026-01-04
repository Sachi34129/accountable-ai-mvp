import dotenv from 'dotenv';
dotenv.config(); // Load .env at the very top

import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import type { ExtractionResult, TransactionData, CategorizationResult, TaxOpportunity, Insight } from '../types/index.js';
import * as ollama from './ollama.js';

// Check if we should use Ollama (local) or OpenAI
// This is evaluated at module load time, so we need to ensure dotenv is loaded first
// Force re-evaluation to ensure we get the latest env value
function getUseOllama(): boolean {
  const value = process.env.USE_OLLAMA;
  const isTrue = value === 'true' || value === 'True' || value === 'TRUE';
  logger.info(`[DEBUG] USE_OLLAMA env value: "${value}", type: ${typeof value}, isTrue: ${isTrue}`);
  return isTrue;
}

const USE_OLLAMA = getUseOllama();

// Log which mode we're using (this runs when module is loaded)
if (USE_OLLAMA) {
  logger.info('🤖 Using Ollama for AI processing (local models)');
  logger.info(`   Ollama URL: ${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}`);
  logger.info(`   Vision Model: ${process.env.OLLAMA_VISION_MODEL || 'llava:latest'}`);
  logger.info(`   Text Model: ${process.env.OLLAMA_TEXT_MODEL || 'llama3:latest'}`);
} else {
  logger.info('🌐 Using OpenAI API for AI processing');
  logger.warn(`[WARNING] USE_OLLAMA is not 'true'. Current value: "${process.env.USE_OLLAMA}"`);
}

// Initialize OpenAI client only if API key is provided and not using Ollama
const getOpenAIClient = () => {
  if (USE_OLLAMA) {
    throw new Error('Ollama mode is enabled. OpenAI client should not be used.');
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key') {
    throw new Error('OPENAI_API_KEY is not set. Please add your OpenAI API key to .env file');
  }
  return new OpenAI({ apiKey });
};

export async function extractFromDocument(
  imageUrl: string,
  mimeType: string
): Promise<ExtractionResult> {
  // Re-check USE_OLLAMA at runtime to ensure we have latest value
  const useOllama = process.env.USE_OLLAMA === 'true';
  logger.info(`[DEBUG] extractFromDocument called, USE_OLLAMA check: ${useOllama}, env value: "${process.env.USE_OLLAMA}"`);
  
  // Use Ollama if enabled
  if (useOllama) {
    logger.info('✅ Using Ollama for document extraction');
    return ollama.extractFromDocument(imageUrl, mimeType);
  }
  
  logger.warn('⚠️  Falling back to OpenAI (USE_OLLAMA is not true)');

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Updated to current vision model
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Extract all financial transactions from this document. Return a JSON object with this structure:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "amount": number,
      "currency": "INR",
      "description": "string",
      "merchant": "string (optional)",
      "direction": "income" | "expense",
      "category": "string (optional)",
      "subCategory": "string (optional)",
      "isRecurring": boolean,
      "labels": ["string"],
      "confidence": number (0-1)
    }
  ],
  "metadata": {
    "documentType": "receipt" | "invoice" | "statement" | "other",
    "extractedAt": "ISO timestamp",
    "confidence": number (0-1),
    "model": "gpt-4o",
    "version": "1.0"
  }
}

Be thorough and extract all visible transactions.`,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl.startsWith('data:') ? imageUrl : `data:${mimeType};base64,${imageUrl}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const result = JSON.parse(jsonStr) as ExtractionResult;

    return result;
  } catch (error) {
    logger.error('Error extracting from document:', error);
    throw error;
  }
}

export async function categorizeTransaction(
  transaction: TransactionData,
  userPersona?: string
): Promise<CategorizationResult> {
  // Re-check at runtime
  if (process.env.USE_OLLAMA === 'true') {
    logger.info('✅ Using Ollama for transaction categorization');
    return ollama.categorizeTransaction(transaction, userPersona);
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a financial categorization expert. Categorize transactions into standard categories like:
- Income: salary, freelance, investment_return, other_income
- Expense: food_dining, groceries, transportation, utilities, entertainment, shopping, healthcare, education, subscription, fees, other
- Investment: mutual_fund, stocks, bonds, fixed_deposit, other
- Subscription: streaming, software, gym, other
- Fees: bank_fees, transaction_fees, penalty, other

Provide explanations in simple terms.`,
        },
        {
          role: 'user',
          content: `Categorize this transaction:
Amount: ${transaction.amount} ${transaction.currency}
Description: ${transaction.description}
Merchant: ${transaction.merchant || 'N/A'}
Direction: ${transaction.direction}
Date: ${transaction.date}

${userPersona ? `User persona: ${userPersona}` : ''}

Return JSON:
{
  "category": "string",
  "subCategory": "string (optional)",
  "explanation": "string (explain why this category)",
  "confidence": number (0-1)
}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    return JSON.parse(content) as CategorizationResult;
  } catch (error) {
    logger.error('Error categorizing transaction:', error);
    throw error;
  }
}

export async function detectTaxOpportunities(
  transactions: TransactionData[],
  assessmentYear: string
): Promise<TaxOpportunity[]> {
  // Re-check at runtime
  if (process.env.USE_OLLAMA === 'true') {
    logger.info('✅ Using Ollama for tax opportunity detection');
    return ollama.detectTaxOpportunities(transactions, assessmentYear);
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a tax expert specializing in Indian tax law. Identify tax deduction opportunities under sections like:
- 80C: Life insurance, ELSS, PPF, NSC, tax-saving FDs, principal repayment of home loan
- 80D: Health insurance premiums
- 80G: Donations
- 24(b): Home loan interest
- HRA: House Rent Allowance
- 80E: Education loan interest
- 80TTA/80TTB: Interest on savings deposits

Return opportunities with evidence, confidence, and explanations.`,
        },
        {
          role: 'user',
          content: `Analyze these transactions for tax year ${assessmentYear}:
${JSON.stringify(transactions, null, 2)}

Return JSON object with "opportunities" array:
{
  "opportunities": [
    {
      "section": "80C",
      "title": "Life Insurance Premium",
      "potentialDeduction": number,
      "evidenceTransactionIds": ["id1", "id2"],
      "explanation": "string",
      "confidence": number (0-1),
      "uncertaintyNote": "string (optional)"
    }
  ]
}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const result = JSON.parse(content);
    // Handle both { opportunities: [...] } and direct array
    if (Array.isArray(result)) {
      return result;
    }
    return Array.isArray(result.opportunities) ? result.opportunities : [];
  } catch (error) {
    logger.error('Error detecting tax opportunities:', error);
    throw error;
  }
}

export async function generateInsights(
  transactions: TransactionData[],
  period: string,
  userPersona?: string
): Promise<Insight[]> {
  // Re-check at runtime
  if (process.env.USE_OLLAMA === 'true') {
    logger.info('✅ Using Ollama for insights generation');
    return ollama.generateInsights(transactions, period, userPersona);
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a financial advisor. Generate insights about spending patterns, anomalies, and tips.
Types: spending_velocity, anomaly, payment_tip, trend
Always include ELI5 (Explain Like I'm 5) explanations.`,
        },
        {
          role: 'user',
          content: `Analyze transactions for period ${period}:
${JSON.stringify(transactions, null, 2)}

${userPersona ? `User persona: ${userPersona}` : ''}

Return JSON object with "insights" array:
{
  "insights": [
    {
      "type": "spending_velocity" | "anomaly" | "payment_tip" | "trend",
      "summary": "string",
      "eli5": "string (simple explanation)",
      "data": {},
      "explanation": "string",
      "confidence": number (0-1)
    }
  ]
}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    const result = JSON.parse(content);
    // Handle both { insights: [...] } and direct array
    if (Array.isArray(result)) {
      return result;
    }
    return Array.isArray(result.insights) ? result.insights : [];
  } catch (error) {
    logger.error('Error generating insights:', error);
    throw error;
  }
}

export async function chatWithFinances(
  message: string,
  context: {
    transactions: TransactionData[];
    insights?: Insight[];
    taxNotes?: TaxOpportunity[];
  }
): Promise<string> {
  // Re-check at runtime
  if (process.env.USE_OLLAMA === 'true') {
    logger.info('✅ Using Ollama for chat');
    return ollama.chatWithFinances(message, context);
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a helpful financial assistant. Answer questions about the user's finances using the provided context.
Be clear, explain your reasoning, and cite specific transactions when relevant.`,
        },
        {
          role: 'user',
          content: `Context:
Transactions: ${JSON.stringify(context.transactions.slice(0, 50), null, 2)}
${context.insights ? `Insights: ${JSON.stringify(context.insights, null, 2)}` : ''}
${context.taxNotes ? `Tax Notes: ${JSON.stringify(context.taxNotes, null, 2)}` : ''}

User question: ${message}`,
        },
      ],
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';
  } catch (error) {
    logger.error('Error in chat:', error);
    throw error;
  }
}

export async function generateDisputeEmail(
  transaction: TransactionData,
  reason?: string
): Promise<{ subject: string; body: string; recipient?: string }> {
  // Re-check at runtime
  if (process.env.USE_OLLAMA === 'true') {
    logger.info('✅ Using Ollama for dispute email generation');
    return ollama.generateDisputeEmail(transaction, reason);
  }

  try {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional email writer. Draft dispute emails for financial transactions.
Be polite, clear, and include all relevant transaction details.`,
        },
        {
          role: 'user',
          content: `Draft a dispute email for this transaction:
${JSON.stringify(transaction, null, 2)}

${reason ? `Reason: ${reason}` : 'General dispute'}

Return JSON:
{
  "subject": "string",
  "body": "string (formatted email body)",
  "recipient": "string (optional, if can be inferred)"
}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from OpenAI');
    }

    return JSON.parse(content);
  } catch (error) {
    logger.error('Error generating dispute email:', error);
    throw error;
  }
}
