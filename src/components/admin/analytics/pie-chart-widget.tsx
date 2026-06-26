"use client"

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts"

interface DataPoint {
  name:  string
  value: number
}

interface Props {
  data:     DataPoint[]
  height?:  number
  donut?:   boolean
  prefix?:  string
  title?:   string
}

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"]

export default function PieChartWidget({ data, height = 260, donut = false, prefix = "", title }: Props) {
  const fmt = (v: unknown) => `${prefix}${Number(v).toLocaleString("en-IN")}`

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      {title && <p className="text-sm font-semibold mb-4">{title}</p>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={donut ? "50%" : 0}
            outerRadius="75%"
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={fmt} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
