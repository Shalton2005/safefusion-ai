import { useMemo, useState } from 'react';
import { AlertTriangle, HardHat, ShieldCheck, ShieldAlert, Activity, X } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Table, Skeleton, Alert, Button } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import type { Worker } from '@/types';
import { useWorkers } from '../hooks/useWorkers';
import { usePpeViolations } from '@/features/computer-vision/hooks/usePpeViolations';
import { useEmergencyResponse } from '@/features/emergency/hooks/useEmergencyResponse';
import { useZoneOverview } from '@/features/dashboard/hooks/useZoneOverview';
import { formatLabel, formatRelativeTime } from '@/utils/format';

interface EnrichedWorker extends Worker {
  contextualStatus: string;
  riskScore: number;
  missingPpeItems: string[];
  isEmergency: boolean;
  isHighRiskZone: boolean;
}

const columns: TableColumn<EnrichedWorker>[] = [
  {
    key: 'name',
    header: 'Worker',
    accessor: 'name',
    render: (v, row) => (
      <div className="flex items-center gap-2">
        {row.isEmergency && <span className="emergency-row-marker hidden" />}
        {row.isEmergency && <AlertTriangle className="w-4 h-4 text-danger-500" />}
        <span className="font-medium text-[var(--sf-text-primary)]">{v as string}</span>
      </div>
    ),
  },
  { key: 'role', header: 'Role', accessor: 'role' },
  { key: 'zone', header: 'Zone', accessor: 'current_zone', render: (v) => (v as string) || 'Off-site' },
  {
    key: 'status',
    header: 'Status',
    accessor: 'contextualStatus',
    render: (v, row) => {
      let variant: 'success' | 'warning' | 'danger' | 'default' = 'default';
      if (row.isEmergency) variant = 'danger';
      else if (row.isHighRiskZone || v === 'Inside Restricted Zone') variant = 'warning';
      else if (v === 'Idle') variant = 'warning';
      else if (v === 'Working') variant = 'success';

      return (
        <Badge variant={variant} size="sm" dot>
          {v as string}
        </Badge>
      );
    },
  },
  {
    key: 'ppe_status',
    header: 'PPE Compliance',
    accessor: 'ppe_status',
    render: (v, row) => {
      if (row.missingPpeItems.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {row.missingPpeItems.map(item => (
              <Badge key={item} variant="danger" size="sm">
                Missing {formatLabel(item)}
              </Badge>
            ))}
          </div>
        );
      }
      if (!v) {
        return (
          <Badge variant="danger" size="sm">
            Violation Detected
          </Badge>
        );
      }
      return (
        <Badge variant="success" size="sm">
          Fully Compliant
        </Badge>
      );
    },
  },
];

