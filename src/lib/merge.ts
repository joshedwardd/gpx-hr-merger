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

// lower median: for even-length windows the averaged median is not robust
// when half the window is outliers (e.g. a double spike at a track edge);
// hr spikes are upward, so rounding down is the conservative side
function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[(sorted.length - 1) >> 1];
}

/**
 * Drop implausible HR samples: values outside [HR_MIN, HR_MAX], and spikes
 * that deviate more than SPIKE_THRESHOLD_BPM from the median of their local
 * window (Hampel-style: the window includes the sample itself, so a minority
 * of outliers cannot poison the median). Samples are dropped rather than
 * replaced, so gaps stay honest and interpolation bridges them. A sample
 * with too few close-in-time neighbors is kept — no basis to judge it.
 */
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

function sampleAt(samples: HrSample[], t: number, maxGapMs: number): Interpolated | null {
  if (samples.length === 0) return null;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (t <= first.t) {
    return first.t - t <= maxGapMs ? { hr: first.hr, ...(first.cad !== undefined && { cad: first.cad }) } : null;
  }
  if (t >= last.t) {
    return t - last.t <= maxGapMs ? { hr: last.hr, ...(last.cad !== undefined && { cad: last.cad }) } : null;
  }
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
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

/**
 * Write HR (and cadence) from hrPoints onto the geometry of gpsPoints.
 * offsetSeconds shifts the HR track relative to the GPS track.
 * GPS points whose timestamp is further than maxGapMs from usable HR
 * samples keep hr undefined.
 */
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

/**
 * Search offsets in [-300, +300] s for the one that maximizes HR coverage.
 * Coverage typically plateaus over a range of offsets, so the midpoint of the
 * max-coverage plateau is returned; this centers the HR window on the GPS
 * window, which recovers the true clock shift when both tracks cover the
 * same activity. Coarse 5 s scan, then 1 s refinement of the plateau edges.
 */
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
