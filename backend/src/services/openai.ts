import dotenv from 'dotenv';
dotenv.config(); // Load .env at the very top

import OpenAI from 'openai';
import { logger } from '../utils/logger.js';
import type { ExtractionResult, TransactionData, CategorizationResult, TaxOpportunity, Insight } from '../types/index.js';

// Legacy provider file. The app now uses Gemini for LLM tasks and OCR.Space for OCR.
logger.info('ℹ️ openai.ts loaded (legacy). Current LLM provider: Gemini');

const getOpenAIClient = () => {
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
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Extract all financial transactions from this document.\n\nReturn ONLY valid JSON with this structure:\n{\n  \"transactions\": [\n    {\n      \"date\": \"YYYY-MM-DD\",\n      \"amount\": number,\n      \"currency\": \"INR\",\n      \"description\": \"string\",\n      \"merchant\": \"string (optional)\",\n      \"direction\": \"income\" | \"expense\",\n      \"category\": \"string (optional)\",\n      \"subCategory\": \"string (optional)\",\n      \"isRecurring\": boolean,\n      \"labels\": [\"string\"],\n      \"confidence\": number (0-1)\n    }\n  ],\n  \"metadata\": {\n    \"documentType\": \"receipt\" | \"invoice\" | \"statement\" | \"other\",\n    \"extractedAt\": \"ISO timestamp\",\n    \"confidence\": number (0-1),\n    \"model\": \"gpt-4o\",\n    \"version\": \"1.0\"\n  }\n}`,
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
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No content returned from OpenAI');
  return JSON.parse(content) as ExtractionResult;
}

export async function ocrImageToText(params: { base64: string; mimeType: string }): Promise<string> {
  const { base64, mimeType } = params;
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `You are an OCR engine. Extract all readable text from the document image.\n\nReturn ONLY plain text. Preserve line breaks. Do not add commentary.`,
          },
          {
            type: 'image_url',
            image_url: { url: dataUrl },
          },
        ],
      },
    ],
    max_tokens: 4000,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error('No OCR text returned from OpenAI');
  return text.trim();
}

export async function extractTransactionsFromText(params: {
  text: string;
  sourceHint?: string;
}): Promise<ExtractionResult> {
  const { text, sourceHint } = params;
  const openai = getOpenAIClient();

  const prompt = `Extract all financial transactions from the following text${
    sourceHint ? ` (source: ${sourceHint})` : ''
  }.\n\nRules:\n- Return ONLY valid JSON.\n- Dates must be ISO format YYYY-MM-DD.\n- Amount must be a number (no commas).\n- direction must be \"income\" or \"expense\".\n\nReturn a JSON object with this structure:\n{\n  \"transactions\": [\n    {\n      \"date\": \"YYYY-MM-DD\",\n      \"amount\": number,\n      \"currency\": \"INR\",\n      \"description\": \"string\",\n      \"merchant\": \"string (optional)\",\n      \"direction\": \"income\" | \"expense\",\n      \"category\": \"string (optional)\",\n      \"subCategory\": \"string (optional)\",\n      \"isRecurring\": boolean,\n      \"labels\": [\"string\"],\n      \"confidence\": number (0-1)\n    }\n  ],\n  \"metadata\": {\n    \"documentType\": \"receipt\" | \"invoice\" | \"statement\" | \"other\",\n    \"extractedAt\": \"ISO timestamp\",\n    \"confidence\": number (0-1),\n    \"model\": \"gpt-4o\",\n    \"version\": \"1.0\"\n  }\n}\n\nTEXT:\n${text}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('No content returned from OpenAI');
  return JSON.parse(content) as ExtractionResult;
}

export async function categorizeTransaction(
  transaction: TransactionData,
  userPersona?: string
): Promise<CategorizationResult> {
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
