import type { TrackPoint } from './types';

/**
 * Average and max HR over the points that have one. Uses a single pass rather
 * than Math.max(...hrs), whose spread overflows the call stack on long
 * activities (tens of thousands of samples).
 */
export function hrStats(points: TrackPoint[]): { avg: number | null; max: number | null } {
  let sum = 0;
  let count = 0;
  let max = -Infinity;
  for (const p of points) {
    if (p.hr === undefined) continue;
    sum += p.hr;
    count++;
    if (p.hr > max) max = p.hr;
  }
  return count ? { avg: Math.round(sum / count), max } : { avg: null, max: null };
}
