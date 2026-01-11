import dotenv from 'dotenv';
dotenv.config();

import type { ExtractionResult, TransactionData, Insight, TaxOpportunity } from '../types/index.js';

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set. Add GEMINI_API_KEY to backend/.env');
  return key;
}

function geminiModel(): string {
  // Use a stable model id supported by v1beta generateContent.
  // If you set GEMINI_MODEL, use values like: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash
  const raw = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  return raw.startsWith('models/') ? raw.slice('models/'.length) : raw;
}

type GeminiModel = {
  name?: string; // "models/..."
  displayName?: string;
  supportedGenerationMethods?: string[];
};

let cachedResolvedModel: string | null = null;

async function listModels(): Promise<GeminiModel[]> {
  const apiKey = getGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const resp = await fetch(url, { method: 'GET' });
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`Gemini ListModels error: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`);
  }
  const data: any = await resp.json();
  return (data?.models || []) as GeminiModel[];
}

async function resolveWorkingModel(preferred: string): Promise<string> {
  if (cachedResolvedModel) return cachedResolvedModel;

  const models = await listModels();
  const supportsGenerate = (m: GeminiModel) => (m.supportedGenerationMethods || []).includes('generateContent');

  const normalize = (name?: string) => (name || '').replace(/^models\//, '');
  const preferredNorm = normalize(preferred);

  const preferredMatch = models.find((m) => normalize(m.name) === preferredNorm && supportsGenerate(m));
  if (preferredMatch?.name) {
    cachedResolvedModel = normalize(preferredMatch.name);
    return cachedResolvedModel;
  }

  // Pick a sane default: first gemini* model that supports generateContent.
  const fallback =
    models.find((m) => supportsGenerate(m) && normalize(m.name).startsWith('gemini-')) ||
    models.find((m) => supportsGenerate(m));

  if (!fallback?.name) {
    throw new Error(
      `Gemini: no models returned by ListModels support generateContent. Check your GEMINI_API_KEY permissions.`
    );
  }

  cachedResolvedModel = normalize(fallback.name);
  return cachedResolvedModel;
}

async function geminiGenerateText(params: {
  prompt: string;
  responseMimeType?: 'text/plain' | 'application/json';
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  const { prompt, responseMimeType = 'text/plain', temperature = 0.2, maxOutputTokens = 2048 } = params;
  const apiKey = getGeminiApiKey();
  const model = geminiModel();

  const urlForModel = (m: string) =>
    `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;

  const tryOnce = async (m: string) => {
    const resp = await fetch(urlForModel(m), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          responseMimeType,
        },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`Gemini API error: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`);
    }

    const data: any = await resp.json();
    const out = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
    if (!out) throw new Error('Empty response from Gemini');
    return out;
  };

  // Some aliases like *-latest aren’t supported on v1beta generateContent. Retry with a stable fallback.
  try {
    return await tryOnce(model);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (msg.includes('is not found') || msg.includes('NOT_FOUND')) {
      // Resolve a working model for this key via ListModels.
      const resolved = await resolveWorkingModel(model);
      if (resolved !== model) return await tryOnce(resolved);
    }
    throw e;
  }
}

function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (fenced?.[1]) return fenced[1];
  const raw = text.match(/(\{[\s\S]*\})/);
  if (raw?.[1]) return raw[1];
  return text;
}

export async function generateJsonWithGemini(params: {
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<any> {
  const out = await geminiGenerateText({
    prompt: params.prompt,
    responseMimeType: 'application/json',
    temperature: params.temperature ?? 0.2,
    maxOutputTokens: params.maxOutputTokens ?? 2048,
  });
  const jsonStr = extractJsonObject(out);
  return JSON.parse(jsonStr);
}

export async function extractTransactionsFromTextGemini(params: {
  text: string;
  sourceHint?: string;
}): Promise<ExtractionResult> {
  const { text, sourceHint } = params;

  const prompt = `Extract all financial transactions from the following text${
    sourceHint ? ` (source: ${sourceHint})` : ''
  }.

Return ONLY valid JSON with this structure:
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
    "model": "${geminiModel()}",
    "version": "1.0"
  }
}

TEXT:
${text}`;

  const out = await geminiGenerateText({ prompt, responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 4096 });
  const jsonStr = extractJsonObject(out);
  return JSON.parse(jsonStr) as ExtractionResult;
}

export async function chatWithFinancesGemini(
  message: string,
  context: {
    transactions: TransactionData[];
    insights?: Insight[];
    taxNotes?: TaxOpportunity[];
  }
): Promise<string> {
  const prompt = `You are a helpful financial assistant. Answer questions about the user's finances using the provided context.
Be clear, explain your reasoning, and cite specific transactions when relevant.

Context:
Transactions: ${JSON.stringify(context.transactions.slice(0, 50), null, 2)}
${context.insights ? `Insights: ${JSON.stringify(context.insights, null, 2)}` : ''}
${context.taxNotes ? `Tax Notes: ${JSON.stringify(context.taxNotes, null, 2)}` : ''}

User question: ${message}`;

  return await geminiGenerateText({ prompt, responseMimeType: 'text/plain', temperature: 0.5, maxOutputTokens: 1200 });
}


