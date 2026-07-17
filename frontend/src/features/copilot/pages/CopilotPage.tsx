/**
 * CopilotPage
 *
 * AI Safety Copilot chat interface: conversation history sidebar (drawer
 * on mobile) + chat window with suggested prompts, message history,
 * typing indicator, and message composer. Reads/writes `useCopilotStore`
 * directly — the store is this feature's single source of truth for
 * conversation/message state (see the store's doc comment).
 *
 * Unlike most feature pages, this page owns a fixed-height layout rather
 * than using `.page-container`'s natural document flow — a chat UI needs
 * its message list to scroll independently while the input stays pinned,
 * so the page fills `DashboardLayout`'s `<main>` viewport instead.
 */

import { useEffect, useState } from 'react';
import { History, PanelLeftClose } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import { useCopilotStore } from '@/store';
import { ChatWindow } from '../components/ChatWindow';
import { ConversationHistoryList } from '../components/ConversationHistoryList';

export function CopilotPage() {
  const conversationHistory = useCopilotStore((s) => s.conversationHistory);
  const conversation = useCopilotStore((s) => s.conversation);
  const messages = useCopilotStore((s) => s.messages);
  const loading = useCopilotStore((s) => s.loading);
  const error = useCopilotStore((s) => s.error);
  const sendMessage = useCopilotStore((s) => s.sendMessage);
  const startNewConversation = useCopilotStore((s) => s.startNewConversation);
  const selectConversation = useCopilotStore((s) => s.selectConversation);
  const deleteConversation = useCopilotStore((s) => s.deleteConversation);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Close the mobile history drawer on Escape, matching standard dialog behaviour.
  useEffect(() => {
    if (!isHistoryOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsHistoryOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHistoryOpen]);

  // ChatWindow expects a single CopilotConversation (messages nested inside,
  // matching the persisted history shape) — composed here from the store's
  // split conversation/messages fields so ChatWindow/MessageList/MessageBubble
  // stay unchanged.
  const activeConversation = conversation ? { ...conversation, messages } : null;

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageHeader
        title="AI Safety Copilot"
        description="Ask questions grounded in your plant's ingested safety and compliance documents."
        border
        className="flex-shrink-0"
        actions={
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden transition-transform duration-150 active:scale-95"
            leftIcon={<History className="w-4 h-4" />}
            onClick={() => setIsHistoryOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isHistoryOpen}
          >
            History
          </Button>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* History sidebar — inline on large screens */}
        <div className="hidden lg:block w-72 flex-shrink-0 border-r border-[var(--sf-border-default)]">
          <ConversationHistoryList
            conversations={conversationHistory}
            activeConversationId={conversation?.id ?? null}
            onSelect={selectConversation}
            onDelete={deleteConversation}
            onNew={startNewConversation}
          />
        </div>

        {/* History drawer — overlay on small/medium screens. z-tip (60) so it
            sits above the app sidebar's z-50 if both happen to be open at once. */}
        {isHistoryOpen && (
          <div
            className="fixed inset-0 z-tip lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Conversation history"
          >
            <div
              className="absolute inset-0 bg-black/50 motion-safe:animate-fade-in"
              onClick={() => setIsHistoryOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-[var(--sf-surface-base)] shadow-xl flex flex-col motion-safe:animate-slide-in-left">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--sf-border-default)]">
                <span className="text-sm font-semibold text-[var(--sf-text-primary)]">Conversations</span>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  aria-label="Close conversation history"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--sf-text-tertiary)] transition-colors duration-150 hover:bg-[var(--sf-surface-raised)] hover:text-[var(--sf-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <ConversationHistoryList
                className="flex-1 min-h-0"
                conversations={conversationHistory}
                activeConversationId={conversation?.id ?? null}
                onSelect={(id) => {
                  selectConversation(id);
                  setIsHistoryOpen(false);
                }}
                onDelete={deleteConversation}
                onNew={() => {
                  startNewConversation();
                  setIsHistoryOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Chat window */}
        <ChatWindow conversation={activeConversation} isSending={loading} error={error} onSend={sendMessage} />
      </div>
    </div>
  );
}
