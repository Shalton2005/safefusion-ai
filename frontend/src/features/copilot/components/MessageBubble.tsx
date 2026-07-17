/**
 * MessageBubble
 *
 * Renders a single chat message — user or assistant — with role-based
 * alignment/styling, an error state, and an optional source-citation list
 * for grounded assistant replies.
 *
 * @example
 * <MessageBubble message={message} />
 */

import { AlertTriangle, BrainCircuit, FileText, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui';
import { useStreamedText } from '../hooks/useStreamedText';
import type { CopilotMessage } from '../types';

export interface MessageBubbleProps {
  message: CopilotMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isError = message.status === 'error';

  // Streaming placeholder: paces the reveal of the already-fetched
  // reply (see useStreamedText's doc comment) — never alters the text.
  const shouldStream = !isUser && message.status === 'complete';
  const { displayedText, isStreaming } = useStreamedText(message.content, shouldStream);
  const content = isUser ? message.content : displayedText;
  const hasFinishedStreaming = !shouldStream || !isStreaming;

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary-600 text-white'
            : 'bg-[var(--sf-surface-raised)] border border-[var(--sf-border-default)] text-primary-400',
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4" /> : <BrainCircuit className="w-4 h-4" />}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-1.5 max-w-[80%] sm:max-w-[70%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
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
        </div>

        {/* Source citations — shown once streaming finishes so citations don't appear before the text they support. */}
        {hasFinishedStreaming && message.sources && message.sources.length > 0 && (
          <div className="flex flex-col gap-1 w-full">
            {message.sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-1.5 text-xs text-[var(--sf-text-tertiary)]"
              >
                <FileText className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                <span className="truncate">{source.title ?? source.source}</span>
                <Badge variant="ghost" size="sm" className="flex-shrink-0">
                  {Math.round(source.similarity * 100)}% match
                </Badge>
              </div>
            ))}
          </div>
        )}

        <span className="text-2xs text-[var(--sf-text-tertiary)]">
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
