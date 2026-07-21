/**
 * SuggestedPrompts
 *
 * Grid of canned starter prompts shown in the empty-conversation state.
 * Selecting one sends it immediately via `onSelect`. Switches to
 * incident-focused prompts while Plant Status is Emergency, reverting to
 * the generic reference-lookup prompts once the emergency ends.
 *
 * @example
 * <SuggestedPrompts inEmergency={inEmergency} onSelect={sendMessage} />
 */

import { AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SUGGESTED_PROMPTS, EMERGENCY_SUGGESTED_PROMPTS } from '../data/suggestedPrompts';

export interface SuggestedPromptsProps {
  /** Shows the emergency-oriented prompt set when true; falls back to the generic set otherwise. */
  inEmergency?: boolean;
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({ inEmergency = false, onSelect, disabled = false }: SuggestedPromptsProps) {
  const prompts = inEmergency ? EMERGENCY_SUGGESTED_PROMPTS : SUGGESTED_PROMPTS;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
      {prompts.map((suggestion, index) => (
        <button
          key={suggestion.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(suggestion.prompt)}
          style={{ animationDelay: `${index * 40}ms` }}
          className={cn(
            'flex items-start gap-2.5 text-left rounded-xl border px-4 py-3 text-sm motion-safe:animate-scale-in transition-[border-color,background-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
            'border-[var(--sf-border-default)] bg-[var(--sf-surface-card)] hover:border-primary-500/50 hover:bg-[var(--sf-surface-raised)] hover:shadow-[0_0_12px_-2px_var(--color-primary-500)]',
          )}
        >
          {inEmergency ? (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary-400" aria-hidden="true" />
          ) : (
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary-400" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-[var(--sf-text-primary)]">{suggestion.label}</p>
            <p className="mt-0.5 text-xs text-[var(--sf-text-tertiary)] leading-relaxed line-clamp-2">{suggestion.prompt}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
