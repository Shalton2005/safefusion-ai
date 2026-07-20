import { Camera, AlertTriangle, ScanLine } from 'lucide-react';
import { Card, Badge } from '@/components/ui';

export function LiveCCTVPreview() {
  return (
    <Card className="flex flex-col overflow-hidden bg-[var(--sf-surface-card)] border-[var(--sf-border-default)] shadow-sm h-full p-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--sf-border-default)] bg-[var(--sf-surface-base)]/50">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-bold text-[var(--sf-text-primary)]">Live CCTV Preview</h2>
        </div>
        <Badge variant="danger" size="sm" dot pulsing>
          Confined-Space-1
        </Badge>
      </div>

      <div className="relative flex-1 bg-black overflow-hidden group">
        <img 
          src="/cctv-placeholder.png" 
          alt="CCTV Feed" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:mix-blend-normal group-hover:opacity-100 transition-all duration-700" 
        />
        
        {/* Bounding box mock */}
        <div className="absolute top-[20%] left-[35%] w-[30%] h-[60%] border-2 border-danger-500 bg-danger-500/10 flex items-start justify-start">
          <div className="bg-danger-500 text-white text-[9px] font-mono font-bold px-1 py-0.5 uppercase tracking-wider">Worker Detected</div>
        </div>

        {/* HUD Elements */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-danger-500/30">
            <AlertTriangle className="w-3 h-3 text-danger-500" />
            <span className="text-[10px] font-mono font-bold text-danger-500 uppercase tracking-widest">Gas Leak Warning</span>
          </div>
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded border border-safe-500/30">
            <ScanLine className="w-3 h-3 text-safe-500" />
            <span className="text-[10px] font-mono font-bold text-safe-500 uppercase tracking-widest">PPE Verified</span>
          </div>
        </div>

        {/* Bottom HUD */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-danger-500 animate-pulse" />
            <span className="text-[10px] font-mono text-danger-500 font-bold uppercase tracking-widest">Emergency</span>
          </div>
          <div className="flex items-center gap-3 text-[9px] font-mono text-white/70">
            <span>AI VISION ACTIVE</span>
            <span>CAM-04</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
