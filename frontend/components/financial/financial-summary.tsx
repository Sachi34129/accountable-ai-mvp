"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Wallet, TrendingUp, TrendingDown, CreditCard, PiggyBank, Target, IndianRupee } from "lucide-react"
import { useFinancial } from "@/contexts/financial-context"
import { SpendingChart } from "@/components/charts/spending-chart"
import { MonthlyTrendChart } from "@/components/charts/monthly-trend-chart"

export function FinancialSummary() {
  const { transactions, accounts, taxDeductions } = useFinancial()

  const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)

  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  const totalTaxSavings = taxDeductions.reduce((sum, d) => sum + d.currentAmount, 0)
  const maxTaxSavings = taxDeductions.reduce((sum, d) => sum + d.maxLimit, 0)
  const taxUtilization = (totalTaxSavings / maxTaxSavings) * 100

  // Calculate financial health score (simplified)
  const healthScore = Math.round((savingsRate * 0.4 + taxUtilization * 0.3 + 50) / 1.2)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-semibold text-foreground">₹{totalIncome.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-semibold text-foreground">₹{totalExpenses.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <PiggyBank className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Savings Rate</p>
                <p className="text-lg font-semibold text-foreground">{savingsRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Target className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Health Score</p>
                <p className="text-lg font-semibold text-foreground">{healthScore}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SpendingChart />
        <MonthlyTrendChart />
      </div>

      {/* Tax Deductions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-primary" />
            Tax Deduction Status (India)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {taxDeductions.map((deduction) => {
              const percentage = (deduction.currentAmount / deduction.maxLimit) * 100
              const remaining = deduction.maxLimit - deduction.currentAmount
              return (
                <div key={deduction.section} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Badge variant="outline" className="text-xs font-mono">
                        {deduction.section}
                      </Badge>
                      <p className="text-sm font-medium text-foreground mt-1">{deduction.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">₹{remaining.toLocaleString("en-IN")} left</p>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    ₹{deduction.currentAmount.toLocaleString("en-IN")} / ₹{deduction.maxLimit.toLocaleString("en-IN")}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Accounts Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Linked Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    {account.type === "credit_card" ? (
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{account.name}</p>
                    <p className="text-xs text-muted-foreground">{account.institution}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${account.balance >= 0 ? "text-success" : "text-destructive"}`}>
                  {account.balance >= 0 ? "" : "-"}₹{Math.abs(account.balance).toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
