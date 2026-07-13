import type { TrackPoint } from './types';

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversine(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

export function totalDistance(points: TrackPoint[]): number {
  let dist = 0;
  let prev: { lat: number; lon: number } | null = null;
  let prevSeg: number | undefined;
  for (const p of points) {
    if (p.lat === undefined || p.lon === undefined) continue;
    const cur = { lat: p.lat, lon: p.lon };
    if (prev && p.seg === prevSeg) dist += haversine(prev, cur);
    prev = cur;
    prevSeg = p.seg;
  }
  return dist;
}

// moving time: sum of per-segment spans, so pause gaps between segments are
// excluded just as they are from distance. single-segment activities collapse
// to last-minus-first (elapsed), unchanged.
export function movingDuration(points: TrackPoint[]): number {
  let moving = 0;
  let segStart: number | null = null;
  let prevT = 0;
  let prevSeg: number | undefined;
  for (const p of points) {
    if (segStart === null || p.seg !== prevSeg) {
      if (segStart !== null) moving += prevT - segStart;
      segStart = p.t;
    }
    prevT = p.t;
    prevSeg = p.seg;
  }
  if (segStart !== null) moving += prevT - segStart;
  return moving;
}
