import type { SuggestedPrompt } from '../types';

/** Static starter prompts shown before the user has sent a message. */
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
