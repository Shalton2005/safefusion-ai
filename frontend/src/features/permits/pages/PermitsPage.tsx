import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileCheck2, Clock, XCircle, AlertTriangle, Search, Filter, X } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Table, Skeleton, Alert, Button, Input, EmptyState } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { PermitDashboardPanel } from '@/features/permits/components/PermitDashboardPanel';
import type { Permit } from '@/types';
import { usePermits } from '../hooks/usePermits';
import { usePlantStatus } from '@/features/plant-status/hooks/usePlantStatus';

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  suspended: 'warning',
  closed: 'default',
  'AI Review Required': 'warning',
  'Temporarily Suspended': 'danger',
};

interface EnhancedPermit extends Permit {
  displayStatus: string;
  aiAssessment: string;
  aiBadgeVariant: 'success' | 'warning' | 'danger' | 'default';
  isEmergencyConflict: boolean;
  isExpiringSoon: boolean;
}

const columns: TableColumn<EnhancedPermit>[] = [
  {
    key: 'permit_type',
    header: 'Type',
    accessor: 'permit_type',
    render: (v) => <span className="font-medium text-[var(--sf-text-primary)]">{(v as string).replace('_', ' ')}</span>,
  },
  { key: 'zone',        header: 'Zone',         accessor: 'zone' },
  { key: 'issued_by', header: 'Issued By', accessor: 'issued_by' },
  { key: 'assigned_team', header: 'Team', accessor: 'assigned_team' },
  {
    key: 'status',
    header: 'Status',
    accessor: 'displayStatus',
    render: (v) => (
      <Badge variant={statusVariant[v as string] || 'default'} size="sm" dot>
        {v as string}
      </Badge>
    ),
  },
  {
    key: 'ai_assessment',
    header: 'AI Assessment',
    accessor: 'aiAssessment',
    render: (v, row) => (
      <Badge variant={row.aiBadgeVariant} size="sm">
        {v as string}
      </Badge>
    ),
  },
  { 
    key: 'end_time', 
    header: 'Expires', 
    accessor: 'end_time',
    render: (v) => <span className="text-[var(--sf-text-tertiary)] text-xs">{new Date(v as string).toLocaleDateString()}</span>
  },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function PermitsPage() {
  const { permits, loading, error } = usePermits();
  const { inEmergency } = usePlantStatus();

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [search, setSearch] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterZone, setFilterZone] = useState('');
  const [filterIssuedBy, setFilterIssuedBy] = useState('');
  const [selectedPermit, setSelectedPermit] = useState<EnhancedPermit | null>(null);

  const baseEnhancedPermits = useMemo(() => {
    const hazardousTypes = ['hot_work', 'confined_space', 'electrical_isolation', 'loto', 'chemical_transfer', 'line_breaking', 'working_at_height', 'excavation', 'pressure_testing'];
    const now = Date.now();

    return permits.map((p) => {
      const isHazardous = hazardousTypes.includes(p.permit_type.toLowerCase().replace(' ', '_'));
      const isEmergencyConflict = !!inEmergency && isHazardous && p.status === 'active';
      
      let displayStatus = p.status as string;
      if (isEmergencyConflict && p.permit_type.toLowerCase().includes('hot')) {
        displayStatus = 'Temporarily Suspended';
      } else if (isEmergencyConflict) {
        displayStatus = 'AI Review Required';
      }

      const isExpiringSoon = p.status === 'active' && (new Date(p.end_time).getTime() - now) < 24 * 60 * 60 * 1000;
      const isExpired = p.status === 'active' && new Date(p.end_time).getTime() < now;

      let aiAssessment = 'Safe';
      let badgeVariant: 'success' | 'warning' | 'danger' | 'default' = 'success';
      
      if (isEmergencyConflict) {
        aiAssessment = 'Emergency Conflict';
        badgeVariant = 'danger';
      } else if (p.status === 'suspended') {
        aiAssessment = 'Awaiting Review';
        badgeVariant = 'warning';
      } else if (isExpired) {
        aiAssessment = 'Expired';
        badgeVariant = 'danger';
      } else if (isExpiringSoon) {
        aiAssessment = 'High Risk';
        badgeVariant = 'warning';
      } else if (p.status === 'closed') {
        aiAssessment = 'Safe';
        badgeVariant = 'default';
      }

      return {
        ...p,
        displayStatus,
        aiAssessment,
        aiBadgeVariant: badgeVariant,
        isEmergencyConflict,
        isExpiringSoon
      } as EnhancedPermit;
    });
  }, [permits, inEmergency]);

  const filteredPermits = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = baseEnhancedPermits.filter((p) => {
      if (filterStatuses.length && !filterStatuses.includes(p.displayStatus)) return false;
      if (filterTypes.length && !filterTypes.includes(p.permit_type)) return false;
      if (filterZone && p.zone !== filterZone) return false;
      if (filterIssuedBy && p.issued_by !== filterIssuedBy) return false;

      if (q) {
        const haystack = `${p.permit_type} ${p.zone} ${p.issued_by} ${p.assigned_team}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const getRank = (p: EnhancedPermit) => {
        if (p.isEmergencyConflict) return 1;
        if (p.status === 'suspended') return 2;
        if (p.isExpiringSoon) return 3;
        if (p.status === 'active') return 4;
        return 5;
      };
      return getRank(a) - getRank(b);
    });
  }, [baseEnhancedPermits, search, filterStatuses, filterTypes, filterZone, filterIssuedBy]);

  const activeCount = baseEnhancedPermits.filter((p) => p.status === 'active').length;
  const suspendedCount = baseEnhancedPermits.filter((p) => p.status === 'suspended').length;
  const closedCount = baseEnhancedPermits.filter((p) => p.status === 'closed').length;
  const conflictCount = baseEnhancedPermits.filter((p) => p.isEmergencyConflict).length;

  const zones = useMemo(() => Array.from(new Set(permits.map((p) => p.zone))).sort(), [permits]);
  const issuers = useMemo(() => Array.from(new Set(permits.map((p) => p.issued_by))).sort(), [permits]);
  const types = useMemo(() => Array.from(new Set(permits.map((p) => p.permit_type))).sort(), [permits]);

  const activeFilterCount =
    filterStatuses.length +
    filterTypes.length +
    (filterZone ? 1 : 0) +
    (filterIssuedBy ? 1 : 0);

  const resetFilters = () => {
    setFilterStatuses([]);
    setFilterTypes([]);
    setFilterZone('');
    setFilterIssuedBy('');
    setCurrentPage(1);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Permits"
        description="Review and track work permits across all active sites."
        border={false}
        className="px-0 pt-0"
        badge={
          activeCount > 0 ? (
            <Badge variant="primary" size="sm" dot>
              {activeCount} active
            </Badge>
          ) : undefined
        }
      />

      {inEmergency && conflictCount > 0 && (
        <Card className="mb-6 border-danger-500/30 bg-[var(--sf-surface-card)]" padding="sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-danger-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-danger-500">AI Safety Copilot: Emergency Mode is active.</h3>
                <p className="text-sm text-[var(--sf-text-secondary)] mt-1">
                  {conflictCount} hazardous {conflictCount === 1 ? 'permit conflicts' : 'permits conflict'} with current plant conditions. AI recommends suspending Hot Work and Confined Space permits inside affected zones.
                </p>
              </div>
            </div>
            <Button variant="danger" size="sm" className="whitespace-nowrap shrink-0">
              Review AI Recommendations
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="sm" className="text-center">
          <FileCheck2 className="w-5 h-5 mx-auto text-safe-500" />
          <div className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : activeCount}
          </div>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Active Permits</p>
        </Card>
        <Card padding="sm" className="text-center">
          <Clock className="w-5 h-5 mx-auto text-caution-500" />
          <div className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : suspendedCount}
          </div>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Suspended</p>
        </Card>
        <Card padding="sm" className="text-center">
          <XCircle className="w-5 h-5 mx-auto text-danger-500" />
          <div className="mt-2 text-2xl font-bold text-[var(--sf-text-primary)]">
            {loading ? <Skeleton className="h-8 w-16 mx-auto" /> : closedCount}
          </div>
          <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">Closed</p>
        </Card>
      </div>

      <Card padding="none" className="mt-4">
        <CardHeader 
          title="Permit Records" 
          className="px-6 pt-5 pb-4 border-b border-[var(--sf-border-default)]" 
          action={
            <div className="flex items-center gap-2">
              <div className="w-64">
                <Input
                  placeholder="Search permits..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  leftAddon={<Search className="w-4 h-4" />}
                  fieldSize="sm"
                />
              </div>
              <div className="relative inline-block">
                <Button
                  variant={activeFilterCount ? 'primary' : 'outline'}
                  size="sm"
                  leftIcon={<Filter className="w-4 h-4" />}
                  onClick={() => setShowFilterMenu((v) => !v)}
                >
                  Filter{activeFilterCount ? ` (${activeFilterCount})` : ''}
                </Button>
                {showFilterMenu && (
                  <div className="absolute top-full right-0 mt-2 w-80 bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)] rounded-xl shadow-lg z-50 p-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4 text-left">
                      <div>
                        <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1.5 block">Status</label>
                        <div className="flex flex-wrap gap-1.5">
                          {['active', 'suspended', 'closed', 'AI Review Required', 'Temporarily Suspended'].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => { setFilterStatuses((prev) => toggle(prev, s)); setCurrentPage(1); }}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors capitalize ${
                                filterStatuses.includes(s)
                                  ? 'bg-primary-500/15 border-primary-500 text-primary-600'
                                  : 'border-[var(--sf-border-default)] text-[var(--sf-text-secondary)]'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1.5 block">Permit Type</label>
                        <div className="flex flex-wrap gap-1.5">
                          {types.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => { setFilterTypes((prev) => toggle(prev, t)); setCurrentPage(1); }}
                              className={`text-xs px-2 py-1 rounded-full border transition-colors capitalize ${
                                filterTypes.includes(t)
                                  ? 'bg-primary-500/15 border-primary-500 text-primary-600'
                                  : 'border-[var(--sf-border-default)] text-[var(--sf-text-secondary)]'
                              }`}
                            >
                              {t.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1 block">Zone</label>
                        <select
                          className="w-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-sm text-[var(--sf-text-primary)]"
                          value={filterZone}
                          onChange={(e) => { setFilterZone(e.target.value); setCurrentPage(1); }}
                        >
                          <option value="">All Zones</option>
                          {zones.map((z) => (
                            <option key={z} value={z}>{z}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1 block">Issued By</label>
                        <select
                          className="w-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-sm text-[var(--sf-text-primary)]"
                          value={filterIssuedBy}
                          onChange={(e) => { setFilterIssuedBy(e.target.value); setCurrentPage(1); }}
                        >
                          <option value="">Anyone</option>
                          {issuers.map((g) => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-[var(--sf-border-default)]">
                        <Button size="sm" onClick={() => setShowFilterMenu(false)} className="flex-1 justify-center">Apply</Button>
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="flex-1 justify-center">Reset</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          }
        />
        <div className="p-4">
          {error && (
            <Alert variant="danger" title="Failed to load permits" className="mb-4">
              {error}
            </Alert>
          )}

          {!loading && filteredPermits.length === 0 ? (
            <EmptyState
              icon={Search}
              title={search || activeFilterCount ? 'No permits match your criteria.' : 'No permits found.'}
              description={search || activeFilterCount ? 'Try adjusting your search or filters.' : undefined}
              action={
                (search || activeFilterCount) ? (
                  <Button variant="outline" onClick={() => { setSearch(''); resetFilters(); }}>Reset Filters</Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <Table<EnhancedPermit>
                columns={columns}
                data={filteredPermits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)}
                loading={loading}
                keyExtractor={(r) => r.id}
                caption="List of work permit records"
                onRowClick={(row) => setSelectedPermit(row)}
                rowClassName={(row) => row.isEmergencyConflict ? 'bg-danger-900/10 border-l-2 border-l-danger-500 hover:bg-danger-900/20 !border-b-danger-500/20' : ''}
              />
              {filteredPermits.length > 0 && (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <div className="text-sm text-[var(--sf-text-secondary)]">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredPermits.length)}–{Math.min(currentPage * itemsPerPage, filteredPermits.length)} of {filteredPermits.length} permits
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    {Array.from({ length: Math.ceil(filteredPermits.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={page === currentPage ? 'pointer-events-none' : ''}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={currentPage === Math.ceil(filteredPermits.length / itemsPerPage)}
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredPermits.length / itemsPerPage), p + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <PermitDashboardPanel />

      {selectedPermit && createPortal(
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in" 
          onClick={() => setSelectedPermit(null)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="w-full max-w-md bg-[var(--sf-surface-overlay)] border-l border-[var(--sf-border-strong)] shadow-sf-lg h-full overflow-y-auto flex flex-col"
            style={{ animation: 'slideLeft 0.2s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--sf-border-default)]">
              <h2 className="text-lg font-semibold text-[var(--sf-text-primary)]">Permit Inspection</h2>
              <Button variant="ghost" size="sm" iconOnly onClick={() => setSelectedPermit(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1 p-6 flex flex-col gap-8">
              
              {/* Permit Details */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--sf-text-secondary)] uppercase tracking-wider mb-4">Permit Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center"><span className="text-[var(--sf-text-tertiary)]">Permit ID</span><span className="text-[var(--sf-text-primary)] font-mono text-xs bg-[var(--sf-surface-sunken)] px-2 py-1 rounded border border-[var(--sf-border-default)]">{selectedPermit.id}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[var(--sf-text-tertiary)]">Permit Type</span><span className="text-[var(--sf-text-primary)] font-medium capitalize">{selectedPermit.permit_type.replace(/_/g, ' ')}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[var(--sf-text-tertiary)]">Zone</span><span className="text-[var(--sf-text-primary)]">{selectedPermit.zone}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[var(--sf-text-tertiary)]">Issued By</span><span className="text-[var(--sf-text-primary)]">{selectedPermit.issued_by}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[var(--sf-text-tertiary)]">Assigned Team</span><span className="text-[var(--sf-text-primary)]">{selectedPermit.assigned_team}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[var(--sf-text-tertiary)]">Start Time</span><span className="text-[var(--sf-text-primary)]">{new Date(selectedPermit.start_time).toLocaleString()}</span></div>
                  <div className="flex justify-between items-center"><span className="text-[var(--sf-text-tertiary)]">End Time</span><span className="text-[var(--sf-text-primary)]">{new Date(selectedPermit.end_time).toLocaleString()}</span></div>
                </div>
              </div>

              {/* AI Assessment */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--sf-text-secondary)] uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  AI Assessment
                </h3>
                <div className="bg-[var(--sf-surface-sunken)] p-4 rounded-xl border border-[var(--sf-border-default)] space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--sf-text-tertiary)]">Current Risk</span>
                    <Badge variant={selectedPermit.aiBadgeVariant} size="sm">{selectedPermit.aiAssessment}</Badge>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[var(--sf-text-tertiary)]">Reason</span>
                    <span className="text-[var(--sf-text-primary)] leading-relaxed">
                      {selectedPermit.isEmergencyConflict 
                        ? 'Permit type conflicts with active emergency mode in this zone.' 
                        : selectedPermit.isExpiringSoon
                          ? 'Permit is expiring within 24 hours and requires renewal or closure.'
                          : 'No critical conflicts detected.'}
                    </span>
                  </div>
                  {selectedPermit.isEmergencyConflict && (
                    <>
                      <div className="flex flex-col gap-1.5 pt-3 border-t border-[var(--sf-border-default)]">
                        <span className="text-[var(--sf-text-tertiary)]">Related Emergency</span>
                        <span className="text-danger-500 font-medium flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Active Plant Emergency</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[var(--sf-text-tertiary)]">Permit Conflicts</span>
                        <span className="text-[var(--sf-text-primary)] capitalize">{selectedPermit.permit_type.replace(/_/g, ' ')} operations are prohibited during active emergencies.</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Recommended Actions */}
              <div>
                <h3 className="text-xs font-semibold text-[var(--sf-text-secondary)] uppercase tracking-wider mb-4">Recommended Actions</h3>
                <div className="flex flex-col gap-2.5">
                  {selectedPermit.isEmergencyConflict && (
                    <Button variant="danger" fullWidth>Suspend Permit</Button>
                  )}
                  <Button variant="secondary" fullWidth>View Zone CCTV</Button>
                  <Button variant="secondary" fullWidth>Notify Team</Button>
                  <Button variant="outline" fullWidth>View Related Incident</Button>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
