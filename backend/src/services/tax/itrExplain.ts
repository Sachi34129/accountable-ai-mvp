import { generateJsonWithGemini } from '../gemini.js';

export async function explainItrIssues(params: {
  issues: Array<{ severity: string; code: string; message: string }>;
  context: { assessmentYear: string; regime: string };
}): Promise<{ summary: string; nextSteps: string[] }> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      summary: 'Explanations are unavailable because GEMINI_API_KEY is not configured.',
      nextSteps: [],
    };
  }

  const prompt = `You are a CA assistant. Explain tax readiness issues clearly without inventing any numbers.
Rules:
- Do not compute tax.
- Do not change values.
- Provide actionable next steps.

Context:
${JSON.stringify(params.context, null, 2)}

Issues:
${JSON.stringify(params.issues, null, 2)}

Return ONLY JSON:
{
  "summary": "string",
  "nextSteps": ["string"]
}`;

  const out = await generateJsonWithGemini({ prompt, temperature: 0.2, maxOutputTokens: 512 });
  return {
    summary: String(out?.summary || 'Review the listed issues and provide missing documents/fields.'),
    nextSteps: Array.isArray(out?.nextSteps) ? out.nextSteps.map((s: any) => String(s)) : [],
  };
}

export async function explainItrWorksheet(params: {
  lineItems: Array<{ code: string; label: string; amount: number; sourceRefs: any }>;
  context: { assessmentYear: string; regime: string; rulesVersion?: string };
}): Promise<{ summary: string; highlights: string[]; cautions: string[] }> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      summary: 'Explanations are unavailable because GEMINI_API_KEY is not configured.',
      highlights: [],
      cautions: [],
    };
  }

  const prompt = `You are a CA assistant. Explain an ITR worksheet in plain language.\nRules:\n- Do NOT compute or modify any numbers.\n- Use only the provided line items.\n- If a line item is incomplete (amount=0 with code containing INCOMPLETE), explain what is missing.\n\nContext:\n${JSON.stringify(params.context, null, 2)}\n\nWorksheet line items:\n${JSON.stringify(params.lineItems, null, 2)}\n\nReturn ONLY JSON:\n{\n  \"summary\": \"string\",\n  \"highlights\": [\"string\"],\n  \"cautions\": [\"string\"]\n}`;

  const out = await generateJsonWithGemini({ prompt, temperature: 0.2, maxOutputTokens: 768 });
  return {
    summary: String(out?.summary || 'Worksheet explanation'),
    highlights: Array.isArray(out?.highlights) ? out.highlights.map((s: any) => String(s)) : [],
    cautions: Array.isArray(out?.cautions) ? out.cautions.map((s: any) => String(s)) : [],
  };
}


