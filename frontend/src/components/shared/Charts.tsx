'use client'

import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  type TooltipProps,
} from 'recharts'
import { cn } from '@/lib/utils'

// Theme-aware chart colors
export const CHART_COLORS = {
  primary: 'var(--chart-primary, #3b82f6)',
  success: 'var(--chart-success, #10b981)',
  warning: 'var(--chart-warning, #f59e0b)',
  danger: 'var(--chart-danger, #ef4444)',
  muted: 'var(--chart-muted, #94a3b8)',
}

interface BaseChartProps {
  data: Record<string, unknown>[]
  xKey: string
  height?: number
  className?: string
}

// Custom tooltip with theme styling
function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[var(--theme-border-default)] bg-[var(--theme-bg-secondary)] px-3 py-2 shadow-lg">
      {label && <p className="mb-1 text-xs font-medium text-[var(--theme-text-muted)]">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('vi-VN') : entry.value}
        </p>
      ))}
    </div>
  )
}

// ─── Area Chart ─────────────────────────────

interface AreaChartWidgetProps extends BaseChartProps {
  yKey: string
  color?: string
  gradient?: boolean
  name?: string
}

export function AreaChartWidget({ data, xKey, yKey, color = CHART_COLORS.primary, gradient = true, name, height = 200, className }: AreaChartWidgetProps) {
  const id = `area-${yKey}-${Math.random().toString(36).slice(2, 6)}`
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border-default)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="var(--theme-text-muted)" tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--theme-text-muted)" tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey={yKey}
          name={name || yKey}
          stroke={color}
          strokeWidth={2}
          fill={gradient ? `url(#${id})` : 'none'}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ─── Bar Chart ─────────────────────────────

interface BarChartWidgetProps extends BaseChartProps {
  yKeys: { key: string; color?: string; name?: string }[]
  stacked?: boolean
}

export function BarChartWidget({ data, xKey, yKeys, stacked = false, height = 200, className }: BarChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border-default)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="var(--theme-text-muted)" tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--theme-text-muted)" tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        {yKeys.map(({ key, color, name }) => (
          <Bar
            key={key}
            dataKey={key}
            name={name || key}
            fill={color || CHART_COLORS.primary}
            stackId={stacked ? 'stack' : undefined}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Line Chart ─────────────────────────────

interface LineChartWidgetProps extends BaseChartProps {
  lines: { key: string; color?: string; name?: string; dashed?: boolean }[]
}

export function LineChartWidget({ data, xKey, lines, height = 200, className }: LineChartWidgetProps) {
  return (
    <ResponsiveContainer width="100%" height={height} className={className}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-border-default)" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="var(--theme-text-muted)" tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} stroke="var(--theme-text-muted)" tickLine={false} axisLine={false} />
        <Tooltip content={<ChartTooltip />} />
        {lines.map(({ key, color, name, dashed }) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={name || key}
            stroke={color || CHART_COLORS.primary}
            strokeWidth={2}
            strokeDasharray={dashed ? '5 5' : undefined}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}
