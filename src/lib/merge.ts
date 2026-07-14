import type { MergedPoint, MergeResult, TrackPoint } from './types';

export const MAX_GAP_MS = 30_000;
export const HR_MIN = 25;
export const HR_MAX = 250;
const SPIKE_NEIGHBORS = 3;
const SPIKE_MAX_NEIGHBOR_AGE_MS = 30_000;
const SPIKE_THRESHOLD_BPM = 30;

export interface HrSample {
  t: number;
  hr: number;
  cad?: number;
}

interface Interpolated {
  hr: number;
  cad?: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[(sorted.length - 1) >> 1];
}

export function filterHrSamples(samples: HrSample[]): { samples: HrSample[]; dropped: number } {
  const inRange = samples.filter((s) => s.hr >= HR_MIN && s.hr <= HR_MAX);
  const kept: HrSample[] = [];
  for (let i = 0; i < inRange.length; i++) {
    const s = inRange[i];
    const window: number[] = [];
    for (
      let j = Math.max(0, i - SPIKE_NEIGHBORS);
      j <= Math.min(inRange.length - 1, i + SPIKE_NEIGHBORS);
      j++
    ) {
      if (Math.abs(inRange[j].t - s.t) <= SPIKE_MAX_NEIGHBOR_AGE_MS) {
        window.push(inRange[j].hr);
      }
    }
    if (window.length >= 3 && Math.abs(s.hr - median(window)) > SPIKE_THRESHOLD_BPM) continue;
    kept.push(s);
  }
  return { samples: kept, dropped: samples.length - kept.length };
}

function buildHrSamples(
  hrPoints: TrackPoint[],
  offsetSeconds: number,
): { samples: HrSample[]; dropped: number } {
  const offMs = offsetSeconds * 1000;
  const raw = hrPoints
    .filter((p) => p.hr !== undefined)
    .map((p) => {
      const s: HrSample = { t: p.t + offMs, hr: p.hr! };
      if (p.cad !== undefined) s.cad = p.cad;
      return s;
    })
    .sort((a, b) => a.t - b.t);
  return filterHrSamples(raw);
}

function exact(s: HrSample): Interpolated {
  return { hr: s.hr, ...(s.cad !== undefined && { cad: s.cad }) };
}

function sampleAt(samples: HrSample[], t: number, maxGapMs: number): Interpolated | null {
  if (samples.length === 0) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (t <= first.t) return first.t - t <= maxGapMs ? exact(first) : null;
  if (t >= last.t) return t - last.t <= maxGapMs ? exact(last) : null;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  if (t === a.t) return exact(a);
  if (t === b.t) return exact(b);
  if (b.t - a.t > maxGapMs) return null;
  const f = (t - a.t) / (b.t - a.t);
  const out: Interpolated = { hr: Math.round(a.hr + (b.hr - a.hr) * f) };
  if (a.cad !== undefined && b.cad !== undefined) {
    out.cad = Math.round(a.cad + (b.cad - a.cad) * f);
  } else if (a.cad !== undefined || b.cad !== undefined) {
    out.cad = (a.cad ?? b.cad)!;
  }
  return out;
}

export function mergeTracks(
  gpsPoints: TrackPoint[],
  hrPoints: TrackPoint[],
  offsetSeconds: number,
  maxGapMs: number = MAX_GAP_MS,
): MergeResult {
  const gps = gpsPoints.filter(
    (p): p is TrackPoint & { lat: number; lon: number } => p.lat !== undefined && p.lon !== undefined,
  );
  const { samples, dropped } = buildHrSamples(hrPoints, offsetSeconds);
  let covered = 0;
  const points: MergedPoint[] = gps.map((p) => {
    const merged: MergedPoint = { t: p.t, lat: p.lat, lon: p.lon };
    if (p.ele !== undefined) merged.ele = p.ele;
    if (p.seg !== undefined) merged.seg = p.seg;
    const s = sampleAt(samples, p.t, maxGapMs);
    if (s) {
      covered++;
      merged.hr = s.hr;
      if (s.cad !== undefined) merged.cad = s.cad;
    }
    return merged;
  });
  return {
    points,
    coverage: points.length ? covered / points.length : 0,
    hrSpikesDropped: dropped,
  };
}

function coverageAt(gps: TrackPoint[], samples: HrSample[], offsetMs: number, maxGapMs: number): number {
  if (gps.length === 0 || samples.length === 0) return 0;
  let covered = 0;
  for (const p of gps) {
    if (sampleAt(samples, p.t - offsetMs, maxGapMs)) covered++;
  }
  return covered / gps.length;
}

export function autoAlign(
  gpsPoints: TrackPoint[],
  hrPoints: TrackPoint[],
  rangeSeconds = 300,
  maxGapMs: number = MAX_GAP_MS,
): number {
  const gps = gpsPoints.filter((p) => p.lat !== undefined && p.lon !== undefined);
  const { samples } = buildHrSamples(hrPoints, 0);
  if (gps.length === 0 || samples.length === 0) return 0;

  const cov = (off: number) => coverageAt(gps, samples, off * 1000, maxGapMs);

  let bestCov = -1;
  let plateau: number[] = [];
  for (let off = -rangeSeconds; off <= rangeSeconds; off += 5) {
    const c = cov(off);
    if (c > bestCov) {
      bestCov = c;
      plateau = [];
    }
    if (c === bestCov) plateau.push(off);
  }
  if (bestCov <= 0) return 0;

  let left = plateau[0];
  let right = plateau[plateau.length - 1];
  for (let off = Math.max(-rangeSeconds, left - 4); off < left; off++) {
    if (cov(off) >= bestCov) {
      left = off;
      break;
    }
  }
  for (let off = Math.min(rangeSeconds, right + 4); off > right; off--) {
    if (cov(off) >= bestCov) {
      right = off;
      break;
    }
  }
  return Math.round((left + right) / 2);
}
