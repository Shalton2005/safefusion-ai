/**
 * MessageList
 *
 * Scrollable list of `MessageBubble`s for the active conversation,
 * auto-scrolling to the newest message and showing `TypingIndicator`
 * while a reply is in flight. Rendered as an ARIA `log` region so
 * screen readers announce new messages as they arrive.
 *
 * @example
 * <MessageList messages={activeConversation.messages} isSending={isSending} />
 */

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import type { CopilotMessage } from '../types';

export interface MessageListProps {
  messages: CopilotMessage[];
  isSending: boolean;
}

export function MessageList({ messages, isSending }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isSending]);

  const visibleMessages = messages.filter((m) => !(m.role === 'assistant' && m.status === 'pending'));
  const isReplyPending = messages.some((m) => m.role === 'assistant' && m.status === 'pending') || isSending;

  return (
    <div
      className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Conversation messages"
    >
      <div className="flex flex-col gap-5 max-w-5xl mx-auto">
        {visibleMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {isReplyPending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
