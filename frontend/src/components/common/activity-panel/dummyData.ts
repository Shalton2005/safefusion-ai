import type { ActivityFeedItem } from './types';

export const RECENT_ALERTS: ActivityFeedItem[] = [
  {
    id: 'alert-1',
    title: 'Sensor offline',
    description: 'Zone A — Camera 3 stopped responding.',
    time: '2m ago',
    badgeLabel: 'critical',
    tone: 'danger',
  },
  {
    id: 'alert-2',
    title: 'Threshold exceeded',
    description: 'Temperature reading above safe limit in Bay 2.',
    time: '18m ago',
    badgeLabel: 'high',
    tone: 'danger',
  },
  {
    id: 'alert-3',
    title: 'Firmware update available',
    description: '4 devices are running an outdated firmware version.',
    time: '1h ago',
    badgeLabel: 'medium',
    tone: 'warning',
  },
];

export const RECENT_INCIDENTS: ActivityFeedItem[] = [
  {
    id: 'incident-1',
    title: 'Gas leak — Bay 2',
    description: 'Confirmed and contained. Area evacuated for 12 minutes.',
    time: '45m ago',
    badgeLabel: 'resolved',
    tone: 'success',
  },
  {
    id: 'incident-2',
    title: 'Slip hazard reported',
    description: 'Wet floor near loading dock, Zone C.',
    time: '3h ago',
    badgeLabel: 'investigating',
    tone: 'warning',
  },
  {
    id: 'incident-3',
    title: 'Equipment malfunction',
    description: 'Conveyor belt #4 stopped unexpectedly.',
    time: '1d ago',
    badgeLabel: 'resolved',
    tone: 'success',
  },
];

export const WORKER_ACTIVITY: ActivityFeedItem[] = [
  { id: 'worker-1', title: 'Jane Cooper',  description: 'Clocked in — Zone B',                 time: '6m ago'  },
  { id: 'worker-2', title: 'Marcus Lee',   description: 'Completed safety induction',           time: '40m ago' },
  { id: 'worker-3', title: 'Priya Nair',   description: 'Reported near-miss in Zone D',          time: '2h ago'  },
  { id: 'worker-4', title: 'Tom Hardwick', description: 'Clocked out — Zone A',                  time: '4h ago'  },
];

export const PERMIT_ACTIVITY: ActivityFeedItem[] = [
  {
    id: 'permit-1',
    title: 'Hot Work – Zone A',
    description: 'Approved by Marcus Lee.',
    time: '20m ago',
    badgeLabel: 'approved',
    tone: 'success',
  },
  {
    id: 'permit-2',
    title: 'Confined Space Entry',
    description: 'Submitted by Priya Nair, awaiting review.',
    time: '1h ago',
    badgeLabel: 'pending',
    tone: 'warning',
  },
  {
    id: 'permit-3',
    title: 'Excavation Permit',
    description: 'Rejected — missing site survey.',
    time: '5h ago',
    badgeLabel: 'rejected',
    tone: 'danger',
  },
];
