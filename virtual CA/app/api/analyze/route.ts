import { type NextRequest, NextResponse } from "next/server"

// Types for the AI analysis response
interface ExtractedData {
  documentType: string
  institution: string
  period: {
    start: string
    end: string
  }
  transactions: Array<{
    date: string
    description: string
    amount: number
    type: "credit" | "debit"
    category: string
  }>
  summary: {
    openingBalance: number
    closingBalance: number
    totalCredits: number
    totalDebits: number
  }
  insights: string[]
}

// Simulated AI response for MVP demo
const generateMockAnalysis = (filename: string): ExtractedData => {
  const isBank = filename.toLowerCase().includes("bank")
  const isCredit = filename.toLowerCase().includes("credit")

  return {
    documentType: isBank ? "bank_statement" : isCredit ? "credit_card_bill" : "financial_document",
    institution: isBank ? "HDFC Bank" : isCredit ? "ICICI Bank" : "Unknown",
    period: {
      start: "2024-12-01",
      end: "2024-12-31",
    },
    transactions: [
      {
        date: "2024-12-20",
        description: "Salary Credit - ABC Corp",
        amount: 85000,
        type: "credit",
        category: "Income",
      },
      {
        date: "2024-12-18",
        description: "Netflix Subscription",
        amount: 649,
        type: "debit",
        category: "Entertainment",
      },
      {
        date: "2024-12-15",
        description: "Swiggy Order",
        amount: 450,
        type: "debit",
        category: "Food & Dining",
      },
      {
        date: "2024-12-12",
        description: "Amazon Purchase",
        amount: 2499,
        type: "debit",
        category: "Shopping",
      },
    ],
    summary: {
      openingBalance: 125000,
      closingBalance: 156000,
      totalCredits: 85000,
      totalDebits: 52448,
    },
    insights: [
      "Recurring subscription detected: Netflix (₹649/month)",
      "Food delivery spending is 40% higher than last month",
      "Consider investing ₹65,000 more in 80C instruments",
      "ATM charges of ₹200 can be avoided by using own bank ATM",
    ],
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // In a real implementation, this would:
    // 1. Upload file to storage
    // 2. Send to AI Vision API for OCR + understanding
    // 3. Process extracted data through knowledge layer
    // 4. Generate insights

    // For MVP, return mock analysis
    const analysis = generateMockAnalysis(file.name)

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return NextResponse.json({
      success: true,
      filename: file.name,
      analysis,
      processedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json({ error: "Failed to analyze document" }, { status: 500 })
  }
}
