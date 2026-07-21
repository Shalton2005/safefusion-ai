/**
 * ExplainabilityFooter
 *
 * Compact, collapsed-by-default footer under an assistant reply showing
 * why the answer can be trusted: confidence, the sources it drew on, a
 * per-agent evidence breakdown, and when it was generated. Deliberately
 * lighter than `Collapsible` (no bordered box) — a text-scale toggle
 * that reads as metadata, not another card, so it doesn't compete with
 * the reply itself.
 *
 * @example
 * <ExplainabilityFooter data={message.explainability} />
 */

import { useState } from 'react';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CONFIDENCE_TIER_TEXT_CLASS, confidenceTier } from '@/utils/severity';
import type { CopilotExplainability } from '../types';

export interface ExplainabilityFooterProps {
  data: CopilotExplainability;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-2xs font-semibold uppercase tracking-wide text-[var(--sf-text-tertiary)]">{label}</span>
      {children}
    </div>
  );
}

export function ExplainabilityFooter({ data }: ExplainabilityFooterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { confidence, sources, evidence, generatedAt } = data;
  const tier = confidenceTier(confidence);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="flex items-center gap-1.5 text-2xs text-[var(--sf-text-tertiary)] hover:text-[var(--sf-text-secondary)] transition-colors duration-150 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary-500 rounded"
      >
        <ShieldCheck className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
        <span>Explain this answer</span>
        <span className={cn('font-semibold tabular-nums', CONFIDENCE_TIER_TEXT_CLASS[tier])}>{confidence}%</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform duration-150', isOpen && 'rotate-180')} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="mt-2 flex flex-col gap-2.5 text-xs pl-4 border-l border-[var(--sf-border-subtle)] motion-safe:animate-fade-in">
          <Row label="Confidence">
            <span className={cn('font-semibold tabular-nums', CONFIDENCE_TIER_TEXT_CLASS[tier])}>{confidence}%</span>
          </Row>

          {sources.length > 0 && (
            <Row label="Sources">
              <ul className="flex flex-col gap-0.5 text-[var(--sf-text-secondary)]">
                {sources.map((source) => (
                  <li key={source}>{source}</li>
                ))}
              </ul>
            </Row>
          )}

          {evidence.length > 0 && (
            <Row label="Evidence">
              <ul className="flex flex-col gap-0.5 text-[var(--sf-text-secondary)]">
                {evidence.map((item) => (
                  <li key={item.label}>{item.count} {item.label.toLowerCase()}</li>
                ))}
              </ul>
            </Row>
          )}

          <Row label="Generated">
            <span className="text-[var(--sf-text-secondary)] tabular-nums">
              {new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </Row>
        </div>
      )}
    </div>
  );
}
