import type { CopilotConversation } from '../types';

export type ConversationGroupLabel = 'Today' | 'Yesterday' | 'Earlier';

export interface ConversationGroup {
  label: ConversationGroupLabel;
  conversations: CopilotConversation[];
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Buckets conversations by `updatedAt` into Today/Yesterday/Earlier, most-recent-first within each — mirrors how most chat products (Slack, ChatGPT) surface history. */
export function groupConversationsByDate(conversations: CopilotConversation[]): ConversationGroup[] {
  const todayStart = startOfDay(new Date());
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const today: CopilotConversation[] = [];
  const yesterday: CopilotConversation[] = [];
  const earlier: CopilotConversation[] = [];

  for (const conversation of conversations) {
    const updatedStart = startOfDay(new Date(conversation.updatedAt));
    if (updatedStart >= todayStart) today.push(conversation);
    else if (updatedStart >= yesterdayStart) yesterday.push(conversation);
    else earlier.push(conversation);
  }

  return [
    { label: 'Today', conversations: today },
    { label: 'Yesterday', conversations: yesterday },
    { label: 'Earlier', conversations: earlier },
  ].filter((group) => group.conversations.length > 0);
}

/** Clock time for Today/Yesterday items, short date for Earlier — keeps each group's timestamp at the resolution that's actually useful. */
export function formatConversationTimestamp(iso: string, group: ConversationGroupLabel): string {
  const date = new Date(iso);
  if (group === 'Earlier') {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
