/**
 * TypingIndicator
 *
 * Shown in the message list while the copilot's reply is in flight —
 * mirrors the assistant avatar/bubble layout of `MessageBubble` so it
 * slots in seamlessly above the real reply once it arrives.
 *
 * @example
 * {isSending && <TypingIndicator />}
 */

import { BrainCircuit } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3" role="status" aria-label="AI Safety Copilot is typing">
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-[var(--sf-surface-raised)] border border-[var(--sf-border-default)] text-primary-400"
        aria-hidden="true"
      >
        <BrainCircuit className="w-4 h-4" />
      </div>

      <div className="rounded-xl rounded-tl-sm px-4 py-3 bg-[var(--sf-surface-raised)] border border-[var(--sf-border-default)]">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[var(--sf-text-tertiary)] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
