/**
 * CopilotPage
 *
 * AI Safety Copilot chat interface: conversation history sidebar (drawer
 * on mobile) + chat window with suggested prompts, message history,
 * typing indicator, and message composer.
 *
 * Unlike most feature pages, this page owns a fixed-height layout rather
 * than using `.page-container`'s natural document flow — a chat UI needs
 * its message list to scroll independently while the input stays pinned,
 * so the page fills `DashboardLayout`'s `<main>` viewport instead.
 */

import { useState } from 'react';
import { History, PanelLeftClose } from 'lucide-react';
import { PageHeader, Button } from '@/components/ui';
import { useCopilotChat } from '../hooks/useCopilotChat';
import { ChatWindow } from '../components/ChatWindow';
import { ConversationHistoryList } from '../components/ConversationHistoryList';

export function CopilotPage() {
  const {
    conversations,
    activeConversation,
    activeConversationId,
    isSending,
    error,
    sendMessage,
    startNewConversation,
    selectConversation,
    deleteConversation,
  } = useCopilotChat();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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
            className="lg:hidden"
            leftIcon={<History className="w-4 h-4" />}
            onClick={() => setIsHistoryOpen(true)}
          >
            History
          </Button>
        }
      />

      <div className="flex flex-1 min-h-0">
        {/* History sidebar — inline on large screens */}
        <div className="hidden lg:block w-72 flex-shrink-0 border-r border-[var(--sf-border-default)]">
          <ConversationHistoryList
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelect={selectConversation}
            onDelete={deleteConversation}
            onNew={startNewConversation}
          />
        </div>

        {/* History drawer — overlay on small/medium screens */}
        {isHistoryOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setIsHistoryOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-[var(--sf-surface-base)] shadow-xl flex flex-col">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--sf-border-default)]">
                <span className="text-sm font-semibold text-[var(--sf-text-primary)]">Conversations</span>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  aria-label="Close conversation history"
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--sf-text-tertiary)] hover:bg-[var(--sf-surface-raised)] hover:text-[var(--sf-text-primary)]"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <ConversationHistoryList
                className="flex-1 min-h-0"
                conversations={conversations}
                activeConversationId={activeConversationId}
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
        <ChatWindow conversation={activeConversation} isSending={isSending} error={error} onSend={sendMessage} />
      </div>
    </div>
  );
}
