/**
 * MessageBubble
 *
 * Renders a single chat message — user or assistant — with role-based
 * alignment/styling, an error state, and an optional source-citation list
 * for grounded assistant replies. Entrance/streaming animations respect
 * `prefers-reduced-motion` via Tailwind's `motion-safe:` variant.
 *
 * @example
 * <MessageBubble message={message} />
 */

import { AlertTriangle, BrainCircuit, FileText, Siren, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui';
import { formatRelativeTime } from '@/utils/format';
import { useStreamedText } from '../hooks/useStreamedText';
import { BRIEFING_DATA_SOURCES } from '../utils/emergencyBriefing';
import { ExplainabilityFooter } from './ExplainabilityFooter';
import type { CopilotMessage } from '../types';

export interface MessageBubbleProps {
  message: CopilotMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';
  const isBriefing = !isUser && Boolean(message.briefing);

  // Streaming placeholder: paces the reveal of the already-fetched
  // reply (see useStreamedText's doc comment) — never alters the text.
  const shouldStream = !isUser && message.status === 'complete';
  const { displayedText, isStreaming } = useStreamedText(message.content, shouldStream);
  const content = isUser ? message.content : displayedText;
  const hasFinishedStreaming = !shouldStream || !isStreaming;

  return (
    <div
      className={cn(
        'flex items-start gap-3 motion-safe:animate-slide-in-up',
        isUser && 'flex-row-reverse',
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          'transition-colors duration-200',
          isUser
            ? 'bg-primary-600 text-white'
            : isBriefing
              ? 'bg-danger-500/15 border border-danger-500/30 text-danger-500'
              : 'bg-[var(--sf-surface-raised)] border border-[var(--sf-border-default)] text-primary-400',
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4" /> : isBriefing ? <Siren className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-1.5', isBriefing ? 'max-w-[95%] sm:max-w-[85%]' : 'max-w-[80%] sm:max-w-[70%]', isUser && 'items-end')}>
        {/* Briefing header — proactive framing: what triggered this, how fresh it is, how confident the model is. */}
        {isBriefing && message.briefing && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-0.5 text-xs">
            <span className="font-semibold text-danger-500">{message.briefing.label}.</span>
            <span className="text-[var(--sf-text-tertiary)]">Generated {formatRelativeTime(message.createdAt)}</span>
            <Badge variant="danger" size="sm">Confidence {message.briefing.confidence}%</Badge>
          </div>
        )}

        {/* "Based on" data streams — grounds the briefing before showing its conclusions. */}
        {isBriefing && (
          <div className="mb-1 text-xs text-[var(--sf-text-tertiary)]">
            <span className="font-medium text-[var(--sf-text-secondary)]">Based on:</span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {BRIEFING_DATA_SOURCES.map((source) => (
                <li key={source} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-[var(--sf-text-tertiary)] flex-shrink-0" aria-hidden="true" />
                  {source}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          className={cn(
            'rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
            'transition-colors duration-200',
            isUser && 'bg-primary-600 text-white rounded-tr-sm',
            !isUser && !isError && 'bg-[var(--sf-surface-raised)] text-[var(--sf-text-primary)] border border-[var(--sf-border-default)] rounded-tl-sm',
            !isUser && isError && 'bg-danger-500/10 text-danger-600 dark:text-danger-400 border border-danger-500/30 rounded-tl-sm',
          )}
        >
          {isError && (
            <div className="flex items-center gap-1.5 mb-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
              <span>Something went wrong</span>
            </div>
          )}
          {content}
          {!isUser && isStreaming && (
            <span
              className="inline-block w-[2px] h-[1em] ml-0.5 -mb-[0.1em] bg-current motion-safe:animate-blink align-middle"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Source citations — shown once streaming finishes so citations don't appear before the text they support. */}
        {hasFinishedStreaming && message.sources && message.sources.length > 0 && (
          <div className="flex flex-col gap-1 w-full motion-safe:animate-fade-in">
            {isBriefing && (
              <span className="text-xs font-medium text-[var(--sf-text-secondary)]">References</span>
            )}
            {message.sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-1.5 text-xs text-[var(--sf-text-tertiary)]"
              >
                <FileText className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{source.source}{source.title ? ` · ${source.title}` : ''}</span>
                {!isBriefing && (
                  <Badge variant="ghost" size="sm" className="flex-shrink-0">
                    {Math.round(source.similarity * 100)}% match
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        <span className="text-2xs text-[var(--sf-text-tertiary)] tabular-nums">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Explainability footer — collapsed by default, shown once streaming finishes for the same reason citations wait. */}
        {!isBriefing && hasFinishedStreaming && message.explainability && (
          <ExplainabilityFooter data={message.explainability} />
        )}
      </div>
    </div>
  );
}
