/**
 * Thin, typed wrappers around react-chartjs-2.
 * All Chart.js registrations happen here so pages never import from chart.js directly.
 */
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Tooltip, Legend, Filler,
  type ChartData, type ChartOptions,
} from 'chart.js'
import { Bar, Line, Doughnut, Chart } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Tooltip, Legend, Filler,
)

// ─── Shared defaults ──────────────────────────────────────────────────────────

const BASE_FONT = '"Be Vietnam Pro", "Inter", ui-sans-serif, system-ui, sans-serif'

// TODO: tokenize chart colors when theme switching is added
// Currently using fixed neutral grays that align with the modern theme
const CHART_TEXT_COLOR = 'var(--theme-text-muted)'
const CHART_BG_COLOR = 'var(--theme-text-primary)'
const CHART_GRID_COLOR = 'rgba(0,0,0,0.04)'

function baseOptions(overrides?: ChartOptions<'bar'>): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          font: { family: BASE_FONT, size: 11 },
          color: CHART_TEXT_COLOR,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: CHART_BG_COLOR,
        titleFont: { family: BASE_FONT, size: 11 },
        bodyFont: { family: BASE_FONT, size: 11 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: BASE_FONT, size: 10 }, color: CHART_TEXT_COLOR },
        border: { display: false },
      },
      y: {
        grid: { color: CHART_GRID_COLOR },
        ticks: { font: { family: BASE_FONT, size: 10 }, color: CHART_TEXT_COLOR },
        border: { display: false },
      },
    },
    ...overrides,
  }
}

// ─── BarChart ─────────────────────────────────────────────────────────────────

interface BarChartProps {
  data: ChartData<'bar'>
  height?: number
  options?: ChartOptions<'bar'>
}

export function BarChartWidget({ data, height = 200, options }: BarChartProps) {
  return (
    <div style={{ height }}>
      <Bar data={data} options={{ ...baseOptions(), ...options }} />
    </div>
  )
}

// ─── LineChart ────────────────────────────────────────────────────────────────

interface LineChartProps {
  data: ChartData<'line'>
  height?: number
  options?: ChartOptions<'line'>
}

export function LineChartWidget({ data, height = 200, options }: LineChartProps) {
  const lineOpts: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: CHART_BG_COLOR,
        titleFont: { family: BASE_FONT, size: 11 },
        bodyFont: { family: BASE_FONT, size: 11 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: BASE_FONT, size: 10 }, color: CHART_TEXT_COLOR },
        border: { display: false },
      },
      y: {
        grid: { color: CHART_GRID_COLOR },
        ticks: { font: { family: BASE_FONT, size: 10 }, color: CHART_TEXT_COLOR },
        border: { display: false },
      },
    },
    elements: { line: { tension: 0.4 }, point: { radius: 3, hoverRadius: 5 } },
    ...options,
  }
  return (
    <div style={{ height }}>
      <Line data={data} options={lineOpts} />
    </div>
  )
}

// ─── MixedChart ───────────────────────────────────────────────────────────────

interface MixedChartProps {
  data: ChartData<'bar' | 'line'>
  height?: number
  options?: ChartOptions<'bar' | 'line'>
}

export function MixedChartWidget({ data, height = 240, options }: MixedChartProps) {
  const mixedOpts: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          boxHeight: 8,
          font: { family: BASE_FONT, size: 11 },
          color: CHART_TEXT_COLOR,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: CHART_BG_COLOR,
        titleFont: { family: BASE_FONT, size: 11 },
        bodyFont: { family: BASE_FONT, size: 11 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: BASE_FONT, size: 10 }, color: CHART_TEXT_COLOR },
        border: { display: false },
      },
      y: {
        type: 'linear',
        position: 'left',
        grid: { color: CHART_GRID_COLOR },
        ticks: { font: { family: BASE_FONT, size: 10 }, color: CHART_TEXT_COLOR },
        border: { display: false },
      },
      yLatency: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { font: { family: BASE_FONT, size: 10 }, color: CHART_TEXT_COLOR },
        border: { display: false },
      },
    },
  }
  const mergedOptions: ChartOptions<'bar' | 'line'> = {
    ...mixedOpts,
    ...options,
    plugins: {
      ...mixedOpts.plugins,
      ...options?.plugins,
      legend: {
        ...mixedOpts.plugins?.legend,
        ...options?.plugins?.legend,
        labels: {
          ...mixedOpts.plugins?.legend?.labels,
          ...options?.plugins?.legend?.labels,
        },
      },
      tooltip: {
        ...mixedOpts.plugins?.tooltip,
        ...options?.plugins?.tooltip,
        callbacks: {
          ...mixedOpts.plugins?.tooltip?.callbacks,
          ...options?.plugins?.tooltip?.callbacks,
        },
      },
    },
    scales: {
      ...mixedOpts.scales,
      ...options?.scales,
      x: {
        ...mixedOpts.scales?.x,
        ...options?.scales?.x,
      },
      y: {
        ...mixedOpts.scales?.y,
        ...options?.scales?.y,
        ticks: {
          ...mixedOpts.scales?.y?.ticks,
          ...options?.scales?.y?.ticks,
        },
        title: {
          ...mixedOpts.scales?.y?.title,
          ...options?.scales?.y?.title,
        },
      },
      yLatency: {
        ...mixedOpts.scales?.yLatency,
        ...options?.scales?.yLatency,
        ticks: {
          ...mixedOpts.scales?.yLatency?.ticks,
          ...options?.scales?.yLatency?.ticks,
        },
        title: {
          ...mixedOpts.scales?.yLatency?.title,
          ...options?.scales?.yLatency?.title,
        },
      },
    },
  }

  return (
    <div style={{ height }}>
      <Chart type="bar" data={data} options={mergedOptions} />
    </div>
  )
}

// ─── DoughnutChart ────────────────────────────────────────────────────────────

interface DoughnutChartProps {
  data: ChartData<'doughnut'>
  height?: number
  options?: ChartOptions<'doughnut'>
}

export function DoughnutChartWidget({ data, height = 180, options }: DoughnutChartProps) {
  const doughnutOpts: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: BASE_FONT, size: 11 },
          color: CHART_TEXT_COLOR,
          boxWidth: 10,
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: CHART_BG_COLOR,
        titleFont: { family: BASE_FONT, size: 11 },
        bodyFont: { family: BASE_FONT, size: 11 },
        padding: 10,
        cornerRadius: 8,
      },
    },
    ...options,
  }
  return (
    <div style={{ height }}>
      <Doughnut data={data} options={doughnutOpts} />
    </div>
  )
}
