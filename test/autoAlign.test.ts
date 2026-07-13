import { describe, expect, it } from 'vitest';
import { autoAlign, mergeTracks } from '../src/lib/merge';
import type { TrackPoint } from '../src/lib/types';

const T0 = Date.parse('2026-07-01T08:00:00Z');

function makeTracks(shiftSeconds: number) {
  const gps: TrackPoint[] = [];
  const hr: TrackPoint[] = [];
  for (let s = 0; s <= 600; s += 5) {
    gps.push({ t: T0 + s * 1000, lat: 52.52 + s * 1e-5, lon: 13.405 });
  }
  for (let s = 0; s <= 600; s += 5) {
    hr.push({ t: T0 + (s - shiftSeconds) * 1000, hr: 120 + Math.round(20 * Math.sin(s / 60)) });
  }
  return { gps, hr };
}

describe('autoAlign', () => {
  it('recovers a +37s shift', () => {
    const { gps, hr } = makeTracks(37);
    expect(autoAlign(gps, hr)).toBe(37);
  });

  it('recovers a -120s shift', () => {
    const { gps, hr } = makeTracks(-120);
    expect(autoAlign(gps, hr)).toBe(-120);
  });

  it('returns 0 for already aligned tracks', () => {
    const { gps, hr } = makeTracks(0);
    expect(autoAlign(gps, hr)).toBe(0);
  });

  it('found offset yields full coverage', () => {
    const { gps, hr } = makeTracks(83);
    const off = autoAlign(gps, hr);
    expect(mergeTracks(gps, hr, off).coverage).toBe(1);
  });

  it('returns 0 when either side is empty', () => {
    const { gps } = makeTracks(0);
    expect(autoAlign(gps, [])).toBe(0);
    expect(autoAlign([], [{ t: T0, hr: 100 }])).toBe(0);
  });
});
