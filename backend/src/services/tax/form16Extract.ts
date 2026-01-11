import crypto from 'crypto';
import { prisma } from '../../db/prisma.js';
import { extractKeyFromS3Url, getFileFromS3 } from '../storage.js';
import { ocrSpaceExtractText } from '../ocrSpace.js';
import { generateJsonWithGemini } from '../gemini.js';

export type Form16Extraction = {
  document: {
    type: 'FORM16';
    assessmentYear: string | null; // e.g. "2024-25"
    financialYear: string | null; // e.g. "2023-24"
    pan: string | null;
    employeeName: string | null;
    employerName: string | null;
    employerTan: string | null;
  };
  salary: {
    grossSalary: number | null;
    exemptionsTotal: number | null;
    deductionsChapterVIA: number | null;
    taxableIncome: number | null;
  };
  taxes: {
    tds: number | null;
    totalTax: number | null;
  };
  deductions: Record<string, number | null>; // e.g. {"80C": 150000}
  notes: {
    missingFields: string[];
  };
};

function sha256Hex(input: string | Buffer): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function flattenJson(obj: any, prefix = ''): Array<{ key: string; value: any }> {
  if (obj === null || obj === undefined) return [{ key: prefix, value: obj }];
  if (Array.isArray(obj)) return [{ key: prefix, value: obj }];
  if (typeof obj !== 'object') return [{ key: prefix, value: obj }];

  const out: Array<{ key: string; value: any }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenJson(v, next));
    else out.push({ key: next, value: v });
  }
  return out;
}

export async function runForm16Extraction(params: {
  userId: string;
  taxDocumentId: string;
}): Promise<{ extractionRunId: string; extracted: Form16Extraction; ocrTextHash: string }> {
  const doc = await prisma.taxDocument.findFirst({ where: { id: params.taxDocumentId, userId: params.userId } });
  if (!doc) throw new Error('TaxDocument not found');

  const key = extractKeyFromS3Url(doc.storageUri);
  const fileBuffer = await getFileFromS3(key);

  const ocrText = await ocrSpaceExtractText({
    fileBuffer,
    filename: doc.originalName,
    mimeType: doc.mimeType,
  });
  const ocrTextHash = sha256Hex(ocrText);

  const prompt = `You are an extraction assistant for Indian tax documents.

Document: Form 16 (TDS certificate for salary).

ABSOLUTE CONSTRAINTS:
- Do not guess. If a value is not explicitly present, output null and add its key to notes.missingFields.
- Output ONLY valid JSON matching the exact schema below.
- All numbers must be plain numbers (no commas, no currency symbols).

JSON schema to return:
{
  "document": {
    "type": "FORM16",
    "assessmentYear": "YYYY-YY or null",
    "financialYear": "YYYY-YY or null",
    "pan": "string or null",
    "employeeName": "string or null",
    "employerName": "string or null",
    "employerTan": "string or null"
  },
  "salary": {
    "grossSalary": number or null,
    "exemptionsTotal": number or null,
    "deductionsChapterVIA": number or null,
    "taxableIncome": number or null
  },
  "taxes": {
    "tds": number or null,
    "totalTax": number or null
  },
  "deductions": {
    "80C": number or null,
    "80D": number or null,
    "80CCD(1B)": number or null,
    "80E": number or null,
    "80G": number or null
  },
  "notes": {
    "missingFields": ["string"]
  }
}

TEXT (OCR):
${ocrText}`;

  const extracted = (await generateJsonWithGemini({ prompt, temperature: 0.1, maxOutputTokens: 2048 })) as Form16Extraction;

  const run = await prisma.taxExtractionRun.create({
    data: {
      taxDocumentId: doc.id,
      model: 'gemini',
      version: 'form16-extract-v1',
      rawOcrTextHash: ocrTextHash,
      extractedJson: extracted as any,
    },
  });

  const fields = flattenJson(extracted).filter((f) => f.key);
  if (fields.length) {
    await prisma.taxField.createMany({
      data: fields.map((f) => ({
        extractionRunId: run.id,
        key: f.key,
        valueJson: f.value as any,
        sourcePage: null,
        sourceTextSnippet: null,
        confidence: null,
      })),
    });
  }

  await prisma.taxDocument.update({ where: { id: doc.id }, data: { status: 'extracted' } });

  return { extractionRunId: run.id, extracted, ocrTextHash };
}


