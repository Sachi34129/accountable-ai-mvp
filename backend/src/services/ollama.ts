import dotenv from 'dotenv';
dotenv.config(); // Ensure .env is loaded

import { logger } from '../utils/logger.js';
import type { ExtractionResult, TransactionData, CategorizationResult, TaxOpportunity, Insight } from '../types/index.js';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llava:latest';
const TEXT_MODEL = process.env.OLLAMA_TEXT_MODEL || 'llama3:latest';

// Log configuration on module load
logger.info(`Ollama service initialized: ${OLLAMA_BASE_URL}, Vision: ${VISION_MODEL}, Text: ${TEXT_MODEL}`);

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[]; // Base64 images for vision models
}

interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  format?: 'json';
  options?: {
    temperature?: number;
  };
}

interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

// Verify model exists (lightweight check)
async function ensureModelLoaded(model: string): Promise<void> {
  try {
    // Just verify Ollama can see the model - don't actually load it
    // The actual loading will happen on first use
    const tagsResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (tagsResponse.ok) {
      const tags = await tagsResponse.json();
      const modelExists = tags.models?.some((m: any) => m.name === model || m.name.startsWith(model.split(':')[0]));
      if (!modelExists) {
        logger.warn(`Model ${model} not found in Ollama. Available models: ${tags.models?.map((m: any) => m.name).join(', ') || 'none'}`);
      } else {
        logger.debug(`Model ${model} is available`);
      }
    }
  } catch (error) {
    logger.warn(`Model check failed (this is usually OK): ${error}`);
  }
}

async function callOllama(request: OllamaChatRequest, retries = 3): Promise<string> {
  try {
    // Verify Ollama is accessible with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    let healthCheck;
    try {
      healthCheck = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Ollama connection timeout. Make sure Ollama is running: ollama serve`);
      }
      throw new Error(`Ollama is not accessible at ${OLLAMA_BASE_URL}. Make sure Ollama is running: ollama serve`);
    }
    
    if (!healthCheck || !healthCheck.ok) {
      throw new Error(`Ollama is not accessible at ${OLLAMA_BASE_URL}. Make sure Ollama is running: ollama serve`);
    }

    // Ensure model is loaded before making the request
    await ensureModelLoaded(request.model);

    logger.info(`Calling Ollama API with model: ${request.model} (attempt ${4 - retries}/3)`);
    
    // Add timeout to the actual API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for AI calls
    
    let response;
    try {
      response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: false,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Ollama API call timed out after 2 minutes. The model might be too slow or overloaded.`);
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `Ollama API error: ${response.status} - ${errorText}`;
      
      // If it's a 500 error and we have retries left, retry with exponential backoff
      if (response.status === 500 && retries > 0) {
        const waitTime = Math.pow(2, 3 - retries) * 1000; // 1s, 2s, 4s
        logger.warn(`${errorMessage}. Retrying in ${waitTime}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callOllama(request, retries - 1);
      }
      
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    const data: OllamaChatResponse = await response.json();
    return data.message.content;
  } catch (error) {
    // Retry on network errors or if we have retries left
    if (retries > 0 && (error instanceof TypeError || error instanceof Error)) {
      const waitTime = Math.pow(2, 3 - retries) * 1000;
      logger.warn(`Error calling Ollama: ${error}. Retrying in ${waitTime}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return callOllama(request, retries - 1);
    }
    
    logger.error('Error calling Ollama:', error);
    throw error;
  }
}

export async function extractFromDocument(
  imageUrl: string,
  mimeType: string
): Promise<ExtractionResult> {
  try {
    logger.info(`Extracting from document using Ollama model: ${VISION_MODEL}`);
    
    // Extract base64 from data URL if needed
    let base64Image = imageUrl;
    if (imageUrl.startsWith('data:')) {
      const base64Match = imageUrl.match(/base64,(.+)/);
      if (base64Match) {
        base64Image = base64Match[1];
      }
    }
    
    // Check image size - if too large, it might cause memory issues
    const imageSizeMB = (base64Image.length * 3) / 4 / 1024 / 1024;
    logger.info(`Image prepared, base64 length: ${base64Image.length} characters (~${imageSizeMB.toFixed(2)} MB)`);
    
    if (imageSizeMB > 10) {
      logger.warn(`Image is large (${imageSizeMB.toFixed(2)} MB). This may cause memory issues. Consider resizing.`);
    }

    const prompt = `Extract all financial transactions from this document. Return a JSON object with this structure:
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
    "model": "${VISION_MODEL}",
    "version": "1.0"
  }
}

Be thorough and extract all visible transactions. Return ONLY valid JSON, no markdown formatting.`;

    const content = await callOllama({
      model: VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
          images: [base64Image],
        },
      ],
      format: 'json',
      options: {
        temperature: 0.3,
        num_predict: 2048, // Limit output length to prevent memory issues
      } as any, // Ollama options format
    });

    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    
    let result: ExtractionResult;
    try {
      result = JSON.parse(jsonStr) as ExtractionResult;
    } catch (parseError) {
      logger.error(`Failed to parse JSON response: ${jsonStr.substring(0, 500)}...`);
      // Return a minimal valid result instead of failing completely
      result = {
        transactions: [],
        metadata: {
          documentType: 'other',
          extractedAt: new Date().toISOString(),
          confidence: 0,
          model: VISION_MODEL,
          version: '1.0',
        },
      };
      logger.warn('Returning empty extraction result due to parse error');
    }

    return result;
  } catch (error) {
    logger.error('Error extracting from document with Ollama:', error);
    
    // If it's a resource/memory error, provide helpful guidance
    if (error instanceof Error && error.message.includes('resource limitations')) {
      logger.error('Ollama model crashed due to resource limitations. Try:');
      logger.error('1. Close other applications to free up RAM');
      logger.error('2. Use a smaller vision model: export OLLAMA_VISION_MODEL=llava:7b');
      logger.error('3. Reduce image size before uploading');
      logger.error('4. Check Ollama logs: ollama logs');
    }
    
    throw error;
  }
}

