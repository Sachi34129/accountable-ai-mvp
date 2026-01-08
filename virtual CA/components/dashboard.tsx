"use client"

import { useState } from "react"
import { ChatPanel } from "@/components/chat/chat-panel"
import { FinancialSummary } from "@/components/financial/financial-summary"
import { DocumentVault } from "@/components/documents/document-vault"
import { InsightsPanel } from "@/components/insights/insights-panel"
import { Header } from "@/components/layout/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, FileText, BarChart3, Lightbulb } from "lucide-react"
import { FinancialProvider } from "@/contexts/financial-context"

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("chat")

  return (
    <FinancialProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-6">
          {/* Mobile: Tabs */}
          <div className="lg:hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Docs</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Reports</span>
                </TabsTrigger>
                <TabsTrigger value="insights" className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  <span className="sr-only sm:not-sr-only">Insights</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="chat" className="mt-0">
                <ChatPanel />
              </TabsContent>
              <TabsContent value="documents" className="mt-0">
                <DocumentVault />
              </TabsContent>
              <TabsContent value="reports" className="mt-0">
                <FinancialSummary />
              </TabsContent>
              <TabsContent value="insights" className="mt-0">
                <InsightsPanel />
              </TabsContent>
            </Tabs>
          </div>

          {/* Desktop: Split View */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-6">
            {/* Left: Chat Panel */}
            <div className="col-span-5 xl:col-span-4">
              <ChatPanel />
            </div>

            {/* Right: Financial Summary + Insights */}
            <div className="col-span-7 xl:col-span-8 space-y-6">
              <FinancialSummary />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <DocumentVault compact />
                <InsightsPanel compact />
              </div>
            </div>
          </div>
        </main>

        {/* Disclaimer */}
        <footer className="border-t border-border py-4 mt-8">
          <div className="container mx-auto px-4">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Disclaimer:</strong> This is not financial advice. Accountable AI provides educational insights
              only. Please consult a certified financial advisor for professional guidance.
            </p>
          </div>
        </footer>
      </div>
    </FinancialProvider>
  )
}
