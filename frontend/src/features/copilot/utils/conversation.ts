import type { CopilotConversation, CopilotMessage } from '../types';

const TITLE_MAX_LENGTH = 48;

/** Derives a conversation title from its first user message. */
export function deriveConversationTitle(messages: CopilotMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) return 'New conversation';

  const text = firstUserMessage.content.trim();
  return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH).trimEnd()}…` : text;
}

export function createConversation(): CopilotConversation {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: 'New conversation',
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createMessage(role: CopilotMessage['role'], content: string): CopilotMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    status: role === 'user' ? 'complete' : 'pending',
    createdAt: new Date().toISOString(),
  };
}
