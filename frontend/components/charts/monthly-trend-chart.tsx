"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const monthlyData = [
  { month: "Jul", income: 82000, expenses: 55000 },
  { month: "Aug", income: 85000, expenses: 58000 },
  { month: "Sep", income: 83000, expenses: 52000 },
  { month: "Oct", income: 85000, expenses: 61000 },
  { month: "Nov", income: 85000, expenses: 54000 },
  { month: "Dec", income: 85000, expenses: 52448 },
]

export function MonthlyTrendChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Monthly Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-5)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-chart-5)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="month"
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value?: number) => [`₹${Number(value || 0).toLocaleString("en-IN")}`, ""]}
                contentStyle={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-foreground)",
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="var(--color-success)"
                fill="url(#incomeGradient)"
                strokeWidth={2}
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="var(--color-chart-5)"
                fill="url(#expenseGradient)"
                strokeWidth={2}
                name="Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
