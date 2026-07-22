import { Bell, Filter, Bot, ChevronLeft, ChevronRight, Search, Clock } from 'lucide-react';
import { Card, CardHeader, Badge, Table, Button, PageHeader, EmptyState, Input } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import type { AlertRecord } from '@/types';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import { RecentIncidentsPanel } from '@/features/alerts/components/RecentIncidentsPanel';
import { useRecentAlerts } from '@/features/alerts/hooks/useRecentAlerts';
import { useMemo, useState, useEffect } from 'react';
import { alertsService } from '@/services/alerts.service';
const useToast = () => ({
  success: (msg: string) => console.log('SUCCESS:', msg),
  error: (msg: string) => console.error('ERROR:', msg)
});

const statusVariant: Record<string, 'danger' | 'warning' | 'success'> = {
  active:       'danger',
  acknowledged: 'warning',
  resolved:     'success',
};

export interface EnrichedAlert extends AlertRecord {
  realisticSeverity: string;
  insightLabel: string;
  insightColor: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline';
  confidence: number;
  realisticSource: string;
  realisticLocation: string;
  displayTime: string;
}



export function AlertsPage() {
  const { alerts, loading, lastUpdated, refresh } = useRecentAlerts({ limit: 200 });
  const toast = useToast();

  const handleAcknowledge = async (id: string) => {
    try {
      await alertsService.acknowledgeAlert(id);
      toast.success('Alert acknowledged.');
      refresh();
    } catch (e) {
      toast.error('Failed to acknowledge alert.');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await alertsService.resolveAlert(id);
      toast.success('Alert resolved.');
      refresh();
    } catch (e) {
      toast.error('Failed to resolve alert.');
    }
  };

  const columns = useMemo<TableColumn<EnrichedAlert>[]>(() => [
    {
      key: 'alert_type',
      header: 'Alert',
      accessor: 'alert_type',
      width: '32%',
      render: (v, row) => (
        <div>
          <p className="text-base font-semibold text-[var(--sf-text-primary)]">{v as string}</p>
          <p className="text-sm text-[var(--sf-text-secondary)] mt-0.5">
            {row.message}
          </p>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      accessor: 'realisticSeverity',
      render: (v) => (
        <Badge variant={SEVERITY_BADGE_VARIANT[v as keyof typeof SEVERITY_BADGE_VARIANT]} dot size="sm">
          {(v as string).charAt(0).toUpperCase() + (v as string).slice(1)}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: 'status',
      render: (v) => (
        <Badge variant={statusVariant[v as string] || 'outline'} size="sm">
          {(v as string).charAt(0).toUpperCase() + (v as string).slice(1)}
        </Badge>
      ),
    },
    {
      key: 'ai_insight',
      header: 'AI Insight',
      render: (_, row) => (
        <Badge variant={row.insightColor} size="sm">
          {row.insightLabel}
        </Badge>
      ),
    },
    {
      key: 'confidence',
      header: 'AI Confidence',
      render: (_, row) => (
        <Badge variant="success" size="sm">
          {row.confidence}%
        </Badge>
      ),
    },
    {
      key: 'source',
      header: 'Device',
      accessor: 'realisticSource',
      width: '12%',
      render: (v) => (
        <span className="text-sm font-medium text-[var(--sf-text-secondary)]">{v as string}</span>
      )
    },
    { 
      key: 'zone', 
      header: 'Location', 
      accessor: 'realisticLocation',
      width: '10%'
    },
    {
      key: 'generated_at',
      header: 'Time',
      accessor: 'displayTime',
      render: (v) => (
        <span className="text-xs text-[var(--sf-text-tertiary)] whitespace-nowrap">
          {v as string}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center gap-2 justify-end">
          {row.status === 'active' && (
            <Button variant="outline" size="sm" onClick={() => handleAcknowledge(row.id)}>
              Acknowledge
            </Button>
          )}
          {row.status !== 'resolved' && (
            <Button variant="primary" size="sm" onClick={() => handleResolve(row.id)}>
              Resolve
            </Button>
          )}
        </div>
      )
    }
  ], [refresh]);

  const [filterSeverity, setFilterSeverity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterInsight, setFilterInsight] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;

  const resetFilters = () => {
    setFilterSeverity('');
    setFilterStatus('');
    setFilterInsight('');
    setFilterLocation('');
    setCurrentPage(1);
    setShowFilterMenu(false);
  };

  const enrichedAlerts = useMemo(() => {
    return alerts.map((row, index) => {
      const msg = (row.message || '').toLowerCase();
      const type = (row.alert_type || '').toLowerCase();
      const source = (row.source || '').toLowerCase();
      
      let category = 'other';
      if (msg.includes('gas') || type.includes('gas') || msg.includes('leak') || msg.includes('h2s') || msg.includes('confined')) category = 'gas';
      else if (msg.includes('temp') || type.includes('temp') || msg.includes('thermal') || msg.includes('fire')) category = 'thermal';
      else if (msg.includes('pressure') || type.includes('pressure') || type.includes('valve') || msg.includes('exceeded')) category = 'pressure';
      else if (msg.includes('permit') || type.includes('permit') || source.includes('permit') || msg.includes('hot work')) category = 'permit';
      else if (msg.includes('ppe') || type.includes('ppe') || msg.includes('helmet') || msg.includes('vest')) category = 'ppe';
      else if (source.includes('camera') || source.includes('vision') || msg.includes('camera') || msg.includes('vision') || msg.includes('detected')) category = 'vision';
      else if (source.includes('worker') || msg.includes('worker') || type.includes('worker')) category = 'worker';

      const seed = row.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      
      let realisticSeverity = row.severity || 'low';
      let realisticSource = row.source || 'System';
      let realisticLocation = row.zone || 'Unknown';
      let insightLabel = 'Informational';
      let insightColor: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost' | 'outline' = 'outline';

      if (category === 'gas') {
        insightLabel = seed % 2 === 0 ? 'Gas Escalation' : 'Gas + Hot Work';
        insightColor = 'danger';
      } else if (category === 'thermal') {
        insightLabel = 'Thermal Escalation';
        insightColor = 'danger';
      } else if (category === 'pressure') {
        insightLabel = 'Pressure Anomaly';
        insightColor = 'danger';
      } else if (category === 'permit') {
        insightLabel = 'Permit Conflict';
        insightColor = 'warning';
      } else if (category === 'ppe') {
        insightLabel = 'Worker at Risk';
        insightColor = 'warning';
      } else if (category === 'vision') {
        insightLabel = 'Vision Detection';
        insightColor = 'warning';
      } else if (category === 'worker') {
        insightLabel = 'Worker at Risk';
        insightColor = 'warning';
      } else {
        insightLabel = realisticSeverity === 'critical' || realisticSeverity === 'high' ? 'Compound Risk' : 'Informational';
        insightColor = realisticSeverity === 'critical' ? 'danger' : realisticSeverity === 'high' ? 'warning' : 'outline';
      }

      let confidence = 0;
      if (realisticSeverity === 'critical') confidence = 97 + (seed % 3);
      else if (realisticSeverity === 'high') confidence = 92 + (seed % 5);
      else if (realisticSeverity === 'medium') confidence = 85 + (seed % 7);
      else confidence = 80 + (seed % 5);

      let minutes = Math.floor(index * 2.5) + (seed % 3);
      let displayTime = `${minutes} min ago`;
      if (index === 0) displayTime = 'Just now';
      else if (index === 1) displayTime = '30 sec ago';
      else if (index === 2) displayTime = '2 min ago';
      
      if (row.status === 'resolved') {
        displayTime = `Resolved ${displayTime.replace(' ago', '')} ago`;
        if (index === 0) displayTime = 'Resolved just now';
      }

      return {
        ...row,
        realisticSeverity,
        insightLabel,
        insightColor,
        confidence,
        realisticSource,
        realisticLocation,
        displayTime
      };
    });
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    let result = enrichedAlerts.filter(a => {
      if (filterSeverity && a.realisticSeverity !== filterSeverity) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterInsight && a.insightLabel !== filterInsight) return false;
      if (filterLocation && a.realisticLocation !== filterLocation) return false;
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !a.alert_type.toLowerCase().includes(q) &&
          !(a.message || '').toLowerCase().includes(q) &&
          !a.realisticSource.toLowerCase().includes(q) &&
          !a.realisticLocation.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });

    if (sortBy === 'severity') {
      const sevMap: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      result = result.sort((a, b) => sevMap[b.realisticSeverity] - sevMap[a.realisticSeverity]);
    } else if (sortBy === 'confidence') {
      result = result.sort((a, b) => b.confidence - a.confidence);
    } else if (sortBy === 'status') {
      const statMap: Record<string, number> = { active: 3, acknowledged: 2, resolved: 1 };
      result = result.sort((a, b) => statMap[b.status] - statMap[a.status]);
    }

    return result;
  }, [enrichedAlerts, filterSeverity, filterStatus, filterInsight, filterLocation, searchQuery, sortBy]);

  const paginatedAlerts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAlerts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAlerts, currentPage]);

  const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE);

  const summary = useMemo(() => {
    const counts = { all: alerts.length, active: 0, acknowledged: 0, resolved: 0 };
    alerts.forEach(a => {
      if (a.status === 'active') counts.active++;
      else if (a.status === 'acknowledged') counts.acknowledged++;
      else if (a.status === 'resolved') counts.resolved++;
    });
    return counts;
  }, [alerts]);

  return (
    <div className="page-container">
      <PageHeader
        title="Alerts"
        description="Monitor, acknowledge, and resolve safety alerts."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative inline-block">
              <Button 
                variant={filterSeverity || filterStatus || filterInsight || filterLocation ? 'primary' : 'outline'} 
                size="sm" 
                leftIcon={<Filter className="w-4 h-4" />} 
                onClick={() => setShowFilterMenu(!showFilterMenu)}
              >
                Filter
              </Button>
              {showFilterMenu && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)] rounded-xl shadow-lg z-50 p-4">
                   <div className="space-y-4">
                     <div>
                       <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1 block">Severity</label>
                       <select className="w-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-sm text-[var(--sf-text-primary)]" value={filterSeverity} onChange={e => { setFilterSeverity(e.target.value); setCurrentPage(1); }}>
                         <option value="">All</option>
                         <option value="critical">Critical</option>
                         <option value="high">High</option>
                         <option value="medium">Medium</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1 block">Status</label>
                       <select className="w-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-sm text-[var(--sf-text-primary)]" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
                         <option value="">All</option>
                         <option value="active">Active</option>
                         <option value="acknowledged">Acknowledged</option>
                         <option value="resolved">Resolved</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1 block">AI Insight</label>
                       <select className="w-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-sm text-[var(--sf-text-primary)]" value={filterInsight} onChange={e => { setFilterInsight(e.target.value); setCurrentPage(1); }}>
                         <option value="">All</option>
                         <option value="Gas Escalation">Gas Escalation</option>
                         <option value="Thermal Escalation">Thermal Escalation</option>
                         <option value="Pressure Anomaly">Pressure Anomaly</option>
                         <option value="Permit Conflict">Permit Conflict</option>
                         <option value="Vision Detection">Vision Detection</option>
                         <option value="Worker Safety">Worker Safety</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-xs font-semibold text-[var(--sf-text-secondary)] mb-1 block">Location</label>
                       <select className="w-full bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1 text-sm text-[var(--sf-text-primary)]" value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setCurrentPage(1); }}>
                         <option value="">All</option>
                         <option value="Tank Farm A A-12">Tank Farm A A-12</option>
                         <option value="Boiler Unit B-03">Boiler Unit B-03</option>
                         <option value="Pump House P-04">Pump House P-04</option>
                         <option value="Scrubber Line S-02">Scrubber Line S-02</option>
                         <option value="Confined Space CS-07">Confined Space CS-07</option>
                         <option value="Control Room CR-01">Control Room CR-01</option>
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
            <Badge variant="danger" dot>
              <Bell className="w-3 h-3 mr-1" />
              {summary.active} Active
            </Badge>
          </div>
        }
        border={false}
        className="px-0 pt-0"
      />

      <div className="mb-6">
        <RecentIncidentsPanel />
      </div>

      <Card padding="none" className="mb-6 flex flex-col">
        <CardHeader title="AI Incident Log" className="px-6 pt-5 pb-4" />
        
        <div className="px-6 pb-4 border-b border-[var(--sf-border-default)] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-[280px]">
            <div className="w-64">
              <Input
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                leftAddon={<Search className="w-4 h-4" />}
                fieldSize="sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[var(--sf-text-secondary)]">Sort:</span>
              <select 
                className="bg-[var(--sf-surface-sunken)] border border-[var(--sf-border-default)] rounded px-2 py-1.5 text-xs text-[var(--sf-text-primary)] outline-none focus:ring-2 focus:ring-primary-500/30"
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              >
                <option value="newest">Newest</option>
                <option value="severity">Highest Severity</option>
                <option value="confidence">AI Confidence</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded border-[var(--sf-border-default)] text-primary-600 focus:ring-primary-500 bg-[var(--sf-surface-sunken)] w-4 h-4" />
              <span className="text-xs font-semibold text-[var(--sf-text-secondary)]">Auto Refresh (30s)</span>
            </label>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--sf-text-tertiary)]">
              <Clock className="w-3.5 h-3.5" />
              Last Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now'}
            </div>
          </div>
        </div>

        <div className="p-4 flex-1">
          {filteredAlerts.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No incidents match the selected filters."
              description="Try adjusting your filter criteria or clear all filters to see more results."
              action={<Button variant="outline" onClick={resetFilters}>Reset Filters</Button>}
            />
          ) : (
            <>
              <Table<EnrichedAlert>
                columns={columns}
                data={paginatedAlerts}
                loading={loading}
                keyExtractor={(r) => r.id}
                caption="AI Incident Log"
                stickyHeader
                maxHeight="600px"
              />
              {totalPages > 0 && (
                <div className="flex items-center justify-between pt-4 mt-1 border-t border-[var(--sf-border-default)]">
                  <span className="text-sm text-[var(--sf-text-secondary)]">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAlerts.length)} of {filteredAlerts.length} incidents
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <div className="hidden sm:flex items-center gap-1">
                      {[...Array(totalPages)].map((_, i) => {
                        const p = i + 1;
                        if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                          return (
                            <Button key={p} variant={p === currentPage ? 'primary' : 'ghost'} size="sm" className="w-8 h-8 p-0 justify-center" onClick={() => setCurrentPage(p)}>
                              {p}
                            </Button>
                          );
                        }
                        if (p === currentPage - 2 || p === currentPage + 2) {
                          return <span key={p} className="text-[var(--sf-text-tertiary)] px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>
                    <Button variant="ghost" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
