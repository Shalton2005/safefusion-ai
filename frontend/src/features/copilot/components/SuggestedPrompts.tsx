/**
 * SuggestedPrompts
 *
 * Grid of canned starter prompts shown in the empty-conversation state.
 * Selecting one sends it immediately via `onSelect`.
 *
 * @example
 * <SuggestedPrompts prompts={SUGGESTED_PROMPTS} onSelect={sendMessage} />
 */

import { Sparkles } from 'lucide-react';
import type { SuggestedPrompt } from '../types';

export interface SuggestedPromptsProps {
  prompts: SuggestedPrompt[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({ prompts, onSelect, disabled = false }: SuggestedPromptsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
      {prompts.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(suggestion.prompt)}
          className="flex items-start gap-2.5 text-left rounded-xl border border-[var(--sf-border-default)] bg-[var(--sf-surface-card)] px-4 py-3 text-sm transition-colors duration-150 hover:border-primary-500/50 hover:bg-[var(--sf-surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary-400" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-medium text-[var(--sf-text-primary)]">{suggestion.label}</p>
            <p className="mt-0.5 text-xs text-[var(--sf-text-tertiary)] line-clamp-2">{suggestion.prompt}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
