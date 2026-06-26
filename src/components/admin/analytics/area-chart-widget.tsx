"use client"

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts"
import { format } from "date-fns"

interface DataPoint {
  period: string | Date
  [key: string]: unknown
}

interface Series {
  key:   string
  label: string
  color: string
}

interface Props {
  data:    DataPoint[]
  series:  Series[]
  height?: number
  bucket?: "hour" | "day" | "week" | "month"
  prefix?: string
}

function formatLabel(period: string | Date, bucket: Props["bucket"]) {
  const d = new Date(period)
  if (bucket === "hour")  return format(d, "HH:mm")
  if (bucket === "month") return format(d, "MMM yy")
  return format(d, "dd MMM")
}

export default function AreaChartWidget({ data, series, height = 280, bucket = "day", prefix = "" }: Props) {
  const fmt = (v: unknown) => `${prefix}${Number(v).toLocaleString("en-IN")}`

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={s.color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="period"
          tickFormatter={(v) => formatLabel(v, bucket)}
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fontSize: 11, fill: "rgba(255,255,255,0.5)" }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          formatter={(v: unknown) => fmt(v)}
          labelFormatter={(l) => formatLabel(l, bucket)}
          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
