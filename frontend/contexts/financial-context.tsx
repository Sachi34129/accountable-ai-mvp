"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import api from "@/lib/api"

// Types for financial data
export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  type: "income" | "expense"
  source: string
}

export interface Account {
  id: string
  name: string
  type: "bank" | "credit_card" | "loan" | "investment"
  balance: number
  institution: string
}

export interface Document {
  id: string
  name: string
  type: "bank_statement" | "credit_card_bill" | "loan_document" | "tax_document" | "other"
  status: "pending" | "processing" | "processed" | "error"
  uploadedAt: string
  size: number
  insights?: string[]
}

export interface TaxDeduction {
  section: string
  name: string
  currentAmount: number
  maxLimit: number
  description: string
}

export interface Insight {
  id: string
  type: "saving" | "warning" | "tip" | "tax"
  title: string
  description: string
  amount?: number
  priority: "high" | "medium" | "low"
}

interface FinancialContextType {
  transactions: Transaction[]
  accounts: Account[]
  documents: Document[]
  insights: Insight[]
  taxDeductions: TaxDeduction[]
  isLoading: boolean
  fetchDocuments: () => Promise<void>
  fetchTransactions: () => Promise<void>
  fetchTaxDeductions: () => Promise<void>
  fetchInsights: () => Promise<void>
  addDocument: (doc: Document) => void
  removeDocument: (id: string) => Promise<void>
  updateDocumentStatus: (id: string, status: Document["status"], insights?: string[]) => void
  addInsight: (insight: Insight) => void
  addTransactionsFromDocument: (newTransactions: Transaction[]) => void
  eli5Mode: boolean
  setEli5Mode: (mode: boolean) => void
  getFinancialContext: () => {
    transactions: Transaction[]
    documents: Document[]
    taxDeductions: TaxDeduction[]
    accounts: Account[]
    insights: Insight[]
  }
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined)

// Sample demo data
const sampleTransactions: Transaction[] = [
  {
    id: "1",
    date: "2024-12-20",
    description: "Salary Credit",
    amount: 85000,
    category: "Income",
    type: "income",
    source: "HDFC Bank",
  },
  {
    id: "2",
    date: "2024-12-18",
    description: "Netflix Subscription",
    amount: 649,
    category: "Entertainment",
    type: "expense",
    source: "ICICI Credit Card",
  },
  {
    id: "3",
    date: "2024-12-15",
    description: "Swiggy Order",
    amount: 450,
    category: "Food & Dining",
    type: "expense",
    source: "HDFC Bank",
  },
  {
    id: "4",
    date: "2024-12-12",
    description: "Amazon Purchase",
    amount: 2499,
    category: "Shopping",
    type: "expense",
    source: "ICICI Credit Card",
  },
  {
    id: "5",
    date: "2024-12-10",
    description: "Electricity Bill",
    amount: 1850,
    category: "Utilities",
    type: "expense",
    source: "HDFC Bank",
  },
  {
    id: "6",
    date: "2024-12-08",
    description: "LIC Premium",
    amount: 12000,
    category: "Insurance",
    type: "expense",
    source: "HDFC Bank",
  },
  {
    id: "7",
    date: "2024-12-05",
    description: "Mutual Fund SIP",
    amount: 10000,
    category: "Investment",
    type: "expense",
    source: "HDFC Bank",
  },
  {
    id: "8",
    date: "2024-12-01",
    description: "Rent Payment",
    amount: 25000,
    category: "Housing",
    type: "expense",
    source: "HDFC Bank",
  },
]

const sampleAccounts: Account[] = [
  { id: "1", name: "Savings Account", type: "bank", balance: 156000, institution: "HDFC Bank" },
  { id: "2", name: "Credit Card", type: "credit_card", balance: -15600, institution: "ICICI Bank" },
  { id: "3", name: "Home Loan", type: "loan", balance: -3500000, institution: "SBI" },
  { id: "4", name: "PPF Account", type: "investment", balance: 450000, institution: "Post Office" },
]

const sampleTaxDeductions: TaxDeduction[] = [
  {
    section: "80C",
    name: "Life Insurance & PPF",
    currentAmount: 85000,
    maxLimit: 150000,
    description: "Investments in PPF, LIC, ELSS, etc.",
  },
  {
    section: "80D",
    name: "Health Insurance",
    currentAmount: 18000,
    maxLimit: 25000,
    description: "Medical insurance premiums for self and family",
  },
  {
    section: "24(b)",
    name: "Home Loan Interest",
    currentAmount: 180000,
    maxLimit: 200000,
    description: "Interest paid on home loan",
  },
  {
    section: "80E",
    name: "Education Loan",
    currentAmount: 0,
    maxLimit: 999999,
    description: "Interest on education loan (no upper limit)",
  },
]