export async function categorizeTransaction(
  transaction: TransactionData,
  userPersona?: string
): Promise<CategorizationResult> {
  try {
    const prompt = `You are a financial categorization expert. Categorize transactions into standard categories like:
- Income: salary, freelance, investment_return, other_income
- Expense: food_dining, groceries, transportation, utilities, entertainment, shopping, healthcare, education, subscription, fees, other
- Investment: mutual_fund, stocks, bonds, fixed_deposit, other
- Subscription: streaming, software, gym, other
- Fees: bank_fees, transaction_fees, penalty, other

Categorize this transaction:
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
}

Return ONLY valid JSON, no markdown formatting.`;

    const content = await callOllama({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      format: 'json',
      options: {
        temperature: 0.3,
      },
    });

    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonStr) as CategorizationResult;
  } catch (error) {
    logger.error('Error categorizing transaction with Ollama:', error);
    throw error;
  }
}

export async function detectTaxOpportunities(
  transactions: TransactionData[],
  assessmentYear: string
): Promise<TaxOpportunity[]> {
  try {
    const prompt = `You are a tax expert specializing in Indian tax law. Identify tax deduction opportunities under sections like:
- 80C: Life insurance, ELSS, PPF, NSC, tax-saving FDs, principal repayment of home loan
- 80D: Health insurance premiums
- 80G: Donations
- 24(b): Home loan interest
- HRA: House Rent Allowance
- 80E: Education loan interest
- 80TTA/80TTB: Interest on savings deposits

Analyze these transactions for tax year ${assessmentYear}:
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
}

Return ONLY valid JSON, no markdown formatting.`;

    const content = await callOllama({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      format: 'json',
      options: {
        temperature: 0.2,
      },
    });

    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const result = JSON.parse(jsonStr);
    
    // Handle both { opportunities: [...] } and direct array
    if (Array.isArray(result)) {
      return result;
    }
    return Array.isArray(result.opportunities) ? result.opportunities : [];
  } catch (error) {
    logger.error('Error detecting tax opportunities with Ollama:', error);
    throw error;
  }
}

export async function generateInsights(
  transactions: TransactionData[],
  period: string,
  userPersona?: string
): Promise<Insight[]> {
  try {
    const prompt = `You are a financial advisor. Generate insights about spending patterns, anomalies, and tips.
Types: spending_velocity, anomaly, payment_tip, trend
Always include ELI5 (Explain Like I'm 5) explanations.

Analyze transactions for period ${period}:
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
}

Return ONLY valid JSON, no markdown formatting.`;

    const content = await callOllama({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      format: 'json',
      options: {
        temperature: 0.5,
      },
    });

    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    const result = JSON.parse(jsonStr);
    
    // Handle both { insights: [...] } and direct array
    if (Array.isArray(result)) {
      return result;
    }
    return Array.isArray(result.insights) ? result.insights : [];
  } catch (error) {
    logger.error('Error generating insights with Ollama:', error);
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
    const prompt = `You are a helpful financial assistant. Answer questions about the user's finances using the provided context.
Be clear, explain your reasoning, and cite specific transactions when relevant.

Context:
Transactions: ${JSON.stringify(context.transactions.slice(0, 50), null, 2)}
${context.insights ? `Insights: ${JSON.stringify(context.insights, null, 2)}` : ''}
${context.taxNotes ? `Tax Notes: ${JSON.stringify(context.taxNotes, null, 2)}` : ''}

User question: ${message}`;

    const content = await callOllama({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      options: {
        temperature: 0.7,
      },
    });

    return content || 'I apologize, but I could not generate a response.';
  } catch (error) {
    logger.error('Error in chat with Ollama:', error);
    throw error;
  }
}

export async function generateDisputeEmail(
  transaction: TransactionData,
  reason?: string
): Promise<{ subject: string; body: string; recipient?: string }> {
  try {
    const prompt = `You are a professional email writer. Draft dispute emails for financial transactions.
Be polite, clear, and include all relevant transaction details.

Draft a dispute email for this transaction:
${JSON.stringify(transaction, null, 2)}

${reason ? `Reason: ${reason}` : 'General dispute'}

Return JSON:
{
  "subject": "string",
  "body": "string (formatted email body)",
  "recipient": "string (optional, if can be inferred)"
}

Return ONLY valid JSON, no markdown formatting.`;

    const content = await callOllama({
      model: TEXT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      format: 'json',
      options: {
        temperature: 0.5,
      },
    });

    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonStr);
  } catch (error) {
    logger.error('Error generating dispute email with Ollama:', error);
    throw error;
  }
}

