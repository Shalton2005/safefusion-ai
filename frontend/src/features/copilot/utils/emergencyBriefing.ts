import { createMessage } from './conversation';
import type { CopilotMessage } from '../types';

/** Data streams the briefing is grounded in — shown under "Based on" in the bubble. */
const BRIEFING_DATA_SOURCES = [
  'Live CCTV analytics',
  'IoT Sensor Network',
  'Permit System',
  'Worker Location',
  'OISD Guidelines',
];

/** Regulatory references — reuses the existing source-citation slot ("References"). */
const BRIEFING_REFERENCES = [
  { source: 'OISD-105', title: 'Section 4.2' },
  { source: 'Factory Act', title: 'Section 41B' },
  { source: 'OSHA 1910.146', title: null },
];

const BRIEFING_SUMMARY =
  'High compound risk detected around Tank Farm A A-12. Gas concentration has exceeded warning thresholds ' +
  'while an active Hot Work permit remains open. Two workers remain inside the affected exclusion zone.';

const BRIEFING_RECOMMENDATIONS = [
  'Suspend Hot Work',
  'Evacuate Zone',
  'Dispatch Safety Officer',
  'Validate Gas Sensors',
];

/**
 * Builds the auto-generated emergency briefing shown in place of the "No
 * conversations yet" empty state when the page loads during an active
 * emergency — so the Copilot opens already reporting what it knows instead
 * of waiting to be asked. Rendered through the same `MessageBubble` as any
 * assistant reply; `briefing` metadata drives the extra confidence/sources
 * header and `sources` reuses the existing citation list for "References".
 */
export function buildEmergencyBriefingMessage(): CopilotMessage {
  const body = [
    BRIEFING_SUMMARY,
    '',
    'Immediate Recommendations',
    ...BRIEFING_RECOMMENDATIONS.map((action, i) => `${i + 1}. ${action}`),
  ].join('\n');

  return {
    ...createMessage('assistant', body),
    status: 'complete',
    briefing: { label: 'Emergency detected', confidence: 98 },
    sources: BRIEFING_REFERENCES.map((ref, i) => ({
      id: `briefing-ref-${i}`,
      source: ref.source,
      title: ref.title,
      excerpt: '',
      similarity: 1,
    })),
  };
}

export { BRIEFING_DATA_SOURCES };
