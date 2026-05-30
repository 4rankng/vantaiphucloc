import { Check } from 'lucide-react'

export interface Step {
  label: string
  description?: string
}

export interface StepIndicatorProps {
  steps: Step[]
  /** Zero-based index of the current (active) step. */
  current: number
  className?: string
}

export function StepIndicator({ steps, current, className = '' }: StepIndicatorProps) {
  return (
    <ol className={`flex items-start gap-0 w-full ${className}`}>
      {steps.map((step, i) => {
        const isComplete = i < current
        const isActive = i === current
        const isLast = i === steps.length - 1

        return (
          <li key={i} className="flex-1 flex items-start gap-3 min-w-0">
            <div className="flex flex-col items-center shrink-0">
              <div
                className="grid place-items-center rounded-full"
                style={{
                  width: 28,
                  height: 28,
                  background: isComplete
                    ? 'var(--accent)'
                    : isActive
                      ? 'var(--accent-soft)'
                      : 'var(--surface-3)',
                  border: isActive ? '2px solid var(--accent)' : 'none',
                  color: isComplete ? 'var(--theme-text-on-brand)' : isActive ? 'var(--accent)' : 'var(--ink-3)',
                  fontFamily: 'var(--theme-font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  transition: 'background 0.18s ease, color 0.18s ease, border-color 0.18s ease',
                }}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </div>
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className="m-0 truncate"
                style={{
                  fontSize: 13,
                  fontWeight: isActive || isComplete ? 600 : 500,
                  color: isActive || isComplete ? 'var(--ink)' : 'var(--ink-3)',
                }}
              >
                {step.label}
              </p>
              {step.description && (
                <p
                  className="m-0 mt-0.5 truncate"
                  style={{ fontSize: 11.5, color: 'var(--ink-3)' }}
                >
                  {step.description}
                </p>
              )}
            </div>
            {!isLast && (
              <div
                aria-hidden
                className="shrink-0 mt-3.5"
                style={{
                  height: 2,
                  width: 28,
                  background: isComplete ? 'var(--accent)' : 'var(--line)',
                  borderRadius: 2,
                  transition: 'background 0.18s ease',
                }}
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
