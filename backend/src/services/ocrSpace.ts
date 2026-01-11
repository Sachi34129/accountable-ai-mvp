import { logger } from '../utils/logger.js';

type OcrSpaceParsedResponse = {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[] | null;
  ParsedResults?: Array<{
    ParsedText?: string;
    ErrorMessage?: string;
  }>;
};

function requireOcrApiKey(): string {
  const key = process.env.OCR_API_KEY;
  if (!key) {
    throw new Error('OCR_API_KEY is not set. Add OCR_API_KEY to backend/.env');
  }
  return key;
}

function inferFiletypeAndExtension(mimeType: string): { filetype: string; ext: string } {
  switch (mimeType) {
    case 'application/pdf':
      return { filetype: 'PDF', ext: 'pdf' };
    case 'image/png':
      return { filetype: 'PNG', ext: 'png' };
    case 'image/jpeg':
    case 'image/jpg':
      return { filetype: 'JPG', ext: 'jpg' };
    case 'image/webp':
      // OCR.Space supports WEBP in many cases, but if it fails we can later convert.
      return { filetype: 'WEBP', ext: 'webp' };
    default:
      return { filetype: 'PDF', ext: 'pdf' }; // safe fallback for many docs
  }
}

export async function ocrSpaceExtractText(params: {
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
  language?: string; // default: eng
}): Promise<string> {
  const { fileBuffer, filename, mimeType, language = 'eng' } = params;
  const apiKey = requireOcrApiKey();
  const { filetype, ext } = inferFiletypeAndExtension(mimeType);

  const form = new FormData();
  form.append('apikey', apiKey);
  form.append('language', language);
  form.append('isOverlayRequired', 'false');
  form.append('iscreatesearchablepdf', 'false');
  form.append('OCREngine', '2');
  // OCR.Space sometimes can’t infer file type from a blob; provide it explicitly.
  form.append('filetype', filetype);

  const blob = new Blob([fileBuffer], { type: mimeType });
  const safeName = filename.includes('.') ? filename : `${filename}.${ext}`;
  form.append('file', blob, safeName);

  const resp = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`OCR.Space error: ${resp.status} ${resp.statusText}${text ? ` - ${text}` : ''}`);
  }

  const data = (await resp.json()) as OcrSpaceParsedResponse;
  if (data.IsErroredOnProcessing || (data.OCRExitCode && data.OCRExitCode !== 1)) {
    const errMsg =
      typeof data.ErrorMessage === 'string'
        ? data.ErrorMessage
        : Array.isArray(data.ErrorMessage)
          ? data.ErrorMessage.join('; ')
          : data.ParsedResults?.[0]?.ErrorMessage;
    throw new Error(`OCR.Space processing failed${errMsg ? `: ${errMsg}` : ''}`);
  }

  const combined = (data.ParsedResults || [])
    .map((r) => (r.ParsedText || '').trim())
    .filter(Boolean)
    .join('\n\n');

  logger.info(`OCR.Space extracted text length: ${combined.length}`);
  return combined;
}


