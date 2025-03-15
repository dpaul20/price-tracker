"use client"

import { useTheme } from "next-themes"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"

interface PriceHistoryChartProps {
  data: {
    date: string
    price: number
  }[]
}

export function PriceHistoryChart({ data }: PriceHistoryChartProps) {
  const { theme } = useTheme()

  // Format the data for the chart
  const chartData = data.map((item) => ({
    date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    price: item.price,
  }))

  // Calculate min and max for the y-axis
  const prices = data.map((item) => item.price)
  const minPrice = Math.min(...prices) * 0.95 // 5% below min
  const maxPrice = Math.max(...prices) * 1.05 // 5% above max

  return (
    <div className="w-full h-[300px]">
      {data.length > 1 ? (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <XAxis
              dataKey="date"
              stroke={theme === "dark" ? "#888888" : "#888888"}
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={theme === "dark" ? "#888888" : "#888888"}
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatCurrency(value)}
              domain={[minPrice, maxPrice]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <Card className="p-2 shadow-lg border">
                      <div className="text-sm font-medium">{payload[0].payload.date}</div>
                      <div className="text-sm font-bold">{formatCurrency(payload[0].value as number)}</div>
                    </Card>
                  )
                }
                return null
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={theme === "dark" ? "#10b981" : "#10b981"}
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Not enough data to display chart</p>
        </div>
      )}
    </div>
  )
}

