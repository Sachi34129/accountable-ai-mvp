import { prisma } from '../../db/prisma.js';

const DEFAULT_CATEGORIES = [
  { code: 'FOOD_DINING', name: 'Food & Dining', ledgerType: 'expense' },
  { code: 'TRAVEL_TRANSPORT', name: 'Travel & Transport', ledgerType: 'expense' },
  { code: 'RENT', name: 'Rent', ledgerType: 'expense' },
  { code: 'UTILITIES', name: 'Utilities', ledgerType: 'expense' },
  // Income
  { code: 'SALARY_INCOME', name: 'Salary Income', ledgerType: 'income' },
  { code: 'BUSINESS_INCOME', name: 'Business Income', ledgerType: 'income' },
  { code: 'INTEREST_INCOME', name: 'Interest Income', ledgerType: 'income' },
  // Non-P&L / special
  { code: 'REFUND_REVERSAL', name: 'Refund / Reversal (non-income)', ledgerType: 'asset' },
  { code: 'INTERNAL_TRANSFER', name: 'Internal Transfer (own accounts)', ledgerType: 'asset' },
  { code: 'PERSONAL_TRANSFER', name: 'Personal Transfer (non-expense)', ledgerType: 'asset' },
  { code: 'LOAN_REPAYMENT', name: 'Loan Repayment (principal/EMI)', ledgerType: 'liability' },
  { code: 'TAX_PAYMENT', name: 'Taxes Paid', ledgerType: 'expense' },
  // Expenses
  { code: 'SUBSCRIPTION_EXPENSE', name: 'Subscriptions & SaaS', ledgerType: 'expense' },
  { code: 'BUSINESS_EXPENSE', name: 'Office / Business Expense', ledgerType: 'expense' },
  { code: 'CAPITAL_EXPENDITURE', name: 'Capital Expenditure', ledgerType: 'asset' },
];

export async function ensureDefaultCategories() {
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { code: c.code },
      update: { name: c.name, ledgerType: c.ledgerType },
      create: c,
    });
  }
}

// Minimal deterministic starter rules (explicit system rules). Users can add/override later.
export async function ensureSeedRulesForEntity(entityId: string) {
  const existingCount = await prisma.categorizationRule.count({ where: { entityId } });
  if (existingCount > 0) return;

  const food = await prisma.category.findUnique({ where: { code: 'FOOD_DINING' } });
  const travel = await prisma.category.findUnique({ where: { code: 'TRAVEL_TRANSPORT' } });
  const utilities = await prisma.category.findUnique({ where: { code: 'UTILITIES' } });
  const rent = await prisma.category.findUnique({ where: { code: 'RENT' } });
  const interest = await prisma.category.findUnique({ where: { code: 'INTEREST_INCOME' } });
  const tax = await prisma.category.findUnique({ where: { code: 'TAX_PAYMENT' } });

  // If categories are missing, do not seed rules.
  if (!food || !travel || !utilities || !rent) return;

  const rules = [
    {
      name: 'Swiggy/Zomato -> Food & Dining',
      priority: 10,
      matchers: { direction: 'outflow', descriptionRegex: '(swiggy|zomato|ubereats)' },
      categoryId: food.id,
      explanationTemplate: 'Matched food delivery merchant keyword in description.',
    },
    {
      name: 'Restaurants/Cafe -> Food & Dining',
      priority: 20,
      matchers: { direction: 'outflow', descriptionRegex: '(restaurant|cafe|coffee)' },
      categoryId: food.id,
      explanationTemplate: 'Matched restaurant/cafe keyword in description.',
    },
    {
      name: 'Uber/Ola/IRCTC -> Travel & Transport',
      priority: 20,
      matchers: { direction: 'outflow', descriptionRegex: '(uber|ola|irctc)' },
      categoryId: travel.id,
      explanationTemplate: 'Matched transport/rail merchant keyword in description.',
    },
    {
      name: 'Airtel/Jio/VI -> Utilities',
      priority: 20,
      matchers: { direction: 'outflow', descriptionRegex: '(airtel|jio|vodafone|vi\\b)' },
      categoryId: utilities.id,
      explanationTemplate: 'Matched telecom utility keyword in description.',
    },
    {
      name: 'Electricity/Water/Gas -> Utilities',
      priority: 30,
      matchers: { direction: 'outflow', descriptionRegex: '(electricity|power|water|gas)' },
      categoryId: utilities.id,
      explanationTemplate: 'Matched utility keyword in description.',
    },
    {
      name: 'Rent -> Rent',
      priority: 30,
      matchers: { direction: 'outflow', descriptionRegex: '\\brent\\b' },
      categoryId: rent.id,
      explanationTemplate: 'Matched rent keyword in description.',
    },
    ...(interest
      ? [
          {
            name: 'Bank interest -> Interest Income (keyword)',
            priority: 25,
            matchers: { direction: 'inflow', descriptionRegex: '\\b(interest|int\\b|intrst)\\b' },
            categoryId: interest.id,
            explanationTemplate: 'Matched bank interest keyword; still review if ambiguous.',
          },
        ]
      : []),
    ...(tax
      ? [
          {
            name: 'Tax payment -> Taxes Paid (keyword)',
            priority: 25,
            matchers: { direction: 'outflow', descriptionRegex: '\\b(income\\s*tax|it\\s*dept|gst|tds|challan)\\b' },
            categoryId: tax.id,
            explanationTemplate: 'Matched tax authority/challan keyword; still review if ambiguous.',
          },
        ]
      : []),
  ];

  for (const r of rules) {
    await prisma.categorizationRule.create({
      data: {
        entityId,
        name: r.name,
        enabled: true,
        priority: r.priority,
        matchers: r.matchers as any,
        categoryId: r.categoryId,
        explanationTemplate: r.explanationTemplate,
      },
    });
  }
}


