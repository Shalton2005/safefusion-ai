// ─── AI Safety Copilot — domain types ─────────────────────────────

/** Who authored a given message in a conversation. */
export type CopilotMessageRole = 'user' | 'assistant';

/** Lifecycle state of an assistant message as it streams in. */
export type CopilotMessageStatus = 'pending' | 'complete' | 'error';

/** A supporting document chunk the copilot's answer is grounded in. */
export interface CopilotSourceChunk {
  id: string;
  /** Source document name, e.g. "OISD-STD-118". */
  source: string;
  title: string | null;
  /** Short excerpt used to justify the answer, not the full chunk text. */
  excerpt: string;
  /** Cosine similarity, 0-1 — higher is more relevant. */
  similarity: number;
}

export interface CopilotMessage {
  id: string;
  role: CopilotMessageRole;
  content: string;
  status: CopilotMessageStatus;
  createdAt: string;
  /** Populated on assistant messages once retrieval completes. */
  sources?: CopilotSourceChunk[];
}

/** A saved conversation thread, listed in the history sidebar. */
export interface CopilotConversation {
  id: string;
  /** Derived from the first user message; falls back to "New conversation". */
  title: string;
  messages: CopilotMessage[];
  createdAt: string;
  updatedAt: string;
}

/** A canned prompt shown to the user before they've typed anything. */
export interface SuggestedPrompt {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}
