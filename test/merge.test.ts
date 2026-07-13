import { describe, expect, it } from 'vitest';
import { mergeTracks } from '../src/lib/merge';
import type { TrackPoint } from '../src/lib/types';

const T0 = Date.parse('2026-07-01T08:00:00Z');
const sec = (s: number) => T0 + s * 1000;

const gps = (s: number): TrackPoint => ({ t: sec(s), lat: 52.52 + s * 1e-5, lon: 13.405 });
const hr = (s: number, bpm: number, cad?: number): TrackPoint =>
  cad === undefined ? { t: sec(s), hr: bpm } : { t: sec(s), hr: bpm, cad };

describe('mergeTracks', () => {
  it('interpolates HR linearly between samples', () => {
    const res = mergeTracks([gps(5)], [hr(0, 100), hr(10, 110)], 0);
    expect(res.points[0].hr).toBe(105);
    expect(res.coverage).toBe(1);
  });

  it('rounds interpolated HR to integer bpm', () => {
    const res = mergeTracks([gps(3)], [hr(0, 100), hr(10, 105)], 0);
    expect(res.points[0].hr).toBe(102);
  });

  it('interpolates cadence alongside HR', () => {
    const res = mergeTracks([gps(5)], [hr(0, 100, 80), hr(10, 110, 90)], 0);
    expect(res.points[0].cad).toBe(85);
  });

  it('nulls HR when the bracketing gap exceeds MAX_GAP', () => {
    const res = mergeTracks([gps(30)], [hr(0, 100), hr(60, 160)], 0);
    expect(res.points[0].hr).toBeUndefined();
    expect(res.coverage).toBe(0);
  });

  it('clamps to first/last sample only within MAX_GAP', () => {
    const samples = [hr(100, 140), hr(110, 145)];
    const before = mergeTracks([gps(80)], samples, 0);
    expect(before.points[0].hr).toBe(140);
    const wayBefore = mergeTracks([gps(60)], samples, 0);
    expect(wayBefore.points[0].hr).toBeUndefined();
    const after = mergeTracks([gps(130)], samples, 0);
    expect(after.points[0].hr).toBe(145);
    const wayAfter = mergeTracks([gps(150)], samples, 0);
    expect(wayAfter.points[0].hr).toBeUndefined();
  });

  it('applies offsetSeconds to the HR track', () => {
    const res = mergeTracks([gps(65)], [hr(0, 100), hr(10, 110)], 60);
    expect(res.points[0].hr).toBe(105);
  });

  it('computes coverage as fraction of GPS points with HR', () => {
    const res = mergeTracks([gps(0), gps(5), gps(10), gps(300)], [hr(0, 100), hr(10, 110)], 0);
    expect(res.coverage).toBe(0.75);
  });

  it('ignores GPS coords in the HR file and drops coordless GPS points', () => {
    const hrWithCoords: TrackPoint = { t: sec(5), lat: 99, lon: 99, hr: 100 };
    const res = mergeTracks([gps(5), { t: sec(6) }], [hrWithCoords], 0);
    expect(res.points).toHaveLength(1);
    expect(res.points[0].lat).toBeCloseTo(52.52005);
  });

  it('keeps HR on a GPS point that lands exactly on a sample before a dropout', () => {
    // HR samples up to 100s, then resume at 145s (45s > MAX_GAP dropout).
    // a point exactly at 100s has a known value and must not be dropped by
    // the interpolation gap guard.
    const samples = [hr(99, 150), hr(100, 150), hr(145, 155), hr(146, 155)];
    const res = mergeTracks([gps(100)], samples, 0);
    expect(res.points[0].hr).toBe(150);
    expect(res.coverage).toBe(1);
  });

  it('handles empty HR input', () => {
    const res = mergeTracks([gps(0)], [], 0);
    expect(res.points[0].hr).toBeUndefined();
    expect(res.coverage).toBe(0);
  });
});
