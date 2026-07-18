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
  keyExtractor: (row: TRow) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: TRow) => void;
  className?: string;
  caption?: string;
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
    <div className={cn('overflow-x-auto rounded-card border border-[var(--color-border)]', className)}>
      <table className="w-full text-sm border-collapse">
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}

        {/* Head */}
        <thead>
          <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width }}
                className={cn(
                  'px-4 py-3 font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wider',
                  col.align === 'center' && 'text-center',
                  col.align === 'right'  && 'text-right',
                  !col.align             && 'text-left',
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
                className="py-12 text-center text-[var(--color-text-muted)]"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
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
                  'border-b border-[var(--color-border)] last:border-0',
                  'bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-secondary)]',
                  'transition-colors duration-100',
                  onRowClick && 'cursor-pointer',
                  onRowClick && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-[var(--color-text-secondary)]',
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
