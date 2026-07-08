/**
 * KpiCardGrid
 *
 * Responsive grid of the platform's top-level KPI cards.
 * Wraps the reusable `StatCard` primitive with SafeFusion's fixed
 * set of headline metrics. Values shown are placeholders until wired
 * to live data.
 *
 * @example
 * <KpiCardGrid />
 */

import {
  Gauge,
  HardHat,
  Bell,
  FileCheck2,
  Radio,
  Wrench,
} from 'lucide-react';
import { StatCard } from '@/components/ui';
import type { StatCardProps } from '@/components/ui';

const KPI_CARDS: StatCardProps[] = [
  {
    label: 'Overall Risk Score',
    value: '32',
    subLabel: '/ 100',
    delta: '-4',
    deltaLabel: 'vs last week',
    trend: 'down',
    trendPositive: true,
    icon: Gauge,
    iconVariant: 'success',
  },
  {
    label: 'Workers Online',
    value: '128 / 142',
    delta: '+6',
    deltaLabel: 'since shift start',
    trend: 'up',
    trendPositive: true,
    icon: HardHat,
    iconVariant: 'primary',
  },
  {
    label: 'Critical Alerts',
    value: 3,
    delta: '+1',
    deltaLabel: 'in the last hour',
    trend: 'up',
    trendPositive: false,
    icon: Bell,
    iconVariant: 'danger',
  },
  {
    label: 'Active Permits',
    value: 18,
    delta: '2',
    deltaLabel: 'pending review',
    trend: 'stable',
    icon: FileCheck2,
    iconVariant: 'warning',
  },
  {
    label: 'Gas Sensors Active',
    value: '54 / 56',
    delta: '-2',
    deltaLabel: 'offline',
    trend: 'down',
    trendPositive: false,
    icon: Radio,
    iconVariant: 'primary',
  },
  {
    label: 'Equipment Health',
    value: '96%',
    delta: '+1%',
    deltaLabel: 'vs last month',
    trend: 'up',
    trendPositive: true,
    icon: Wrench,
    iconVariant: 'success',
  },
];

export function KpiCardGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {KPI_CARDS.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
