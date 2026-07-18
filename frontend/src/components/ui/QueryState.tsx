/**
 * QueryState
 *
 * Standardised branch renderer for the loading / error / empty / data
 * states of a single fetched resource. Every data-fetching hook in this
 * app already surfaces `loading: boolean` and `error: string | null` (see
 * `ApiError.toUserMessage()`) — `QueryState` consumes that shape directly
 * so sections stop hand-rolling their own `if (error) {…} if (loading) {…}`
 * branches with copy-pasted `Alert` + retry `Button` JSX.
 *
 * Branch precedence: error > loading > empty > data.
 *
 * @example
 * // Skeleton loading + retryable error + empty state
 * <QueryState
 *   loading={loading}
 *   error={error}
 *   data={zones}
 *   onRetry={refresh}
 *   errorTitle="Failed to load zone overview"
 *   loadingFallback={<ZoneOverviewSkeleton />}
 *   isEmpty={(z) => z.length === 0}
 *   emptyState={<EmptyState icon={MapPin} title="No zones configured" />}
 * >
 *   {(zones) => <ZoneOverview zones={zones} />}
 * </QueryState>
 */

import { type ReactNode } from 'react';
import { RotateCw } from 'lucide-react';
import { Alert } from './Alert';
import { Button } from './Button';
import { Skeleton } from './Loader';
import { EmptyState } from './EmptyState';

// ─── Props ────────────────────────────────────────────────────────

export interface QueryStateProps<T> {
  /** True while the first fetch (or an explicit refresh) is in flight. */
  loading: boolean;
  /** Humanised error message (e.g. from `ApiError.toUserMessage()`), or `null`/`undefined` when there's no error. */
  error: string | null | undefined;
  /** The fetched data. `null`/`undefined` is treated as "not loaded yet". */
  data: T | null | undefined;
  /** Called when the user clicks "Retry" on the error state. Omit to hide the retry button. */
  onRetry?: () => void;
  /** Heading shown above the error message. @default 'Failed to load data' */
  errorTitle?: string;
  /**
   * Determines whether successfully-loaded `data` should render the empty
   * state instead of `children`. Defaults to checking array length / falsy.
   */
  isEmpty?: (data: T) => boolean;
  /** Rendered when `isEmpty(data)` is true. Defaults to a generic "No data" EmptyState. */
  emptyState?: ReactNode;
  /** Rendered while `loading` is true. Defaults to a centred `Loader`. */
  loadingFallback?: ReactNode;
  /** Data renderer — only invoked once data has loaded and is non-empty. */
  children: (data: T) => ReactNode;
  className?: string;
}

// ─── Default empty-check ─────────────────────────────────────────

function defaultIsEmpty(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0;
  return data === null || data === undefined;
}

// ─── Component ────────────────────────────────────────────────────

export function QueryState<T>({
  loading,
  error,
  data,
  onRetry,
  errorTitle = 'Failed to load data',
  isEmpty = defaultIsEmpty,
  emptyState,
  loadingFallback,
  children,
  className,
}: QueryStateProps<T>) {
  if (error) {
    return (
      <Alert
        variant="danger"
        title={errorTitle}
        actions={
          onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
              Retry
            </Button>
          )
        }
        className={className}
      >
        {error}
      </Alert>
    );
  }

  if (loading || data === null || data === undefined) {
    return (
      loadingFallback ?? (
        <div className={className} role="status" aria-label="Loading" aria-live="polite">
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      )
    );
  }

  if (isEmpty(data)) {
    return (
      emptyState ?? (
        <EmptyState title="No data" description="There's nothing here yet." className={className} />
      )
    );
  }

  return <>{children(data)}</>;
}
