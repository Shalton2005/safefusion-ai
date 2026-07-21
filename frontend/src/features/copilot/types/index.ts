// ─── AI Safety Copilot — domain types ─────────────────────────────

/** Who authored a given message in a conversation. */
type CopilotMessageRole = 'user' | 'assistant';

/** Lifecycle state of an assistant message as it streams in. */
type CopilotMessageStatus = 'pending' | 'complete' | 'error';

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

/** One agent's contribution to an assistant reply, for the explainability footer's "Evidence" line. */
export interface CopilotEvidenceItem {
  /** Human-readable label for the agent, e.g. "Matching procedures". */
  label: string;
  /** Number of citations/matches this agent contributed. */
  count: number;
}

/**
 * Explainability data for a single assistant reply — confidence, the
 * distinct sources it drew on, per-agent evidence counts, and when it was
 * generated. Derived entirely from real per-reply data (`reasoning.agent_traces`
 * from `POST /ai/chat`), never fabricated — see `copilotApiService.ask`.
 */
export interface CopilotExplainability {
  /** 0-100, the share of agents that ran for this reply that succeeded. */
  confidence: number;
  /** Distinct source/document names cited across all agents. */
  sources: string[];
  evidence: CopilotEvidenceItem[];
  /** ISO timestamp this reply was generated — same as the message's own `createdAt`, kept alongside for footer rendering. */
  generatedAt: string;
}

export interface CopilotMessage {
  id: string;
  role: CopilotMessageRole;
  content: string;
  status: CopilotMessageStatus;
  createdAt: string;
  /** Populated on assistant messages once retrieval completes. */
  sources?: CopilotSourceChunk[];
  /**
   * Marks this assistant message as a proactively generated brief (e.g. an
   * emergency briefing auto-surfaced on load) rather than a reply to a user
   * question — `MessageBubble` renders its confidence/sources header only
   * when this is set.
   */
  briefing?: {
    label: string;
    confidence: number;
  };
  /** Collapsible confidence/sources/evidence footer — populated on completed assistant replies. */
  explainability?: CopilotExplainability;
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
