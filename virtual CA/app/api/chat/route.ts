import { type NextRequest, NextResponse } from "next/server"

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  source: string
}

interface TaxDeduction {
  section: string
  name: string
  currentAmount: number
  maxLimit: number
  description: string
}

interface Document {
  id: string
  name: string
  type: string
  status: string
  insights?: string[]
}

interface ChatRequest {
  message: string
  eli5Mode: boolean
  context?: {
    transactions?: Transaction[]
    taxDeductions?: TaxDeduction[]
    documents?: Document[]
    accounts?: { name: string; balance: number; type: string }[]
    insights?: { title: string; description: string; type: string }[]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const response = generateIntelligentResponse(body)

    return NextResponse.json({
      success: true,
      response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Chat error:", error)
    return NextResponse.json({
      success: true,
      response: "I encountered an error. Please try asking your question again.",
      timestamp: new Date().toISOString(),
    })
  }
}

function generateIntelligentResponse(body: ChatRequest): string {
  const { message, eli5Mode, context } = body
  const lower = message.toLowerCase()

  // Calculate financial metrics from context
  const metrics = calculateMetrics(context)

  // Tax-related questions
  if (
    lower.includes("tax") ||
    lower.includes("80c") ||
    lower.includes("80d") ||
    lower.includes("deduction") ||
    lower.includes("save")
  ) {
    return generateTaxResponse(eli5Mode, metrics, context)
  }

  // Spending analysis
  if (lower.includes("spend") || lower.includes("expense") || lower.includes("where") || lower.includes("money go")) {
    return generateSpendingResponse(eli5Mode, metrics)
  }

  // Income questions
  if (lower.includes("income") || lower.includes("earn") || lower.includes("salary")) {
    return generateIncomeResponse(eli5Mode, metrics)
  }

  // Savings questions
  if (lower.includes("saving") || lower.includes("save money") || lower.includes("how much")) {
    return generateSavingsResponse(eli5Mode, metrics)
  }

  // Bank charges
  if (lower.includes("bank") || lower.includes("charge") || lower.includes("fee")) {
    return generateBankChargesResponse(eli5Mode, metrics)
  }

  // Investment questions
  if (lower.includes("invest") || lower.includes("mutual fund") || lower.includes("sip") || lower.includes("ppf")) {
    return generateInvestmentResponse(eli5Mode, metrics)
  }

  // Insights from documents
  if (
    lower.includes("document") ||
    lower.includes("statement") ||
    lower.includes("upload") ||
    lower.includes("analyze")
  ) {
    return generateDocumentResponse(eli5Mode, context)
  }

  // Summary request
  if (lower.includes("summary") || lower.includes("overview") || lower.includes("financial health")) {
    return generateSummaryResponse(eli5Mode, metrics)
  }

  // Default helpful response
  return generateDefaultResponse(eli5Mode, metrics)
}

function calculateMetrics(context: ChatRequest["context"]) {
  const transactions = context?.transactions || []
  const taxDeductions = context?.taxDeductions || []

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const savings = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (savings / totalIncome) * 100 : 0

  // Category breakdown
  const categoryTotals: Record<string, number> = {}
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount
    })

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  // Tax deduction calculations
  const total80CUsed = taxDeductions.find((d) => d.section === "80C")?.currentAmount || 0
  const total80DUsed = taxDeductions.find((d) => d.section === "80D")?.currentAmount || 0
  const remaining80C = 150000 - total80CUsed
  const remaining80D = 50000 - total80DUsed

  return {
    totalIncome,
    totalExpenses,
    savings,
    savingsRate,
    categoryTotals,
    sortedCategories,
    total80CUsed,
    total80DUsed,
    remaining80C,
    remaining80D,
    transactionCount: transactions.length,
    hasData: transactions.length > 0,
  }
}

