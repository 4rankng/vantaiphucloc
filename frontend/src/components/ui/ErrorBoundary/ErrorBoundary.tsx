'use client'

import type { ErrorInfo, ReactNode } from 'react'
import { Component } from 'react'
import { InlineError } from '@/components/shared/InlineError'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  component?: string
  level?: 'app' | 'page' | 'component'
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
    console.error(`[ErrorBoundary:${this.props.level || 'component'}]`, this.props.component, error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <InlineError
          error={this.state.error!}
          component={this.props.component || 'Component'}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      )
    }
    return this.props.children
  }
}
