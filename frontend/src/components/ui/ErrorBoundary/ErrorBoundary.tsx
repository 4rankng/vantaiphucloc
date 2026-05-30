'use client'

import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { InlineError } from '@/components/shared/forms/InlineError'
import { ErrorFallback } from '@/components/shared/feedback/ErrorFallback/ErrorFallback'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  component?: string
  level?: 'root' | 'app' | 'page' | 'component'
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const level = this.props.level || 'component'
    console.error(`[ErrorBoundary:${level}]`, this.props.component, error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      const level = this.props.level || 'component'

      if (level === 'component') {
        return (
          <InlineError
            error={this.state.error!}
            component={this.props.component || 'Component'}
            onRetry={() => this.setState({ hasError: false, error: null })}
          />
        )
      }

      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      )
    }
    return this.props.children
  }
}
