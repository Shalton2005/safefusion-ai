/**
 * Input
 *
 * Form text field with label, helper/error text, icon addons, size
 * variants, required indicator, and optional textarea mode.
 *
 * Uses React.useId to generate stable, collision-free element IDs.
 *
 * @example
 * // Basic
 * <Input label="Email" type="email" placeholder="you@example.com" required />
 *
 * // With icon addons
 * <Input
 *   label="Search"
 *   leftAddon={<Search className="w-4 h-4" />}
 *   placeholder="Search devices…"
 * />
 *
 * // Error state
 * <Input label="Password" errorMessage="Must be at least 8 characters." />
 *
 * // Textarea
 * <Input as="textarea" label="Notes" rows={4} />
 */

import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Size } from '@/types';

// ─── Types ────────────────────────────────────────────────────────

/** Visual height / font size of the input field. @default 'md' */
export type InputFieldSize = Extract<Size, 'sm' | 'md' | 'lg'>;

// ─── Shared props ─────────────────────────────────────────────────

interface InputBaseProps {
  /** Renders a <label> element above the field. */
  label?: string;
  /** Supporting text shown below the field when there is no error. */
  helperText?: string;
  /**
   * Error message shown below the field.
   * Sets `aria-invalid` and styles the border red.
   */
  errorMessage?: string;
  /** Node rendered inside the left side of the field (icon, currency symbol, etc.). */
  leftAddon?: ReactNode;
  /** Node rendered inside the right side of the field (icon, clear button, etc.). */
  rightAddon?: ReactNode;
  /** Stretches to fill the container width. @default false */
  fullWidth?: boolean;
  /** Visual size of the field. @default 'md' */
  fieldSize?: InputFieldSize;
  /**
   * Appends a required asterisk (*) to the label and sets aria-required.
   * @default false
   */
  required?: boolean;
  /**
   * Renders a <textarea> instead of an <input>.
   * @default 'input'
   */
  as?: 'input' | 'textarea';
}

export interface InputProps
  extends InputBaseProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {}

export interface TextareaInputProps
  extends InputBaseProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  as: 'textarea';
}

// ─── Style Maps ───────────────────────────────────────────────────

const fieldSizeMap: Record<InputFieldSize, { field: string; addonWidth: string }> = {
  sm: { field: 'h-8  text-xs  py-1.5', addonWidth: 'pl-8  pr-8' },
  md: { field: 'h-10 text-sm  py-2',   addonWidth: 'pl-9  pr-9' },
  lg: { field: 'h-12 text-base py-3',  addonWidth: 'pl-10 pr-10' },
};

const baseFieldClass = [
  'block w-full rounded-lg border',
  'bg-[var(--sf-surface-sunken)] text-[var(--sf-text-primary)]',
  'placeholder:text-[var(--sf-text-tertiary)]',
  'transition-colors duration-150',
  'focus:outline-none focus:ring-2 focus:border-[var(--sf-border-focus)]',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

// ─── Component ────────────────────────────────────────────────────

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps | TextareaInputProps
>(
  (
    {
      label,
      helperText,
      errorMessage,
      leftAddon,
      rightAddon,
      fullWidth = false,
      fieldSize = 'md',
      required  = false,
      as        = 'input',
      className,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const autoId  = useId();
    const fieldId = id ?? autoId;
    const helpId  = `${fieldId}-help`;
    const errId   = `${fieldId}-err`;
    const isError = Boolean(errorMessage);

    const { field: fieldHeightClass, addonWidth } = fieldSizeMap[fieldSize];

    const fieldClass = cn(
      baseFieldClass,
      fieldHeightClass,
      isError
        ? 'border-danger-500 focus:ring-danger-500/30'
        : 'border-[var(--sf-border-default)] hover:border-[var(--sf-border-strong)] focus:ring-primary-500/30',
      leftAddon  ? addonWidth.split(' ')[0] : 'pl-3',
      rightAddon ? addonWidth.split(' ')[1] : 'pr-3',
      as === 'textarea' && 'h-auto resize-y py-2.5 leading-relaxed',
      className,
    );

    const describedBy = [
      isError ? errId : '',
      !isError && helperText ? helpId : '',
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label
            htmlFor={fieldId}
            className="text-sm font-medium text-[var(--sf-text-primary)] leading-none"
          >
            {label}
            {required && (
              <span className="ml-0.5 text-danger-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        {/* Field wrapper */}
        <div className={cn('relative flex items-center', fullWidth && 'w-full')}>
          {leftAddon && (
            <span className="absolute left-3 flex items-center pointer-events-none text-[var(--sf-text-tertiary)]">
              {leftAddon}
            </span>
          )}

          {as === 'textarea' ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              id={fieldId}
              disabled={disabled}
              required={required}
              aria-required={required || undefined}
              aria-invalid={isError || undefined}
              aria-describedby={describedBy}
              className={fieldClass}
              {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              id={fieldId}
              disabled={disabled}
              required={required}
              aria-required={required || undefined}
              aria-invalid={isError || undefined}
              aria-describedby={describedBy}
              className={fieldClass}
              {...(props as InputHTMLAttributes<HTMLInputElement>)}
            />
          )}

          {rightAddon && (
            <span className="absolute right-3 flex items-center text-[var(--sf-text-tertiary)]">
              {rightAddon}
            </span>
          )}
        </div>

        {/* Error */}
        {isError && (
          <p id={errId} role="alert" className="text-xs text-danger-500 leading-snug">
            {errorMessage}
          </p>
        )}

        {/* Helper */}
        {!isError && helperText && (
          <p id={helpId} className="text-xs text-[var(--sf-text-tertiary)] leading-snug">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
