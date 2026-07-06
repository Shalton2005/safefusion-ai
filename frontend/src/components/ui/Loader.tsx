import { cn } from '@/lib/cn';
import type { Size } from '@/types';

interface LoaderProps {
  size?: Size;
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  xs: 'w-4 h-4 border-2',
  sm: 'w-6 h-6 border-2',
  md: 'w-8 h-8 border-[3px]',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4',
};

export function Loader({ size = 'md', label, fullScreen = false, className }: LoaderProps) {
  const spinner = (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullScreen && 'fixed inset-0 z-50 bg-[var(--color-bg-primary)]/80 backdrop-blur-sm',
        className,
      )}
    >
      <div
        className={cn(
          'rounded-full border-primary-600 border-t-transparent animate-spin',
          sizeClasses[size],
        )}
        style={{ borderStyle: 'solid' }}
      />
      {label && (
        <span className="text-sm text-[var(--color-text-muted)]">{label}</span>
      )}
    </div>
  );

  return spinner;
}

/** Skeleton block used as loading placeholder */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[var(--color-border)]',
        className,
      )}
      style={style}
    />
  );
}
