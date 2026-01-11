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
import api from "@/lib/api"
import { Trash2 } from "lucide-react"

interface DocumentVaultProps {
  compact?: boolean
}

export function DocumentVault({ compact = false }: DocumentVaultProps) {
  const { documents, addDocument, updateDocumentStatus, removeDocument, fetchDocuments, fetchTransactions } = useFinancial()
  const [isDragging, setIsDragging] = useState(false)
  const MAX_FILE_BYTES = 1 * 1024 * 1024

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const processFile = async (file: File) => {
    if (file.size > MAX_FILE_BYTES) {
      toast.error(`${file.name} is too large`, {
        description: "Max upload size is 1 MB. Please compress the file and try again.",
      })
      return
    }
    const docId = `temp-${Date.now()}`
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

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", docType) // backend expects 'type'

      const response = await api.post("/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const result = response.data

      // Replace temp doc with real doc from backend
      updateDocumentStatus(docId, result.extractionStatus)
      // Actually we should probably just refresh the list
      setTimeout(() => {
        fetchDocuments()
        fetchTransactions()
      }, 2000)

      toast.success(`${file.name} uploaded successfully`, {
        description: `Status: ${result.extractionStatus}`,
      })
    } catch (error) {
      console.error("Document processing error:", error)
      updateDocumentStatus(docId, "error")
      toast.error(`Failed to upload ${file.name}`)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      files.forEach(processFile)
    },
    [addDocument, updateDocumentStatus, fetchDocuments, fetchTransactions],
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
                        doc.status === "processed" || doc.status === "completed" ? "default" : doc.status === "error" || doc.status === "failed" ? "destructive" : "secondary"
                      }
                      className="text-xs capitalize"
                    >
                      {doc.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this document?")) {
                          removeDocument(doc.id).catch(() => toast.error("Failed to delete document"))
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
