/** Visual tone applied to an activity item's badge/indicator dot. */
export type ActivityTone = 'primary' | 'success' | 'warning' | 'danger' | 'default';

export interface ActivityFeedItem {
  id: string;
  /** Primary line — bolded. */
  title: string;
  /** Supporting line beneath the title. */
  description?: string;
  /** Relative timestamp label (e.g. "5m ago"). */
  time: string;
  /** Optional short badge label (e.g. severity, status). */
  badgeLabel?: string;
  tone?: ActivityTone;
}
