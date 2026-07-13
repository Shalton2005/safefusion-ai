/**
 * GraphControls
 *
 * Reusable toolbar for interacting with a graph canvas: search, filter
 * (placeholder), zoom in/out, and reset view. Purely props-driven — it
 * calls the handlers it's given and renders a working search input;
 * it never talks to GraphVisualization directly, so it can be reused
 * against any graph canvas that exposes the same zoom/reset shape, or
 * rendered standalone with no handlers at all.
 *
 * @example
 * const graphRef = useRef<GraphVisualizationHandle>(null);
 * <GraphControls
 *   onZoomIn={() => graphRef.current?.zoomIn()}
 *   onZoomOut={() => graphRef.current?.zoomOut()}
 *   onResetView={() => graphRef.current?.resetView()}
 *   searchValue={search}
 *   onSearchChange={setSearch}
 * />
 */

import { Search, ZoomIn, ZoomOut, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Card, Input, Button } from '@/components/ui';

export interface GraphControlsProps {
  /** Current search box value (controlled). Omit for uncontrolled/display-only usage. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Fired when the Zoom In button is clicked. */
  onZoomIn?: () => void;
  /** Fired when the Zoom Out button is clicked. */
  onZoomOut?: () => void;
  /** Fired when the Reset View button is clicked. */
  onResetView?: () => void;
  /**
   * Fired when the Filters button is clicked. Placeholder — no filter
   * panel is implemented yet, so callers can wire this up later without
   * changing GraphControls itself.
   */
  onFilterClick?: () => void;
  className?: string;
}

export function GraphControls({
  searchValue,
  onSearchChange,
  onZoomIn,
  onZoomOut,
  onResetView,
  onFilterClick,
  className,
}: GraphControlsProps) {
  return (
    <Card padding="sm" className={className ?? 'flex flex-col sm:flex-row items-stretch sm:items-center gap-3'}>
      <div className="flex-1 min-w-0">
        <Input
          placeholder="Search nodes…"
          leftAddon={<Search className="w-4 h-4" />}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          fullWidth
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Filter placeholder — no filter panel implemented yet */}
        <Button
          variant="outline"
          size="sm"
          leftIcon={<SlidersHorizontal className="w-4 h-4" />}
          onClick={onFilterClick}
        >
          Filters
        </Button>
        <Button variant="outline" size="sm" iconOnly aria-label="Zoom in" onClick={onZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" iconOnly aria-label="Zoom out" onClick={onZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" iconOnly aria-label="Reset view" onClick={onResetView}>
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
