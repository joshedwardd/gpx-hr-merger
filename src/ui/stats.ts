import { movingDuration, totalDistance } from '../lib/geo';
import { hrStats } from '../lib/hrStats';
import type { MergedPoint } from '../lib/types';

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return (h ? `${h}:` : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(ss).padStart(2, '0');
}

export function renderStats(container: HTMLElement, points: MergedPoint[]): void {
  const distKm = totalDistance(points) / 1000;
  const durMs = movingDuration(points);
  const { avg: avgHr, max: maxHr } = hrStats(points);
  const avg = avgHr === null ? '—' : String(avgHr);
  const max = maxHr === null ? '—' : String(maxHr);
  container.innerHTML = `
    <div class="stat"><div class="k">Distance</div><div class="v">${distKm.toFixed(2)}<small> km</small></div></div>
    <div class="stat"><div class="k">Duration</div><div class="v">${formatDuration(durMs)}</div></div>
    <div class="stat"><div class="k">Avg HR</div><div class="v">${avg}<small> bpm</small></div></div>
    <div class="stat"><div class="k">Max HR</div><div class="v">${max}<small> bpm</small></div></div>
  `;
}
