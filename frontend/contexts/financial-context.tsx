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

const sampleAccounts: Account[] = [
  { id: "1", name: "Savings Account", type: "bank", balance: 156000, institution: "HDFC Bank" },
  { id: "2", name: "Credit Card", type: "credit_card", balance: -15600, institution: "ICICI Bank" },
  { id: "3", name: "Home Loan", type: "loan", balance: -3500000, institution: "SBI" },
  { id: "4", name: "PPF Account", type: "investment", balance: 450000, institution: "Post Office" },
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
