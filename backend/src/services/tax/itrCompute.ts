import { prisma } from '../../db/prisma.js';
import type { Form16Extraction } from './form16Extract.js';

export type ItrRegime = 'old' | 'new';

type SourceRef = { field: string; note?: string };

type LineItem = {
  code: string;
  label: string;
  amount: number;
  sourceRefs: SourceRef[];
};

function toNum(v: any): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function roundToNearest10(n: number): number {
  return Math.round(n / 10) * 10;
}

function computeSlabTax(params: { taxableIncome: number; regime: ItrRegime; assessmentYear: string }): number {
  // Conservative v1: implement common slabs for AY 2024-25+.
  // This is deterministic and versioned; changes require bumping rulesVersion.
  const ti = Math.max(0, params.taxableIncome);

  const slabs =
    params.regime === 'new'
      ? [
          { upTo: 300000, rate: 0 },
          { upTo: 600000, rate: 0.05 },
          { upTo: 900000, rate: 0.1 },
          { upTo: 1200000, rate: 0.15 },
          { upTo: 1500000, rate: 0.2 },
          { upTo: Infinity, rate: 0.3 },
        ]
      : [
          { upTo: 250000, rate: 0 },
          { upTo: 500000, rate: 0.05 },
          { upTo: 1000000, rate: 0.2 },
          { upTo: Infinity, rate: 0.3 },
        ];

  let tax = 0;
  let prev = 0;
  for (const s of slabs) {
    const upper = s.upTo;
    const amt = Math.max(0, Math.min(ti, upper) - prev);
    tax += amt * s.rate;
    prev = upper;
    if (ti <= upper) break;
  }

  // Rebate u/s 87A (deterministic). Keep explicit and versioned.
  if (params.regime === 'new') {
    // New regime rebate threshold commonly 7L (v1 assumption for AY 2024-25+).
    if (ti <= 700000) tax = 0;
  } else {
    if (ti <= 500000) tax = Math.max(0, tax - 12500);
  }

  // Health & education cess 4%
  const cess = tax * 0.04;
  const total = tax + cess;
  return roundToNearest10(total);
}

export async function computeItrFromLatestForm16(params: {
  userId: string;
  assessmentYear: string;
  regime: ItrRegime;
  taxDocumentId?: string | null;
}): Promise<{ runId: string; lineItems: LineItem[]; computed: any }> {
  const doc =
    (params.taxDocumentId
      ? await prisma.taxDocument.findFirst({ where: { id: params.taxDocumentId, userId: params.userId } })
      : null) ||
    (await prisma.taxDocument.findFirst({ where: { userId: params.userId, type: 'FORM16' }, orderBy: { uploadedAt: 'desc' } }));
  if (!doc) throw new Error('No Form 16 uploaded');

  const extractionRun = await prisma.taxExtractionRun.findFirst({
    where: { taxDocumentId: doc.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!extractionRun) throw new Error('Form 16 not extracted yet');

  const extracted = extractionRun.extractedJson as any as Form16Extraction;

  const taxableIncome =
    toNum(extracted?.salary?.taxableIncome) ??
    (toNum(extracted?.salary?.grossSalary) != null &&
    toNum(extracted?.salary?.exemptionsTotal) != null &&
    toNum(extracted?.salary?.deductionsChapterVIA) != null
      ? (toNum(extracted.salary.grossSalary)! - toNum(extracted.salary.exemptionsTotal)! - toNum(extracted.salary.deductionsChapterVIA)!)
      : null);

  const items: LineItem[] = [];
  const rulesVersion = 'itr-rules-v1';
  const schemaVersion = 'itr-draft-v1';

  if (toNum(extracted?.salary?.grossSalary) != null) {
    items.push({
      code: 'SALARY_GROSS',
      label: 'Gross Salary (as per Form 16)',
      amount: toNum(extracted.salary.grossSalary)!,
      sourceRefs: [{ field: 'salary.grossSalary' }],
    });
  }
  if (toNum(extracted?.salary?.exemptionsTotal) != null) {
    items.push({
      code: 'EXEMPTIONS_TOTAL',
      label: 'Total Exemptions (as per Form 16)',
      amount: toNum(extracted.salary.exemptionsTotal)!,
      sourceRefs: [{ field: 'salary.exemptionsTotal' }],
    });
  }
  if (toNum(extracted?.salary?.deductionsChapterVIA) != null) {
    items.push({
      code: 'DEDUCTIONS_CHAPTER_VIA',
      label: 'Deductions (Chapter VI-A) (as per Form 16)',
      amount: toNum(extracted.salary.deductionsChapterVIA)!,
      sourceRefs: [{ field: 'salary.deductionsChapterVIA' }],
    });
  }

  if (taxableIncome == null) {
    items.push({
      code: 'TAXABLE_INCOME_INCOMPLETE',
      label: 'Taxable Income (incomplete - missing fields)',
      amount: 0,
      sourceRefs: [{ field: 'salary.taxableIncome', note: 'Missing taxableIncome and/or components to compute it.' }],
    });
  } else {
    items.push({
      code: 'TAXABLE_INCOME',
      label: 'Taxable Income',
      amount: taxableIncome,
      sourceRefs: [{ field: 'salary.taxableIncome' }],
    });
  }

  const computedTax = taxableIncome != null ? computeSlabTax({ taxableIncome, regime: params.regime, assessmentYear: params.assessmentYear }) : 0;
  items.push({
    code: 'TAX_COMPUTED',
    label: 'Computed Tax (deterministic; incl cess; rounded to nearest 10)',
    amount: computedTax,
    sourceRefs: [{ field: 'salary.taxableIncome' }, { field: 'document.assessmentYear', note: 'Uses deterministic slab table for selected regime.' }],
  });

  const tds = toNum(extracted?.taxes?.tds);
  if (tds != null) {
    items.push({
      code: 'TDS',
      label: 'TDS Credit (as per Form 16)',
      amount: tds,
      sourceRefs: [{ field: 'taxes.tds' }],
    });
  }

  const netPayable = taxableIncome != null ? computedTax - (tds || 0) : 0;
  items.push({
    code: 'NET_PAYABLE_OR_REFUND',
    label: 'Net (Tax payable + / Refund -) (computed)',
    amount: netPayable,
    sourceRefs: [{ field: 'taxes.tds' }, { field: 'salary.taxableIncome' }],
  });

  const computed = {
    assessmentYear: params.assessmentYear,
    regime: params.regime,
    rulesVersion,
    schemaVersion,
    taxableIncome,
    computedTax,
    tds,
    netPayableOrRefund: netPayable,
  };

  const run = await prisma.iTRComputationRun.create({
    data: {
      userId: params.userId,
      extractionRunId: extractionRun.id,
      assessmentYear: params.assessmentYear,
      regime: params.regime,
      rulesVersion,
      schemaVersion,
      computedJson: computed as any,
      LineItems: {
        create: items.map((it) => ({
          code: it.code,
          label: it.label,
          amount: it.amount,
          sourceRefsJson: it.sourceRefs as any,
        })),
      },
    },
  });

  return { runId: run.id, lineItems: items, computed };
}


