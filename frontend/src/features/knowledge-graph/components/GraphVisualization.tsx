/**
 * GraphVisualization
 *
 * Renders the knowledge graph canvas. Deliberately decoupled from
 * KnowledgeGraphPage so the rendering engine (e.g. a WebGL/canvas/SVG
 * graph library) can be swapped in later without touching page layout,
 * routing, or the surrounding panels.
 *
 * Rendering is not implemented yet — this is a placeholder shell.
 */

import { Waypoints } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface GraphVisualizationProps {
  className?: string;
}

export function GraphVisualization({ className }: GraphVisualizationProps) {
  return (
    <div
      className={cn(
        'relative w-full h-full min-h-[24rem]',
        'flex items-center justify-center',
        'rounded-xl border border-dashed border-[var(--sf-border-default)]',
        'bg-[var(--sf-surface-sunken)]',
        className,
      )}
    >
      <EmptyState
        icon={Waypoints}
        title="Graph rendering not yet implemented"
        description="The visualization engine will render nodes and relationships here."
      />
    </div>
  );
}
