import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      errorMessage,
      leftAddon,
      rightAddon,
      fullWidth = false,
      className,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);
    const isError = Boolean(errorMessage);

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--color-text-primary)]"
          >
            {label}
          </label>
        )}

        <div className={cn('relative flex items-center', fullWidth && 'w-full')}>
          {leftAddon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
              {leftAddon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={isError}
            aria-describedby={
              isError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            className={cn(
              'block rounded-lg border bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]',
              'placeholder:text-[var(--color-text-muted)] text-sm',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isError
                ? 'border-danger-500 focus:ring-danger-500'
                : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]',
              leftAddon  ? 'pl-10' : 'pl-3',
              rightAddon ? 'pr-10' : 'pr-3',
              'py-2 h-10',
              fullWidth && 'w-full',
              className,
            )}
            {...props}
          />

          {rightAddon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-[var(--color-text-muted)]">
              {rightAddon}
            </div>
          )}
        </div>

        {isError && (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-danger-500">
            {errorMessage}
          </p>
        )}
        {!isError && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-[var(--color-text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
