import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GRAPH_TYPE_META, type GraphNodeKind } from '@/features/knowledge-graph/utils/graphTaxonomy';

interface CustomNodeData {
  label: string;
  kind: GraphNodeKind;
}

function CustomNodeComponent({ data, selected }: { data: CustomNodeData; selected: boolean }) {
  const kind = (data.kind as GraphNodeKind) || 'sensor';
  const meta = GRAPH_TYPE_META[kind];
  const Icon = meta?.icon;

  // Dynamically scale node size based on its importance/kind
  const sizeClass = kind === 'incident' ? 'w-20 h-20' : kind === 'zone' ? 'w-16 h-16' : 'w-12 h-12';
  const iconSize = kind === 'incident' ? 'w-8 h-8' : kind === 'zone' ? 'w-7 h-7' : 'w-5 h-5';

  return (
    <div className="relative flex flex-col items-center group cursor-pointer">
      {/* Translucent Node Bubble */}
      <div 
        className={`${sizeClass} rounded-full flex items-center justify-center transition-all duration-300 z-10
          ${selected ? 'ring-4 ring-offset-2 ring-offset-[var(--sf-surface-sunken)] ring-white scale-110 shadow-2xl' : 'group-hover:scale-110 shadow-lg'}
        `}
        style={{ 
          backgroundColor: meta?.color ? `${meta.color}CC` : '#64748bCC', // CC = 80% opacity
          border: `2px solid ${meta?.color ?? '#64748b'}`,
          boxShadow: selected ? undefined : `0 0 25px ${meta?.color ?? '#64748b'}30`,
        }}
      >
        {Icon && <Icon className={`${iconSize} text-white drop-shadow-md`} />}
      </div>

      {/* Hover Label Box (Underneath) */}
      <div className={`absolute top-full mt-2 text-center pointer-events-none z-20 transition-all duration-200
        ${selected ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-2 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100'}
      `}>
        <span className="text-[11px] font-semibold text-[var(--sf-text-primary)] bg-[var(--sf-surface-card)]/90 border border-[var(--sf-border-default)] backdrop-blur-sm px-2 py-0.5 rounded shadow-lg whitespace-nowrap">
          {data.label}
        </span>
      </div>

      {/* Invisible routing handles */}
      <Handle type="target" position={Position.Top} className="!opacity-0 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0 !border-0" />
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
