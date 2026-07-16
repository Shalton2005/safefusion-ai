/**
 * useCopilotChat
 *
 * Owns conversation state for the AI Safety Copilot: the list of saved
 * conversations (persisted to localStorage via `useLocalStorage`, same
 * pattern as `useSidebarStore`'s collapsed flag), the active conversation,
 * and sending a message.
 *
 * `sendMessage` calls `copilotApiService.ask`, which performs retrieval
 * only (see that service's doc comment) — no AI generation happens here
 * or anywhere in this hook. The "typing" indicator reflects the in-flight
 * retrieval request, not token-by-token generation.
 *
 * @example
 * const { activeConversation, sendMessage, isSending } = useCopilotChat();
 * sendMessage('What is the confined space entry procedure?');
 */

import { useCallback, useMemo, useState } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { LS_COPILOT_KEY } from '@/constants';
import { ApiError } from '@/api/errors';
import { copilotApiService, toPlaceholderReply } from '../services/copilotApi.service';
import { createConversation, createMessage, deriveConversationTitle } from '../utils/conversation';
import type { CopilotConversation, CopilotMessage } from '../types';

export interface UseCopilotChatResult {
  conversations: CopilotConversation[];
  activeConversation: CopilotConversation | null;
  activeConversationId: string | null;
  /** True while waiting on the copilot's reply to the most recently sent message. */
  isSending: boolean;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  startNewConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
}

function touch(conversation: CopilotConversation, messages: CopilotMessage[]): CopilotConversation {
  return {
    ...conversation,
    messages,
    title: deriveConversationTitle(messages),
    updatedAt: new Date().toISOString(),
  };
}

export function useCopilotChat(): UseCopilotChatResult {
  const [conversations, setConversations] = useLocalStorage<CopilotConversation[]>(LS_COPILOT_KEY, []);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    () => conversations[0]?.id ?? null,
  );
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId],
  );

  const startNewConversation = useCallback(() => {
    const conversation = createConversation();
    setConversations((prev) => [conversation, ...prev]);
    setActiveConversationId(conversation.id);
    setError(null);
  }, [setConversations]);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setError(null);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveConversationId((current) => (current === id ? null : current));
    },
    [setConversations],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed || isSending) return;

      let conversation = activeConversation;
      if (!conversation) {
        conversation = createConversation();
        setConversations((prev) => [conversation as CopilotConversation, ...prev]);
        setActiveConversationId(conversation.id);
      }
      const conversationId = conversation.id;

      const userMessage = createMessage('user', trimmed);
      const pendingReply = createMessage('assistant', '');

      const withUserMessage = touch(conversation, [...conversation.messages, userMessage, pendingReply]);
      setConversations((prev) => prev.map((c) => (c.id === conversationId ? withUserMessage : c)));

      setIsSending(true);
      setError(null);

      try {
        const response = await copilotApiService.ask({ question: trimmed });
        const replyContent = toPlaceholderReply(response);

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = c.messages.map((m) =>
              m.id === pendingReply.id
                ? { ...m, content: replyContent, status: 'complete' as const, sources: response.sources }
                : m,
            );
            return touch(c, messages);
          }),
        );
      } catch (err) {
        const apiError = ApiError.from(err);
        const message = apiError.toUserMessage();
        setError(message);

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = c.messages.map((m) =>
              m.id === pendingReply.id
                ? { ...m, content: message, status: 'error' as const }
                : m,
            );
            return touch(c, messages);
          }),
        );
      } finally {
        setIsSending(false);
      }
    },
    [activeConversation, isSending, setConversations],
  );

  return {
    conversations,
    activeConversation,
    activeConversationId,
    isSending,
    error,
    sendMessage,
    startNewConversation,
    selectConversation,
    deleteConversation,
  };
}
