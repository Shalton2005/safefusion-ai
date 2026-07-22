/**
 * ChatWindow
 *
 * Main conversation panel: shows `SuggestedPrompts` in an empty
 * conversation, otherwise the scrollable `MessageList`, with the
 * `ChatInput` pinned to the bottom. Also surfaces the hook's last error
 * as a dismissible-by-retry banner above the input.
 *
 * @example
 * <ChatWindow
 *   conversation={activeConversation}
 *   isSending={isSending}
 *   error={error}
 *   onSend={sendMessage}
 * />
 */

import { BrainCircuit } from 'lucide-react';
import { Alert } from '@/components/ui';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestedPrompts } from './SuggestedPrompts';
import type { CopilotConversation } from '../types';

export interface ChatWindowProps {
  conversation: CopilotConversation | null;
  isSending: boolean;
  error: string | null;
  onSend: (content: string) => void;
  /** Shows incident-focused suggested prompts while true; generic prompts otherwise. */
  inEmergency?: boolean;
}

export function ChatWindow({ conversation, isSending, error, onSend, inEmergency = false }: ChatWindowProps) {
  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0;

  return (
    <div className="flex-1 flex flex-col w-full h-full min-w-0">
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center overflow-y-auto motion-safe:animate-fade-in">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary-600/10 text-primary-400 border border-primary-600/20 motion-safe:animate-scale-in">
              <BrainCircuit className="w-7 h-7" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)] tracking-tight">AI Safety Copilot</h2>
              <p className="mt-1.5 text-sm text-[var(--sf-text-tertiary)] leading-relaxed max-w-md">
                Ask about safety procedures, compliance requirements, and incident response — grounded in your
                plant's ingested regulatory documents.
              </p>
            </div>
          </div>
          <SuggestedPrompts inEmergency={inEmergency} onSelect={onSend} disabled={isSending} />
        </div>
      ) : (
        <MessageList messages={messages} isSending={isSending} />
      )}

      <div className="px-6 pb-6 pt-2">
        {error && (
          <div className="max-w-5xl mx-auto mb-3 motion-safe:animate-slide-in-up">
            <Alert variant="danger">{error}</Alert>
          </div>
        )}
        <div className="max-w-5xl mx-auto">
          <ChatInput onSend={onSend} disabled={isSending} />
          <p className="mt-2 text-2xs text-center text-[var(--sf-text-tertiary)] leading-relaxed">
            AI Safety Copilot can surface retrieved reference material. Always verify against official procedures.
          </p>
        </div>
      </div>
    </div>
  );
}
