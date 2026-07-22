import type { SuggestedPrompt } from '../types';

/** Static starter prompts shown before the user has sent a message, outside an active emergency. */
export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'gas-leak-procedure',
    label: 'Gas leak procedure',
    prompt: 'What is the standard procedure for responding to a gas leak in a confined space?',
  },
  {
    id: 'permit-requirements',
    label: 'Hot work permit requirements',
    prompt: 'What are the OISD requirements for issuing a hot work permit?',
  },
  {
    id: 'compliance-factory-act',
    label: 'Factory Act compliance',
    prompt: 'Summarize the Factory Act obligations for reporting a workplace incident.',
  },
  {
    id: 'evacuation-criteria',
    label: 'Evacuation criteria',
    prompt: 'Under what risk conditions should a zone be evacuated?',
  },
];

/**
 * Starter prompts shown instead of `SUGGESTED_PROMPTS` while Plant Status is
 * Emergency — oriented around acting on the active incident rather than
 * general reference lookup. Reverts to the generic list as soon as the
 * emergency ends (see `SuggestedPrompts`' `inEmergency` prop).
 */
export const EMERGENCY_SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: 'who-in-danger-zone',
    label: 'Personnel in danger zone',
    prompt: 'Who is currently inside the danger zone and have they been accounted for?',
  },
  {
    id: 'emergency-shutdown-checklist',
    label: 'Emergency shutdown checklist',
    prompt: 'Show the emergency shutdown checklist for the affected facility zone.',
  },
  {
    id: 'active-incident-sop',
    label: 'Standard Operating Procedures',
    prompt: 'What are the standard operating procedures for resolving this specific type of emergency?',
  },
  {
    id: 'why-evacuation-recommended',
    label: 'Explain AI reasoning',
    prompt: 'Explain the reasoning behind the AI Supervisor\'s recommended emergency response.',
  },
  {
    id: 'open-permit-conflicts',
    label: 'Active permit conflicts',
    prompt: 'Are there any active permits in the area that conflict with the current emergency?',
  },
  {
    id: 'nearest-assembly-point',
    label: 'Safe assembly point',
    prompt: 'What is the safest and nearest assembly point considering the current hazard?',
  },
];