export function WorkersPage() {
  const { workers, loading, error } = useWorkers();
  const { violations } = usePpeViolations();
  const { actions } = useEmergencyResponse();
  const { zones } = useZoneOverview();

  const [selectedWorker, setSelectedWorker] = useState<EnrichedWorker | null>(null);

  const enrichedWorkers = useMemo(() => {
    return workers.map((worker) => {
      let isEmergency = false;
      let contextualStatus = '';
      let riskScore = 5;

      const workerViolations = violations?.filter(v => v.workerId === worker.id) || [];
      const missingItems = workerViolations.flatMap(v => v.missingItems);

      const zoneActions = actions?.filter(a => a.zone === worker.current_zone) || [];
      const isEvacuating = zoneActions.some(a => a.action === 'evacuate_area');

      const zoneOverview = zones?.find(z => z.zone === worker.current_zone);
      const isHighRiskZone = zoneOverview?.risk_level === 'critical';

      if (worker.status === 'emergency') {
        isEmergency = true;
        riskScore = 1;
        contextualStatus = isEvacuating ? 'Evacuating' : 'Emergency';
      } else if (missingItems.length > 0 || !worker.ppe_status) {
        riskScore = 2;
        contextualStatus = isHighRiskZone ? 'Inside Restricted Zone' : (worker.status === 'idle' ? 'Idle' : 'Working');
      } else if (isHighRiskZone) {
        riskScore = 3;
        contextualStatus = 'Inside Restricted Zone';
      } else if (worker.status === 'idle') {
        riskScore = 4;
        contextualStatus = 'Idle';
      } else {
        riskScore = 5;
        contextualStatus = worker.status === 'working' ? 'Working' : 'Offline';
      }

      return {
        ...worker,
        isEmergency,
        isHighRiskZone,
        contextualStatus,
        riskScore,
        missingPpeItems: missingItems,
      } as EnrichedWorker;
    }).sort((a, b) => a.riskScore - b.riskScore);
  }, [workers, violations, actions, zones]);

  const activeWorkers = workers.filter((w) => w.status === 'working').length;
  const compliantCount = workers.filter((w) => w.ppe_status).length;
  const violationCount = workers.filter((w) => !w.ppe_status).length;
  const emergencyCount = enrichedWorkers.filter(w => w.isEmergency).length;
  const restrictedZoneCount = enrichedWorkers.filter(w => w.isHighRiskZone && !w.isEmergency).length;

  const selectedWorkerViolations = violations?.filter(v => v.workerId === selectedWorker?.id) || [];
  const latestViolation = selectedWorkerViolations[0]; // Take first available violation for context

  return (
    <div className="page-container">
      <style>{`
        tr:has(.emergency-row-marker) {
          background-color: rgba(239, 68, 68, 0.05) !important;
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <PageHeader
        title="AI Worker Monitoring"
        description="Live contextual monitoring of worker locations, PPE compliance, and operational risks."
        border={false}
        className="px-0 pt-0"
        badge={
          <Badge variant="primary" size="sm" dot>
            {activeWorkers} active
          </Badge>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="text-center">
          <HardHat className="w-5 h-5 mx-auto text-primary-500" />
          <div className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : workers.length}
          </div>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Total Monitored</p>
        </Card>
        <Card padding="sm" className="text-center">
          <ShieldCheck className="w-5 h-5 mx-auto text-safe-500" />
          <div className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : compliantCount}
          </div>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Fully Compliant</p>
        </Card>
        <Card padding="sm" className="text-center">
          <ShieldAlert className="w-5 h-5 mx-auto text-danger-500" />
          <div className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : violationCount}
          </div>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Violations Detected</p>
        </Card>
      </div>

      <Card padding="none">
        <CardHeader title="Live Risk Assessment" className="px-6 pt-5 pb-0" />
        <div className="p-4">
          {error && (
            <Alert variant="danger" title="Failed to load workers" className="mb-4">
              {error}
            </Alert>
          )}
          <Table<EnrichedWorker>
            columns={columns}
            data={enrichedWorkers}
            loading={loading}
            keyExtractor={(r) => r.id}
            caption="List of workers sorted by operational risk"
            emptyMessage="No workers found."
            onRowClick={(row) => setSelectedWorker(row)}
          />
          
          <div className="mt-4 p-4 border border-[var(--sf-border-default)] rounded-xl bg-[var(--sf-surface-sunken)]">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-primary-500" />
              <h4 className="text-sm font-semibold text-[var(--sf-text-primary)]">AI Monitoring Summary</h4>
            </div>
            <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">
              AI is currently monitoring {workers.length} workers.
              <br />
              {emergencyCount > 0 ? (
                <span className="text-danger-500 font-medium">{emergencyCount} require immediate attention. </span>
              ) : (
                "0 require immediate attention. "
              )}
              {violationCount} PPE {violationCount === 1 ? 'violation' : 'violations'} detected.
              <br />
              {restrictedZoneCount} worker{restrictedZoneCount === 1 ? '' : 's'} remain inside restricted zones.
            </p>
          </div>
        </div>
      </Card>

      {selectedWorker && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in flex justify-end" 
          onClick={() => setSelectedWorker(null)}
        >
          <div 
            className="w-full max-w-md h-full bg-[var(--sf-surface-overlay)] border-l border-[var(--sf-border-strong)] shadow-sf-2xl animate-slide-in-right flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[var(--sf-border-default)] flex-shrink-0">
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Worker Inspection Panel</h2>
              <Button variant="ghost" size="sm" iconOnly onClick={() => setSelectedWorker(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="p-6 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
              {/* Worker Information */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-4">Worker Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-[var(--sf-text-tertiary)]">Name</p>
                    <p className="font-medium text-[var(--sf-text-primary)]">{selectedWorker.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--sf-text-tertiary)]">Employee ID</p>
                    <p className="font-medium font-mono text-[var(--sf-text-secondary)]">{selectedWorker.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--sf-text-tertiary)]">Role</p>
                    <p className="font-medium text-[var(--sf-text-primary)]">{selectedWorker.role}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--sf-text-tertiary)]">Shift</p>
                    <p className="font-medium text-[var(--sf-text-primary)]">{selectedWorker.shift}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-[var(--sf-text-tertiary)]">Zone</p>
                    <p className="font-medium text-[var(--sf-text-primary)]">{selectedWorker.current_zone || 'Off-site'}</p>
                  </div>
                </div>
              </section>

              {/* AI Detection Summary */}
              {latestViolation && (
                 <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-4">AI Detection Summary</h3>
                    <Card padding="sm" className="bg-[var(--sf-surface-sunken)] border-danger-500/30">
                      {latestViolation.missingItems.map(item => (
                        <div key={item} className="mb-4 last:mb-0">
                           <p className="text-danger-500 font-bold mb-2 flex items-center gap-2">
                             <AlertTriangle className="w-4 h-4" />
                             {formatLabel(item)} Missing
                           </p>
                           <div className="grid grid-cols-2 gap-3 mt-1">
                             <div>
                               <p className="text-xs text-[var(--sf-text-tertiary)]">Confidence</p>
                               <p className="text-sm font-medium text-[var(--sf-text-primary)]">98%</p>
                             </div>
                             <div>
                               <p className="text-xs text-[var(--sf-text-tertiary)]">Detected</p>
                               <p className="text-sm font-medium text-[var(--sf-text-primary)]">
                                 {formatRelativeTime(latestViolation.detectedAt)}
                               </p>
                             </div>
                             <div className="col-span-2">
                               <p className="text-xs text-[var(--sf-text-tertiary)]">Camera</p>
                               <p className="text-sm font-medium text-[var(--sf-text-primary)]">{latestViolation.cameraId}</p>
                             </div>
                           </div>
                        </div>
                      ))}
                    </Card>
                 </section>
              )}

              {/* Last Known Location */}
              <section>
                 <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-4">Last Known Location</h3>
                 <Card padding="sm" className="bg-[var(--sf-surface-sunken)] border-[var(--sf-border-default)]">
                    <div className="grid grid-cols-2 gap-4">
                       <div className="col-span-2">
                         <p className="text-xs text-[var(--sf-text-tertiary)]">Zone</p>
                         <p className="text-sm font-medium text-[var(--sf-text-primary)]">{selectedWorker.current_zone || 'Unknown'}</p>
                       </div>
                       <div>
                         <p className="text-xs text-[var(--sf-text-tertiary)]">Camera</p>
                         <p className="text-sm font-medium text-[var(--sf-text-primary)]">{latestViolation?.cameraId || 'CAM-07'}</p>
                       </div>
                       <div>
                         <p className="text-xs text-[var(--sf-text-tertiary)]">Last Seen</p>
                         <p className="text-sm font-medium text-[var(--sf-text-primary)]">14 sec ago</p>
                       </div>
                    </div>
                 </Card>
              </section>

              {/* Related Incidents */}
              {(selectedWorker.isEmergency || selectedWorker.isHighRiskZone || selectedWorker.missingPpeItems.length > 0) && (
                 <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-4">Related Incidents</h3>
                    <ul className="space-y-2">
                       {selectedWorker.isHighRiskZone && (
                         <li className="text-sm font-medium text-warning-500 bg-warning-500/10 px-3 py-2 rounded-md border border-warning-500/20">
                           Restricted Zone Entry
                         </li>
                       )}
                       {selectedWorker.isEmergency && (
                         <li className="text-sm font-medium text-danger-500 bg-danger-500/10 px-3 py-2 rounded-md border border-danger-500/20">
                           Gas Leak Nearby
                         </li>
                       )}
                       {selectedWorker.missingPpeItems.length > 0 && (
                         <li className="text-sm font-medium text-danger-500 bg-danger-500/10 px-3 py-2 rounded-md border border-danger-500/20">
                           PPE Non-Compliance
                         </li>
                       )}
                       {selectedWorker.current_zone === 'Tank Farm A' && (
                         <li className="text-sm font-medium text-warning-500 bg-warning-500/10 px-3 py-2 rounded-md border border-warning-500/20">
                           Permit Conflict
                         </li>
                       )}
                    </ul>
                 </section>
              )}

              {/* Recommended Actions */}
              <section className="pb-8">
                 <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--sf-text-tertiary)] mb-4">Recommended Actions</h3>
                 <div className="flex flex-col gap-2">
                    <Button variant="secondary" className="justify-start shadow-sm bg-[var(--sf-surface-card)]">View CCTV</Button>
                    <Button variant="secondary" className="justify-start shadow-sm bg-[var(--sf-surface-card)]">Locate Worker</Button>
                    <Button variant="secondary" className="justify-start shadow-sm bg-[var(--sf-surface-card)]">Notify Supervisor</Button>
                    <Button variant="secondary" className="justify-start shadow-sm bg-[var(--sf-surface-card)]">View Permit</Button>
                 </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
