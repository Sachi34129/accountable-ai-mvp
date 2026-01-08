"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  Sparkles,
  Mail,
  CreditCard,
  Brain,
  Bell,
} from "lucide-react"
import { useFinancial, type Insight } from "@/contexts/financial-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface InsightsPanelProps {
  compact?: boolean
}

export function InsightsPanel({ compact = false }: InsightsPanelProps) {
  const { insights, eli5Mode } = useFinancial()

  const getInsightIcon = (type: Insight["type"]) => {
    switch (type) {
      case "tax":
        return <IndianRupee className="h-4 w-4" />
      case "saving":
        return <TrendingUp className="h-4 w-4" />
      case "warning":
        return <AlertTriangle className="h-4 w-4" />
      case "tip":
        return <Sparkles className="h-4 w-4" />
    }
  }

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "tax":
        return "bg-primary/10 text-primary"
      case "saving":
        return "bg-success/10 text-success"
      case "warning":
        return "bg-warning/10 text-warning"
      case "tip":
        return "bg-chart-3/20 text-chart-3"
    }
  }

  const getPriorityBadge = (priority: Insight["priority"]) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High Priority</Badge>
      case "medium":
        return <Badge variant="secondary">Medium</Badge>
      case "low":
        return <Badge variant="outline">Low</Badge>
    }
  }

  return (
    <Card className={cn(compact && "h-full")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          AI Insights
          {eli5Mode && (
            <Badge variant="secondary" className="text-xs ml-2">
              <Sparkles className="h-3 w-3 mr-1" />
              Simple Mode
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className={cn(compact ? "h-[250px]" : "h-[350px]")}>
          <div className="space-y-3 pr-4">
            {insights.map((insight) => (
              <div key={insight.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded", getInsightColor(insight.type))}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <h4 className="text-sm font-medium text-foreground">{insight.title}</h4>
                  </div>
                  {getPriorityBadge(insight.priority)}
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
                {insight.amount && (
                  <p className="text-sm font-semibold text-primary">₹{insight.amount.toLocaleString("en-IN")}</p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Stretch Features - Stub UI */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-3">Quick Actions (Coming Soon)</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="justify-start text-xs bg-transparent"
              onClick={() => toast.info("Dispute email feature coming soon!")}
            >
              <Mail className="h-3 w-3 mr-2" />
              Dispute Charge
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start text-xs bg-transparent"
              onClick={() => toast.info("Payment optimization coming soon!")}
            >
              <CreditCard className="h-3 w-3 mr-2" />
              Optimize Pay
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start text-xs bg-transparent"
              onClick={() => toast.info("Financial quiz coming soon!")}
            >
              <Brain className="h-3 w-3 mr-2" />
              Finance Quiz
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="justify-start text-xs bg-transparent"
              onClick={() => toast.info("Predictive alerts coming soon!")}
            >
              <Bell className="h-3 w-3 mr-2" />
              Smart Alerts
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
