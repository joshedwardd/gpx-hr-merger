import type { TrackPoint } from './types';

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
