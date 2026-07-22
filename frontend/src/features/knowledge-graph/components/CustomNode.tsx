import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GRAPH_TYPE_META, type GraphNodeKind } from '@/features/knowledge-graph/utils/graphTaxonomy';

interface CustomNodeData {
  label: string;
  kind: GraphNodeKind;
}

function CustomNodeComponent({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  // Fallback to a default if kind is missing
  const kind = (data.kind as GraphNodeKind) || 'sensor';
  const meta = GRAPH_TYPE_META[kind];
  const Icon = meta?.icon;

  return (
    <div className="relative flex flex-col items-center group cursor-pointer">
      {/* Node Bubble */}
      <div 
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 z-10
          ${selected 
            ? 'ring-4 ring-offset-2 ring-offset-[var(--sf-surface-sunken)] ring-white scale-110 shadow-xl' 
            : 'group-hover:scale-110 shadow-md group-hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]'
          }
        `}
        style={{ 
          backgroundColor: meta?.color ?? '#64748b',
          boxShadow: selected ? undefined : `0 4px 14px 0 ${meta?.color ?? '#64748b'}60`,
        }}
      >
        {Icon && <Icon className="w-6 h-6 text-white drop-shadow-sm" />}
      </div>

      {/* Hover Label Box (Underneath) */}
      <div className={`absolute top-[64px] bg-[var(--sf-surface-card)] px-3 py-1.5 rounded border border-[var(--sf-border-default)] shadow-lg transition-all duration-200 z-20 whitespace-nowrap
        ${selected ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'}
      `}>
        <span className="text-xs font-semibold text-[var(--sf-text-primary)]">
          {data.label}
        </span>
      </div>

      {/* Invisible handles to connect edges exactly to the top/bottom edges of the bubble */}
      <Handle type="target" position={Position.Top} className="!opacity-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !w-0 !h-0" />
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
