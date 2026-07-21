import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Loader } from './Loader';

// ─── Column definition ────────────────────────────────────────────
export interface TableColumn<TRow = Record<string, unknown>> {
  key: string;
  header: string;
  accessor?: keyof TRow | ((row: TRow) => ReactNode);
  render?: (value: unknown, row: TRow) => ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<TRow = Record<string, unknown>> {
  columns: TableColumn<TRow>[];
  data: TRow[];
  keyExtractor: (row: TRow, index: number) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TRow) => void;
  className?: string;
  caption?: string;
  stickyHeader?: boolean;
  maxHeight?: string | number;
}

export function Table<TRow = Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = 'No data available.',
  onRowClick,
  className,
  caption,
  stickyHeader,
  maxHeight,
}: TableProps<TRow>) {
  const getCellValue = (row: TRow, col: TableColumn<TRow>): ReactNode => {
    if (col.render) {
      const raw = col.accessor
        ? typeof col.accessor === 'function'
          ? col.accessor(row)
          : row[col.accessor]
        : undefined;
      return col.render(raw, row);
    }
    if (col.accessor) {
      const val =
        typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor];
      return val as ReactNode;
    }
    return null;
  };

  return (
    <div
      className={cn('overflow-x-auto rounded-xl border border-[var(--sf-border-default)]', className)}
      style={{ WebkitOverflowScrolling: 'touch', maxHeight, overflowY: maxHeight ? 'auto' : undefined }}
    >
      <table className="w-full text-sm border-collapse">
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}

        {/* Head */}
        <thead className={cn(stickyHeader && 'sticky top-0 z-10 shadow-sm outline outline-1 outline-[var(--sf-border-default)]')}>
          <tr className="bg-[var(--sf-surface-sunken)] border-b border-[var(--sf-border-default)]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width }}
                className={cn(
                  'px-4 py-3 font-semibold text-[var(--sf-text-tertiary)] text-xs uppercase tracking-wider',
                  col.align === 'center' && 'text-center',
                  col.align === 'right'  && 'text-right',
                  !col.align             && 'text-left',
                  stickyHeader && 'bg-[var(--sf-surface-sunken)] backdrop-blur-md'
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <Loader size="md" label="Loading data…" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                role="status"
                className="py-12 text-center text-[var(--sf-text-tertiary)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor(row, index)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={cn(
                  'border-b border-[var(--sf-border-default)] last:border-0',
                  'bg-[var(--sf-surface-card)] hover:bg-[var(--sf-surface-raised)] hover:brightness-105',
                  'transition-colors duration-100',
                  onRowClick && 'cursor-pointer',
                  onRowClick && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-[var(--sf-text-secondary)]',
                      col.align === 'center' && 'text-center',
                      col.align === 'right'  && 'text-right',
                    )}
                  >
                    {getCellValue(row, col)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
