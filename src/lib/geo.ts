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
  for (const p of points) {
    if (p.lat === undefined || p.lon === undefined) continue;
    const cur = { lat: p.lat, lon: p.lon };
    if (prev) dist += haversine(prev, cur);
    prev = cur;
  }
  return dist;
}
