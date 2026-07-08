/**
 * ChartCard
 *
 * Standard chart chrome: Card + CardHeader (title, description, action slot)
 * wrapping a fixed-height plot area. Every chart in the app renders inside
 * one of these so headers, spacing, and surface styling stay consistent.
 *
 * @example
 * <ChartCard title="Risk Trend" description="Last 30 days">
 *   <RiskTrendChart data={data} />
 * </ChartCard>
 */

import { type ReactNode } from 'react';
import { Card, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface ChartCardProps {
  title: string;
  description?: string;
  /** Node anchored to the header's right side (e.g. a live Badge, range select). */
  action?: ReactNode;
  /** Plot height in pixels. @default 280 */
  height?: number;
  children: ReactNode;
  className?: string;
}

export function ChartCard({
  title,
  description,
  action,
  height = 280,
  children,
  className,
}: ChartCardProps) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title={title} description={description} action={action} />
      <div style={{ height }} className="w-full -ml-2">
        {children}
      </div>
    </Card>
  );
}
