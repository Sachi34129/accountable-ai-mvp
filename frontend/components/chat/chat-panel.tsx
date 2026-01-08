"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Send, Bot, User, Mic, Sparkles, TrendingUp, Shield, HelpCircle, Loader2 } from "lucide-react"
import { useFinancial } from "@/contexts/financial-context"
import { cn } from "@/lib/utils"
import api from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isEli5?: boolean
}

const suggestedQuestions = [
  { icon: TrendingUp, text: "How much tax can I save?" },
  { icon: Shield, text: "Where am I overspending?" },
  { icon: HelpCircle, text: "Explain my bank charges" },
]

export function ChatPanel() {
  const { eli5Mode, setEli5Mode, getFinancialContext, documents } = useFinancial()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! I'm your Virtual CA. I can help you understand your finances, find tax savings, and explain your transactions. Upload your bank statements or ask me anything!",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const processedDocs = documents.filter((d) => d.status === "processed")
    if (processedDocs.length > 0 && messages.length === 1) {
      // User has uploaded and processed a document, but hasn't chatted yet
      const lastProcessed = processedDocs[processedDocs.length - 1]
      if (lastProcessed.insights && lastProcessed.insights.length > 0) {
        const insightMessage: Message = {
          id: `insight-${lastProcessed.id}`,
          role: "assistant",
          content: `I've analyzed your ${lastProcessed.name}. Here's what I found:\n\n${lastProcessed.insights.join("\n\n")}\n\nWould you like me to explain any of these in detail?`,
          timestamp: new Date(),
          isEli5: eli5Mode,
        }
        setMessages((prev) => {
          // Only add if not already added
          if (prev.some((m) => m.id === insightMessage.id)) return prev
          return [...prev, insightMessage]
        })
      }
    }
  }, [documents, eli5Mode])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const financialContext = getFinancialContext()

      const response = await api.post("/chat", {
        message: input,
        eli5Mode,
        context: financialContext,
      })

      const data = response.data

      if (!data.success && !data.response) {
        throw new Error("Failed to get response")
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        isEli5: eli5Mode,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.log("[v0] Chat error:", error)
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm here to help! Try asking me about your spending, tax savings, or upload a bank statement for personalized insights.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, fallbackMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedQuestion = (question: string) => {
    setInput(question)
  }

  return (
    <Card className="h-[calc(100vh-12rem)] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="eli5-mode" className="text-xs text-muted-foreground">
              ELI5
            </Label>
            <Switch
              id="eli5-mode"
              checked={eli5Mode}
              onCheckedChange={setEli5Mode}
              aria-label="Explain Like I'm Five mode"
            />
          </div>
        </div>
        {eli5Mode && (
          <Badge variant="secondary" className="w-fit text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Simple explanations enabled
          </Badge>
        )}
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 px-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.isEli5 && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Simplified
                    </Badge>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Suggested Questions */}
        {messages.length <= 2 && (
          <div className="px-4 pb-3">
            <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 bg-transparent"
                  onClick={() => handleSuggestedQuestion(q.text)}
                >
                  <q.icon className="h-3 w-3 mr-1.5" />
                  {q.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="flex-shrink-0"
              disabled
              title="Voice input coming soon"
            >
              <Mic className="h-4 w-4" />
              <span className="sr-only">Voice input (coming soon)</span>
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your finances..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
