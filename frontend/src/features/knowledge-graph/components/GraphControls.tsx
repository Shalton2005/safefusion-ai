/**
 * GraphControls
 *
 * Toolbar for interacting with the graph: search, zoom, layout, and
 * reset actions. Purely presentational placeholders — wiring these up
 * to the visualization engine happens once rendering is implemented.
 */

import { Search, ZoomIn, ZoomOut, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Card, Input, Button } from '@/components/ui';

export function GraphControls() {
  return (
    <Card padding="sm" className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <Input
          placeholder="Search nodes…"
          leftAddon={<Search className="w-4 h-4" />}
          fullWidth
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" leftIcon={<SlidersHorizontal className="w-4 h-4" />}>
          Filters
        </Button>
        <Button variant="outline" size="sm" iconOnly aria-label="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" iconOnly aria-label="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" iconOnly aria-label="Reset view">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