const sampleInsights: Insight[] = [
  {
    id: "1",
    type: "tax",
    title: "Maximize 80C Benefits",
    description:
      "You have ₹65,000 remaining in your 80C limit. Consider investing in ELSS or increasing PPF contribution.",
    amount: 65000,
    priority: "high",
  },
  {
    id: "2",
    type: "warning",
    title: "High Food Delivery Spending",
    description:
      "You spent ₹8,500 on food delivery this month, 40% higher than last month. Consider cooking more at home.",
    amount: 8500,
    priority: "medium",
  },
  {
    id: "3",
    type: "saving",
    title: "Recurring Subscriptions",
    description: "You have 5 active subscriptions totaling ₹2,100/month. Review if all are being used.",
    amount: 2100,
    priority: "medium",
  },
  {
    id: "4",
    type: "tip",
    title: "Credit Card Reward Optimization",
    description: "Using your ICICI card for groceries gives 5% cashback. Switch from UPI for grocery purchases.",
    priority: "low",
  },
]

export function FinancialProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts] = useState<Account[]>(sampleAccounts)
  const [documents, setDocuments] = useState<Document[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [taxDeductions, setTaxDeductions] = useState<TaxDeduction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [eli5Mode, setEli5Mode] = useState(false)

  const fetchDocuments = async () => {
    try {
      const response = await api.get('/documents')
      // Map backend document to frontend document type
      const mappedDocs: Document[] = response.data.map((doc: any) => ({
        id: doc.id,
        name: doc.name || doc.type,
        type: doc.type,
        status: doc.extractionStatus,
        uploadedAt: doc.createdAt,
        size: 0, // Backend might not provide this in the main list
      }))
      setDocuments(mappedDocs)
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions')
      const mappedTxs: Transaction[] = response.data.transactions.map((tx: any) => ({
        id: tx.id,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        category: tx.category || 'Uncategorized',
        type: tx.direction === 'income' ? 'income' : 'expense',
        source: tx.merchant || 'Unknown'
      }))
      setTransactions(mappedTxs)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    }
  }

  const fetchTaxDeductions = async () => {
    try {
      const response = await api.get('/tax')
      const mappedTax: TaxDeduction[] = response.data.taxNotes.map((note: any) => ({
        section: note.section,
        name: note.title,
        currentAmount: note.currentAmount || 0,
        maxLimit: note.maxLimit || 150000,
        description: note.recommendation
      }))
      setTaxDeductions(mappedTax)
    } catch (error) {
      console.error('Error fetching tax deductions:', error)
    }
  }

  const fetchInsights = async () => {
    try {
      const response = await api.get('/insights')
      const mappedInsights: Insight[] = response.data.insights.map((insight: any) => ({
        id: insight.id,
        type: insight.type as Insight["type"],
        title: insight.title,
        description: insight.description,
        amount: insight.impactAmount,
        priority: insight.priority as Insight["priority"]
      }))
      setInsights(mappedInsights)
    } catch (error) {
      console.error('Error fetching insights:', error)
    }
  }

  useEffect(() => {
    const init = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchDocuments(),
        fetchTransactions(),
        fetchTaxDeductions(),
        fetchInsights()
      ])
      setIsLoading(false)
    }
    init()
  }, [])

  const addDocument = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev])
  }

  const removeDocument = async (id: string) => {
    try {
      await api.delete(`/documents/${id}`)
      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
      await fetchTransactions() // Refresh transactions as they might be linked
    } catch (error) {
      console.error('Error deleting document:', error)
      throw error
    }
  }

  const updateDocumentStatus = (id: string, status: Document["status"], docInsights?: string[]) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === id ? { ...doc, status, insights: docInsights } : doc)))
  }

  const addInsight = (insight: Insight) => {
    setInsights((prev) => [insight, ...prev])
  }

  const addTransactionsFromDocument = (newTransactions: Transaction[]) => {
    setTransactions((prev) => [...prev, ...newTransactions])
  }

  const getFinancialContext = () => ({
    transactions,
    documents,
    taxDeductions,
    accounts,
    insights,
  })

  return (
    <FinancialContext.Provider
      value={{
        transactions,
        accounts,
        documents,
        insights,
        taxDeductions,
        isLoading,
        fetchDocuments,
        fetchTransactions,
        fetchTaxDeductions,
        fetchInsights,
        addDocument,
        removeDocument,
        updateDocumentStatus,
        addInsight,
        addTransactionsFromDocument,
        eli5Mode,
        setEli5Mode,
        getFinancialContext,
      }}
    >
      {children}
    </FinancialContext.Provider>
  )
}

export function useFinancial() {
  const context = useContext(FinancialContext)
  if (context === undefined) {
    throw new Error("useFinancial must be used within a FinancialProvider")
  }
  return context
}
