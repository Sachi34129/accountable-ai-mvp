import { prisma } from '../../db/prisma.js';
import type { Form16Extraction } from './form16Extract.js';

type Issue = {
  severity: 'info' | 'warning' | 'error';
  code: string;
  message: string;
  fieldRefs: string[];
};

function isPan(v: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v);
}

function isTan(v: string): boolean {
  return /^[A-Z]{4}[0-9]{5}[A-Z]$/.test(v);
}

function isYearRange(v: string): boolean {
  return /^\d{4}-\d{2}$/.test(v);
}

function ayMatchesFy(ay: string, fy: string): boolean {
  // FY 2023-24 => AY 2024-25
  const fyStart = parseInt(fy.slice(0, 4), 10);
  const ayStart = parseInt(ay.slice(0, 4), 10);
  return Number.isFinite(fyStart) && Number.isFinite(ayStart) && ayStart === fyStart + 1;
}

function approxEqual(a: number, b: number, tol = 500): boolean {
  return Math.abs(a - b) <= tol;
}

export async function validateForm16Extraction(params: {
  extractionRunId: string;
  extracted: Form16Extraction;
}): Promise<Issue[]> {
  const issues: Issue[] = [];
  const x = params.extracted;

  const pan = (x.document.pan || '').toUpperCase().trim();
  if (pan) {
    if (!isPan(pan)) {
      issues.push({
        severity: 'error',
        code: 'PAN_INVALID',
        message: 'PAN format is invalid in extracted data.',
        fieldRefs: ['document.pan'],
      });
    }
  } else {
    issues.push({
      severity: 'error',
      code: 'PAN_MISSING',
      message: 'PAN is missing in Form 16 extraction.',
      fieldRefs: ['document.pan'],
    });
  }

  const tan = (x.document.employerTan || '').toUpperCase().trim();
  if (tan && !isTan(tan)) {
    issues.push({
      severity: 'warning',
      code: 'TAN_INVALID',
      message: 'Employer TAN format looks invalid; please verify.',
      fieldRefs: ['document.employerTan'],
    });
  }

  const ay = x.document.assessmentYear;
  const fy = x.document.financialYear;
  if (ay) {
    if (!isYearRange(ay)) {
      issues.push({
        severity: 'error',
        code: 'AY_INVALID',
        message: 'Assessment Year format must be YYYY-YY.',
        fieldRefs: ['document.assessmentYear'],
      });
    }
  } else {
    issues.push({
      severity: 'warning',
      code: 'AY_MISSING',
      message: 'Assessment Year not found; computation will require explicit selection.',
      fieldRefs: ['document.assessmentYear'],
    });
  }

  if (fy) {
    if (!isYearRange(fy)) {
      issues.push({
        severity: 'warning',
        code: 'FY_INVALID',
        message: 'Financial Year format should be YYYY-YY.',
        fieldRefs: ['document.financialYear'],
      });
    }
  }

  if (ay && fy && isYearRange(ay) && isYearRange(fy) && !ayMatchesFy(ay, fy)) {
    issues.push({
      severity: 'warning',
      code: 'AY_FY_MISMATCH',
      message: 'Assessment Year does not match Financial Year (+1). Please verify the extracted years.',
      fieldRefs: ['document.assessmentYear', 'document.financialYear'],
    });
  }

  const gs = x.salary.grossSalary;
  const ex = x.salary.exemptionsTotal;
  const d = x.salary.deductionsChapterVIA;
  const ti = x.salary.taxableIncome;

  if (gs != null && ex != null && d != null && ti != null) {
    const computed = gs - ex - d;
    if (!approxEqual(computed, ti, 1000)) {
      issues.push({
        severity: 'warning',
        code: 'TOTALS_MISMATCH',
        message:
          'Taxable income does not reconcile to gross salary - exemptions - deductions (within tolerance). Please verify extracted totals.',
        fieldRefs: ['salary.grossSalary', 'salary.exemptionsTotal', 'salary.deductionsChapterVIA', 'salary.taxableIncome'],
      });
    }
  } else {
    issues.push({
      severity: 'info',
      code: 'TOTALS_INCOMPLETE',
      message:
        'Not all salary totals were extracted (gross/exemptions/deductions/taxable). Computation will be limited to available fields.',
      fieldRefs: ['salary.grossSalary', 'salary.exemptionsTotal', 'salary.deductionsChapterVIA', 'salary.taxableIncome'],
    });
  }

  // Persist issues (append-only per extraction run; clear previous for reruns of the same run id)
  await prisma.taxValidationIssue.deleteMany({ where: { extractionRunId: params.extractionRunId } });
  if (issues.length) {
    await prisma.taxValidationIssue.createMany({
      data: issues.map((i) => ({
        extractionRunId: params.extractionRunId,
        severity: i.severity,
        code: i.code,
        message: i.message,
        fieldRefsJson: i.fieldRefs as any,
      })),
    });
  }

  return issues;
}


