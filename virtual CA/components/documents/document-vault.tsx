"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Upload, CheckCircle2, Clock, AlertCircle, Loader2, File } from "lucide-react"
import { useFinancial, type Document } from "@/contexts/financial-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface DocumentVaultProps {
  compact?: boolean
}

export function DocumentVault({ compact = false }: DocumentVaultProps) {
  const { documents, addDocument, updateDocumentStatus, addTransactionsFromDocument, addInsight } = useFinancial()
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFile = async (file: File) => {
    const docId = Date.now().toString()
    const docType = getDocumentType(file.name)

    const newDoc: Document = {
      id: docId,
      name: file.name,
      type: docType,
      status: "pending",
      uploadedAt: new Date().toISOString(),
      size: file.size,
    }

    addDocument(newDoc)
    toast.success(`${file.name} uploaded successfully`)

    // Update to processing status
    setTimeout(() => {
      updateDocumentStatus(docId, "processing")
    }, 300)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("docId", docId)
      formData.append("docType", docType)

      const response = await fetch("/api/documents/analyze", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to analyze document")
      }

      const result = await response.json()

      // Update document status to processed
      updateDocumentStatus(docId, "processed", result.insights)

      // Add extracted transactions if any
      if (result.transactions && result.transactions.length > 0) {
        addTransactionsFromDocument(result.transactions)
      }

      // Add any insights from analysis
      if (result.newInsight) {
        addInsight(result.newInsight)
      }

      toast.success(`${file.name} has been analyzed`, {
        description: result.summary || "AI insights are now available",
      })
    } catch (error) {
      console.log("[v0] Document processing error:", error)
      updateDocumentStatus(docId, "error")
      toast.error(`Failed to analyze ${file.name}`, {
        description: "Please try again or upload a different file",
      })
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      files.forEach(processFile)
    },
    [addDocument, updateDocumentStatus, addTransactionsFromDocument, addInsight],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach(processFile)
    }
  }

  const getDocumentType = (filename: string): Document["type"] => {
    const lower = filename.toLowerCase()
    if (lower.includes("bank") || lower.includes("statement")) return "bank_statement"
    if (lower.includes("credit") || lower.includes("card")) return "credit_card_bill"
    if (lower.includes("loan") || lower.includes("emi")) return "loan_document"
    if (lower.includes("tax") || lower.includes("itr")) return "tax_document"
    return "other"
  }

  const getStatusIcon = (status: Document["status"]) => {
    switch (status) {
      case "processed":
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />
    }
  }

  const getFileIcon = (type: Document["type"]) => {
    switch (type) {
      case "bank_statement":
        return <FileText className="h-4 w-4" />
      case "credit_card_bill":
        return <FileText className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Card className={cn(compact && "h-full")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Document Vault
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border",
            compact ? "py-4" : "py-8",
          )}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Drop files here</p>
          <p className="text-xs text-muted-foreground mt-1">PDF, Images, Bank Statements</p>
          <label>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.csv,.txt"
              multiple
              onChange={(e) => {
                const files = e.target.files
                if (files) {
                  Array.from(files).forEach(processFile)
                }
              }}
            />
            <Button variant="outline" size="sm" className="mt-3 bg-transparent" asChild>
              <span>Browse Files</span>
            </Button>
          </label>
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <ScrollArea className={cn(compact ? "h-[150px]" : "h-[200px]")}>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="p-2 rounded bg-background">{getFileIcon(doc.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(doc.size)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.status)}
                    <Badge
                      variant={
                        doc.status === "processed" ? "default" : doc.status === "error" ? "destructive" : "secondary"
                      }
                      className="text-xs capitalize"
                    >
                      {doc.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {documents.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet</p>
        )}
      </CardContent>
    </Card>
  )
}
