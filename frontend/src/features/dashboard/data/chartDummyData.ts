import type {
  RiskTrendPoint,
  SensorReadingPoint,
  AlertDistributionSlice,
} from '@/components/charts';

export const RISK_TREND_DATA: RiskTrendPoint[] = [
  { date: 'Jun 09', score: 58 },
  { date: 'Jun 12', score: 54 },
  { date: 'Jun 15', score: 61 },
  { date: 'Jun 18', score: 49 },
  { date: 'Jun 21', score: 45 },
  { date: 'Jun 24', score: 40 },
  { date: 'Jun 27', score: 44 },
  { date: 'Jun 30', score: 38 },
  { date: 'Jul 03', score: 35 },
  { date: 'Jul 06', score: 32 },
];

export const SENSOR_READINGS_DATA: SensorReadingPoint[] = [
  { time: '06:00', gas: 12, temperature: 22, pressure: 101 },
  { time: '08:00', gas: 18, temperature: 24, pressure: 101 },
  { time: '10:00', gas: 22, temperature: 27, pressure: 102 },
  { time: '12:00', gas: 31, temperature: 30, pressure: 103 },
  { time: '14:00', gas: 27, temperature: 31, pressure: 102 },
  { time: '16:00', gas: 19, temperature: 29, pressure: 101 },
  { time: '18:00', gas: 15, temperature: 26, pressure: 101 },
];

export const ALERT_DISTRIBUTION_DATA: AlertDistributionSlice[] = [
  { severity: 'Critical', count: 3 },
  { severity: 'High',     count: 7 },
  { severity: 'Medium',   count: 12 },
  { severity: 'Low',      count: 5 },
];