function generateTaxResponse(
  eli5Mode: boolean,
  metrics: ReturnType<typeof calculateMetrics>,
  context: ChatRequest["context"],
): string {
  if (eli5Mode) {
    const potentialSavings = Math.round((metrics.remaining80C * 0.3 + metrics.remaining80D * 0.3) / 1000) * 1000
    return `Great question! Let me explain taxes like you're 5 years old:

Imagine the government is like a big piggy bank that everyone puts money into. But they give you special "coupons" to keep some money!

**Your Tax Coupons:**
📦 **Section 80C** (Big Savings Box): You've put ₹${metrics.total80CUsed.toLocaleString("en-IN")} in this box. You can still add ₹${metrics.remaining80C.toLocaleString("en-IN")} more!

🏥 **Section 80D** (Health Shield): You've used ₹${metrics.total80DUsed.toLocaleString("en-IN")} for health insurance. Space for ₹${metrics.remaining80D.toLocaleString("en-IN")} more!

**Magic Tip:** If you fill up your coupons, you could save around ₹${potentialSavings.toLocaleString("en-IN")} in taxes! That's like getting free money back! 🎉

Want me to explain how to fill these coupons?`
  }

  const taxSummary =
    context?.taxDeductions
      ?.map(
        (d) =>
          `• **${d.section} (${d.name})**: ₹${d.currentAmount.toLocaleString("en-IN")} / ₹${d.maxLimit.toLocaleString("en-IN")} (${Math.round((d.currentAmount / d.maxLimit) * 100)}% utilized)`,
      )
      .join("\n") || "• No tax deduction data available"

  const potentialSavings = Math.round(metrics.remaining80C * 0.3 + metrics.remaining80D * 0.3)

  return `**Tax Deduction Analysis**

**Current Utilization:**
${taxSummary}

**Optimization Opportunities:**
${metrics.remaining80C > 0 ? `• Section 80C: Invest ₹${metrics.remaining80C.toLocaleString("en-IN")} more in ELSS/PPF/NPS to maximize deduction` : "• Section 80C: Fully utilized ✓"}
${metrics.remaining80D > 0 ? `• Section 80D: Consider health insurance premium of ₹${metrics.remaining80D.toLocaleString("en-IN")} for additional deduction` : "• Section 80D: Fully utilized ✓"}

**Potential Tax Savings:** Up to ₹${potentialSavings.toLocaleString("en-IN")} (at 30% tax bracket)

Would you like specific investment recommendations to maximize your deductions?`
}

