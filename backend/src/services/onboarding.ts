import { callHuggingFace } from './huggingface.js';
import { logger } from '../utils/logger.js';
import { OnboardingResult } from '../types/index.js';

/**
 * NEW HIRE ONBOARDING AGENT
 * Helps automate financial compliance and task tracking for new employees.
 */
export async function analyzeOnboardingDocs(text: string): Promise<OnboardingResult> {
    try {
        logger.info('Analyzing onboarding document with Hugging Face Agent');

        const prompt = `Analyze this onboarding text and extract:
1. Financial/Compliance tasks (e.g., bank details, tax forms (80C), 401k).
2. Overall compliance check findings.

Text:
${text.substring(0, 5000)}

Return JSON:
{
  "tasks": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "status": "pending",
      "deadline": "YYYY-MM-DD or null",
      "responsiblePerson": "string or null"
    }
  ],
  "complianceCheck": {
    "passed": boolean,
    "findings": ["string"],
    "recommendations": ["string"]
  }
}

Return ONLY valid JSON.`;

        // Using callHuggingFace directly to enforce Accountable AI prompt
        const response = await callHuggingFace(prompt);

        // Basic JSON extraction (similar to huggingface.ts)
        const jsonMatch = response.match(/(\{[\s\S]*\})/);
        if (!jsonMatch) throw new Error('No JSON found in response');

        return JSON.parse(jsonMatch[1]) as OnboardingResult;
    } catch (error) {
        logger.error('Error in onboarding analysis:', error);
        throw error;
    }
}
