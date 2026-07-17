/**
 * ConversationHistoryList
 *
 * Sidebar list of saved copilot conversations — new conversation action,
 * per-item select/delete, active-state highlight, and an empty state.
 *
 * @example
 * <ConversationHistoryList
 *   conversations={conversations}
 *   activeConversationId={activeConversationId}
 *   onSelect={selectConversation}
 *   onDelete={deleteConversation}
 *   onNew={startNewConversation}
 * />
 */

import { MessageSquarePlus, MessageSquareText, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, EmptyState } from '@/components/ui';
import type { CopilotConversation } from '../types';

export interface ConversationHistoryListProps {
  conversations: CopilotConversation[];
  activeConversationId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  className?: string;
}

export function ConversationHistoryList({
  conversations,
  activeConversationId,
  onSelect,
  onDelete,
  onNew,
  className,
}: ConversationHistoryListProps) {
  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="p-3 border-b border-[var(--sf-border-default)]">
        <Button
          variant="outline"
          size="sm"
          fullWidth
          leftIcon={<MessageSquarePlus className="w-4 h-4" />}
          onClick={onNew}
        >
          New conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <EmptyState
            size="sm"
            icon={MessageSquareText}
            title="No conversations yet"
            description="Start a new conversation to see it here."
          />
        ) : (
          <ul className="flex flex-col gap-1" aria-label="Saved conversations">
            {conversations.map((conversation) => {
              const isActive = conversation.id === activeConversationId;
              return (
                <li key={conversation.id} className="motion-safe:animate-fade-in">
                  <div
                    className={cn(
                      'group flex items-center gap-1 rounded-lg pr-1',
                      'transition-[background-color,border-color] duration-150',
                      isActive
                        ? 'bg-primary-600/10 border border-primary-600/30'
                        : 'border border-transparent hover:bg-[var(--sf-surface-raised)]',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className="flex-1 min-w-0 text-left px-3 py-2.5 text-sm rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset"
                    >
                      <p
                        className={cn(
                          'truncate font-medium transition-colors duration-150',
                          isActive ? 'text-primary-400' : 'text-[var(--sf-text-primary)]',
                        )}
                      >
                        {conversation.title}
                      </p>
                      <p className="truncate text-xs text-[var(--sf-text-tertiary)]">
                        {new Date(conversation.updatedAt).toLocaleDateString()}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(conversation.id)}
                      aria-label={`Delete conversation "${conversation.title}"`}
                      className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-md text-[var(--sf-text-tertiary)] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-danger-500 hover:bg-danger-500/10 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-danger-500 focus:outline-none transition-[opacity,background-color,color] duration-150"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
