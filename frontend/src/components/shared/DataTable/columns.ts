import type { ReactNode } from 'react'

export type ColumnAlign = 'left' | 'right' | 'center'

export interface Column<T> {
  /** Stable id for the column. */
  key: string
  /** Header cell content. */
  header: ReactNode
  /** Body cell renderer. */
  render: (row: T, rowIndex: number) => ReactNode
  /** Text alignment for this column. Defaults to 'left'. */
  align?: ColumnAlign
  /** Fixed column width (px or CSS length). */
  width?: number | string
  /** When true, on desktop the column sticks to the left edge with a hairline shadow. */
  sticky?: boolean
  /** Extra class names appended to the <td>. */
  cellClassName?: string
  /** Extra class names appended to the <th>. */
  headerClassName?: string
  /** When true, render the column only at >= breakpoint (md = 768, lg = 1024). */
  hideBelow?: 'md' | 'lg'
  /**
   * When set, the column header becomes a sort toggle button.
   * The value is the backend sort_by key sent in the API request.
   */
  sortKey?: string
}
