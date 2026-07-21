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
    id: 'emergency-shutdown-checklist',
    label: 'View emergency shutdown checklist',
    prompt: 'Show the emergency shutdown checklist for the affected zone.',
  },
  {
    id: 'who-in-danger-zone',
    label: 'Who is still inside the danger zone?',
    prompt: 'Who is still inside the danger zone right now?',
  },
  {
    id: 'gas-leak-sop',
    label: 'Show gas leak SOP',
    prompt: 'Show the standard operating procedure for this gas leak.',
  },
  {
    id: 'why-evacuation-recommended',
    label: 'Why did AI recommend evacuation?',
    prompt: 'Why did the AI recommend evacuation for this zone?',
  },
  {
    id: 'affected-workers',
    label: 'List affected workers',
    prompt: 'List the workers affected by the current emergency.',
  },
  {
    id: 'open-permit-conflicts',
    label: 'Open permit conflicts',
    prompt: 'Show any open permit conflicts related to the current emergency.',
  },
  {
    id: 'cctv-evidence',
    label: 'Show CCTV evidence',
    prompt: 'Show the CCTV evidence for the current emergency.',
  },
  {
    id: 'nearest-assembly-point',
    label: 'Nearest emergency assembly point',
    prompt: 'What is the nearest emergency assembly point?',
  },
];