function generateSpendingResponse(eli5Mode: boolean, metrics: ReturnType<typeof calculateMetrics>): string {
  if (!metrics.hasData) {
    return eli5Mode
      ? "I don't have your spending data yet! Upload your bank statement and I'll show you where your pocket money is going! 💰"
      : "I don't have transaction data to analyze. Please upload your bank statement to see your spending breakdown."
  }

  const topCategories = metrics.sortedCategories.slice(0, 5)

  if (eli5Mode) {
    const categoryEmojis: Record<string, string> = {
      "Food & Dining": "🍕",
      Shopping: "🛍️",
      Entertainment: "🎮",
      Utilities: "💡",
      Transportation: "🚗",
      Insurance: "🛡️",
      Investment: "📈",
      Healthcare: "💊",
      Housing: "🏠",
      "Bank Charges": "🏦",
      Other: "📦",
    }

    const breakdown = topCategories
      .map(([cat, amt], i) => `${i + 1}. ${categoryEmojis[cat] || "📦"} **${cat}**: ₹${amt.toLocaleString("en-IN")}`)
      .join("\n")

    return `Let's look at where your money went! Think of it like sorting your toys by type:

**Your Top Spending:**
${breakdown}

**Total Expenses:** ₹${metrics.totalExpenses.toLocaleString("en-IN")}

${topCategories[0] ? `Your biggest spending is on ${topCategories[0][0]} - that's where most of your allowance goes!` : ""}

Want me to suggest ways to save more?`
  }

  const breakdown = topCategories
    .map(([cat, amt], i) => {
      const pct = metrics.totalExpenses > 0 ? Math.round((amt / metrics.totalExpenses) * 100) : 0
      return `${i + 1}. **${cat}**: ₹${amt.toLocaleString("en-IN")} (${pct}%)`
    })
    .join("\n")

  return `**Spending Analysis**

**Top Categories:**
${breakdown}

**Total Expenses:** ₹${metrics.totalExpenses.toLocaleString("en-IN")}
**Savings Rate:** ${metrics.savingsRate.toFixed(1)}%

**Recommendations:**
${
  topCategories[0] && topCategories[0][1] > metrics.totalExpenses * 0.3
    ? `• ${topCategories[0][0]} is ${Math.round((topCategories[0][1] / metrics.totalExpenses) * 100)}% of spending - consider setting a budget limit`
    : "• Your spending is well-distributed across categories"
}
${
  metrics.categoryTotals["Entertainment"] && metrics.categoryTotals["Entertainment"] > 5000
    ? "• Entertainment spending is high - review subscriptions"
    : ""
}
${
  metrics.categoryTotals["Bank Charges"]
    ? `• Bank charges of ₹${metrics.categoryTotals["Bank Charges"].toLocaleString("en-IN")} - consider switching to a zero-fee account`
    : ""
}

Would you like detailed analysis on any specific category?`
}

function generateIncomeResponse(eli5Mode: boolean, metrics: ReturnType<typeof calculateMetrics>): string {
  if (eli5Mode) {
    return `Your income is like your allowance from work! 

💰 **Total Money Earned:** ₹${metrics.totalIncome.toLocaleString("en-IN")}
💸 **Money Spent:** ₹${metrics.totalExpenses.toLocaleString("en-IN")}
🐷 **Money Saved:** ₹${metrics.savings.toLocaleString("en-IN")}

${
  metrics.savingsRate > 20
    ? "You're doing great - saving more than 20%! That's like keeping more than 2 coins out of every 10! 🌟"
    : "Try to save a bit more - aim for saving 2 coins out of every 10!"
}`
  }

  return `**Income Summary**

• **Total Income:** ₹${metrics.totalIncome.toLocaleString("en-IN")}
• **Total Expenses:** ₹${metrics.totalExpenses.toLocaleString("en-IN")}
• **Net Savings:** ₹${metrics.savings.toLocaleString("en-IN")}
• **Savings Rate:** ${metrics.savingsRate.toFixed(1)}%

${
  metrics.savingsRate >= 30
    ? "**Assessment:** Excellent savings rate! Consider investing surplus in diversified instruments."
    : metrics.savingsRate >= 20
      ? "**Assessment:** Good savings rate. Room for improvement in discretionary spending."
      : "**Assessment:** Below recommended 20% savings rate. Consider reviewing expenses."
}`
}

function generateSavingsResponse(eli5Mode: boolean, metrics: ReturnType<typeof calculateMetrics>): string {
  if (eli5Mode) {
    return `Let me check your piggy bank! 🐷

**This Month:**
• Money In: ₹${metrics.totalIncome.toLocaleString("en-IN")}
• Money Out: ₹${metrics.totalExpenses.toLocaleString("en-IN")}
• Saved: ₹${metrics.savings.toLocaleString("en-IN")} (${metrics.savingsRate.toFixed(0)}%)

${
  metrics.savingsRate >= 30
    ? "WOW! You're a super saver! 🌟"
    : metrics.savingsRate >= 20
      ? "Good job! You're saving nicely! 👍"
      : "Let's find ways to save more coins! 💪"
}

**Easy Savings Ideas:**
1. Make food at home instead of ordering (save ~₹3,000/month)
2. Cancel subscriptions you don't use (save ~₹1,000/month)
3. Use public transport sometimes (save ~₹2,000/month)`
  }

  return `**Savings Analysis**

**Current Performance:**
• Monthly Savings: ₹${metrics.savings.toLocaleString("en-IN")}
• Savings Rate: ${metrics.savingsRate.toFixed(1)}%
• Projected Annual: ₹${(metrics.savings * 12).toLocaleString("en-IN")}

**Optimization Strategies:**
${metrics.categoryTotals["Food & Dining"] ? `1. Reduce dining out by 20% → Save ₹${Math.round(metrics.categoryTotals["Food & Dining"] * 0.2).toLocaleString("en-IN")}/month` : ""}
${metrics.categoryTotals["Entertainment"] ? `2. Audit subscriptions → Potential ₹${Math.min(Math.round(metrics.categoryTotals["Entertainment"] * 0.3), 1000).toLocaleString("en-IN")}/month savings` : ""}
3. Move savings to high-yield accounts → Earn additional 6-7% annually

**Recommended Allocation:**
• Emergency Fund: 3-6 months expenses (₹${(metrics.totalExpenses * 6).toLocaleString("en-IN")})
• Tax-saving Investments: ₹${Math.min(150000, metrics.savings * 12).toLocaleString("en-IN")}/year
• Long-term Growth: Remainder in equity mutual funds`
}

function generateBankChargesResponse(eli5Mode: boolean, metrics: ReturnType<typeof calculateMetrics>): string {
  const bankCharges = metrics.categoryTotals["Bank Charges"] || 0

  if (eli5Mode) {
    return `Bank charges are like fees the bank takes for helping you! 🏦

${
  bankCharges > 0
    ? `You paid ₹${bankCharges.toLocaleString("en-IN")} in bank fees. That's like giving away some of your allowance!

**Common Bank Charges:**
• 💳 ATM fees (when you use other bank's ATMs)
• 📱 SMS alerts
• 💰 Minimum balance fees
• 📄 Cheque book charges

**How to Save:**
1. Use your own bank's ATMs
2. Keep minimum balance in account
3. Ask for a zero-fee account!`
    : "Great news! I don't see any bank charges in your transactions! You're saving money! 🎉"
}`
  }

  return `**Bank Charges Analysis**

${
  bankCharges > 0
    ? `**Current Charges:** ₹${bankCharges.toLocaleString("en-IN")}

**Common Bank Fees:**
• Non-home branch ATM withdrawals: ₹20-25/transaction
• SMS alerts: ₹15-25/quarter
• Minimum balance non-maintenance: ₹300-600/month
• Cheque book: ₹50-100

**Cost Reduction Strategies:**
1. Maintain minimum balance requirement
2. Use UPI instead of ATM withdrawals
3. Switch to zero-balance salary account
4. Opt for email statements over physical

**Potential Annual Savings:** ₹${Math.round(bankCharges * 12 * 0.5).toLocaleString("en-IN")} with optimization`
    : "**Status:** No bank charges detected in current transactions - you're managing accounts efficiently."
}`
}

function generateInvestmentResponse(eli5Mode: boolean, metrics: ReturnType<typeof calculateMetrics>): string {
  if (eli5Mode) {
    return `Investing is like planting money trees! 🌳💰

**Why Invest?**
When you put money in investments, it grows bigger over time! ₹1,000 today could become ₹2,000 in 7-10 years!

**Easy Options for Beginners:**
1. 🏦 **PPF** - Super safe, government's piggy bank (7.1% growth)
2. 📈 **ELSS Mutual Funds** - Bit more exciting, can grow faster
3. 🏠 **FD** - Safe savings that grow slowly

**Your Tax Benefit:**
You can invest ₹${metrics.remaining80C.toLocaleString("en-IN")} more and get a tax discount!

Start small - even ₹500/month adds up! 🚀`
  }

  return `**Investment Advisory**

**Current Status:**
• 80C Utilized: ₹${metrics.total80CUsed.toLocaleString("en-IN")} / ₹1,50,000
• Remaining Limit: ₹${metrics.remaining80C.toLocaleString("en-IN")}

**Recommended Investment Mix:**

**For Tax Saving (80C):**
• ELSS Mutual Funds: Best for growth + tax benefit (3-year lock-in)
• PPF: Safe, guaranteed 7.1% returns (15-year tenure)
• NPS: Additional ₹50,000 deduction under 80CCD(1B)

**Beyond Tax Saving:**
• Equity Index Funds: Long-term wealth creation
• Debt Funds: Stable returns, better than FD
• Emergency Fund: 6 months expenses in liquid fund

**SIP Recommendation:**
Monthly SIP of ₹${Math.min(10000, Math.round(metrics.remaining80C / 12)).toLocaleString("en-IN")} in ELSS to maximize 80C benefit

Would you like fund-specific recommendations?`
}

function generateDocumentResponse(eli5Mode: boolean, context: ChatRequest["context"]): string {
  const docs = context?.documents || []
  const processedDocs = docs.filter((d) => d.status === "processed")

  if (processedDocs.length === 0) {
    return eli5Mode
      ? "I haven't seen your documents yet! Upload your bank statement (like a report card for your money) and I'll tell you all about it! 📄"
      : "No processed documents found. Upload your bank statement or financial documents for analysis."
  }

  const allInsights = processedDocs.flatMap((d) => d.insights || [])

  if (eli5Mode) {
    return `I looked at your ${processedDocs.length} document(s)! Here's what I found:

${allInsights
  .slice(0, 4)
  .map((insight, i) => `${i + 1}. ${insight}`)
  .join("\n")}

Want me to explain anything in more detail?`
  }

  return `**Document Analysis Summary**

**Processed Documents:** ${processedDocs.length}
${processedDocs.map((d) => `• ${d.name} (${d.type})`).join("\n")}

**Key Insights:**
${allInsights
  .slice(0, 6)
  .map((insight) => `• ${insight}`)
  .join("\n")}

Would you like detailed analysis on any specific aspect?`
}

function generateSummaryResponse(eli5Mode: boolean, metrics: ReturnType<typeof calculateMetrics>): string {
  const healthScore = calculateHealthScore(metrics)

  if (eli5Mode) {
    const emoji = healthScore >= 80 ? "🌟" : healthScore >= 60 ? "👍" : "💪"
    return `**Your Money Report Card** ${emoji}

**Score: ${healthScore}/100**

📊 **The Basics:**
• Money Earned: ₹${metrics.totalIncome.toLocaleString("en-IN")}
• Money Spent: ₹${metrics.totalExpenses.toLocaleString("en-IN")}
• Money Saved: ₹${metrics.savings.toLocaleString("en-IN")} (${metrics.savingsRate.toFixed(0)}%)

📦 **Tax Savings Box:**
• Used: ₹${metrics.total80CUsed.toLocaleString("en-IN")}
• Empty Space: ₹${metrics.remaining80C.toLocaleString("en-IN")}

${
  healthScore >= 80
    ? "You're a money superstar! Keep it up! 🎉"
    : healthScore >= 60
      ? "You're doing well! A few tweaks and you'll be a superstar! ⭐"
      : "Let's work together to make your money work better! 💪"
}`
  }

  return `**Financial Health Summary**

**Health Score: ${healthScore}/100** ${healthScore >= 80 ? "(Excellent)" : healthScore >= 60 ? "(Good)" : "(Needs Attention)"}

**Cash Flow:**
• Monthly Income: ₹${metrics.totalIncome.toLocaleString("en-IN")}
• Monthly Expenses: ₹${metrics.totalExpenses.toLocaleString("en-IN")}
• Net Savings: ₹${metrics.savings.toLocaleString("en-IN")} (${metrics.savingsRate.toFixed(1)}% rate)

**Tax Efficiency:**
• 80C Utilized: ${Math.round((metrics.total80CUsed / 150000) * 100)}%
• 80D Utilized: ${Math.round((metrics.total80DUsed / 50000) * 100)}%
• Potential Tax Savings: ₹${Math.round((metrics.remaining80C + metrics.remaining80D) * 0.3).toLocaleString("en-IN")}

**Top Action Items:**
1. ${metrics.remaining80C > 50000 ? "Increase 80C investments" : "80C well-optimized ✓"}
2. ${metrics.savingsRate < 20 ? "Review discretionary spending" : "Savings rate healthy ✓"}
3. ${metrics.categoryTotals["Bank Charges"] ? "Reduce bank charges" : "No unnecessary charges ✓"}

Would you like detailed recommendations on any area?`
}

function generateDefaultResponse(eli5Mode: boolean, metrics: ReturnType<typeof calculateMetrics>): string {
  if (eli5Mode) {
    return `Hi there! I'm your friendly money helper! 🤖💰

I can help you with:
• 💰 **Where your money goes** - like checking which toys you buy most
• 🎁 **Tax discounts** - special coupons from the government
• 📊 **Money health check** - a report card for your savings

${
  metrics.hasData
    ? `I see you have some transactions! Ask me "where does my money go?" or "how can I save on taxes?"`
    : `Upload your bank statement and I'll tell you fun facts about your money!`
}

What would you like to know?`
  }

  return `Hello! I'm your Virtual CA assistant. I can help you with:

**Financial Analysis:**
• Spending patterns and budget optimization
• Income vs expense breakdown
• Savings rate assessment

**Tax Planning:**
• Section 80C, 80D, 24(b) deductions
• Tax-saving investment recommendations
• Compliance guidance

**Document Analysis:**
• Bank statement parsing
• Transaction categorization
• Fee and charge identification

${
  metrics.hasData
    ? `I have your financial data loaded. Try asking:\n• "Where am I overspending?"\n• "How can I save on taxes?"\n• "Give me a financial summary"`
    : `Upload your bank statement to get personalized insights, or ask me any finance-related question.`
}

How can I assist you today?`
}

function calculateHealthScore(metrics: ReturnType<typeof calculateMetrics>): number {
  let score = 50 // Base score

  // Savings rate contribution (max 25 points)
  if (metrics.savingsRate >= 30) score += 25
  else if (metrics.savingsRate >= 20) score += 20
  else if (metrics.savingsRate >= 10) score += 10
  else score += 5

  // Tax optimization (max 15 points)
  const taxUtilization = (metrics.total80CUsed / 150000 + metrics.total80DUsed / 50000) / 2
  score += Math.round(taxUtilization * 15)

  // Expense diversification (max 10 points)
  if (metrics.sortedCategories.length > 0) {
    const topCategoryShare = metrics.totalExpenses > 0 ? metrics.sortedCategories[0][1] / metrics.totalExpenses : 0
    if (topCategoryShare < 0.3) score += 10
    else if (topCategoryShare < 0.4) score += 7
    else score += 3
  }

  return Math.min(100, Math.max(0, score))
}
