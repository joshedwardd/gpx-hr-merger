import { describe, expect, it } from 'vitest';
import { filterHrSamples, mergeTracks, type HrSample } from '../src/lib/merge';

const T0 = Date.parse('2026-07-01T08:00:00Z');
const s = (sec: number, hr: number): HrSample => ({ t: T0 + sec * 1000, hr });

describe('filterHrSamples', () => {
  it('keeps clean data untouched', () => {
    const samples = [s(0, 120), s(1, 122), s(2, 124), s(3, 123), s(4, 125)];
    const res = filterHrSamples(samples);
    expect(res.samples).toEqual(samples);
    expect(res.dropped).toBe(0);
  });

  it('drops a single-sample spike', () => {
    const res = filterHrSamples([s(0, 140), s(1, 142), s(2, 220), s(3, 141), s(4, 143)]);
    expect(res.samples.map((x) => x.hr)).toEqual([140, 142, 141, 143]);
    expect(res.dropped).toBe(1);
  });

  it('drops a two-sample spike', () => {
    const res = filterHrSamples([s(0, 140), s(1, 142), s(2, 220), s(3, 225), s(4, 141), s(5, 143)]);
    expect(res.samples.map((x) => x.hr)).toEqual([140, 142, 141, 143]);
    expect(res.dropped).toBe(2);
  });

  it('drops values outside the plausible range', () => {
    const res = filterHrSamples([s(0, 5), s(1, 120), s(2, 122), s(3, 300)]);
    expect(res.samples.map((x) => x.hr)).toEqual([120, 122]);
    expect(res.dropped).toBe(2);
  });

  it('keeps a genuine fast rise (sprint onset)', () => {
    const res = filterHrSamples([s(0, 120), s(5, 135), s(10, 150), s(15, 165), s(20, 178)]);
    expect(res.dropped).toBe(0);
  });

  it('does not judge samples against neighbors far away in time', () => {
    // lone sample after a long dropout: neighbors are minutes old, keep it
    const res = filterHrSamples([s(0, 120), s(2, 121), s(300, 178)]);
    expect(res.samples.map((x) => x.hr)).toEqual([120, 121, 178]);
    expect(res.dropped).toBe(0);
  });

  it('keeps samples when there are too few neighbors to judge', () => {
    const res = filterHrSamples([s(0, 120), s(1, 250)]);
    expect(res.dropped).toBe(0);
  });
});

describe('mergeTracks with spike filtering', () => {
  it('interpolates across a dropped spike and reports the count', () => {
    const gps = [{ t: T0 + 2000, lat: 1, lon: 2 }];
    const hr = [
      { t: T0, hr: 140 },
      { t: T0 + 1000, hr: 142 },
      { t: T0 + 2000, hr: 220 },
      { t: T0 + 3000, hr: 141 },
      { t: T0 + 4000, hr: 143 },
    ];
    const res = mergeTracks(gps, hr, 0);
    expect(res.hrSpikesDropped).toBe(1);
    expect(res.points[0].hr).toBe(Math.round((142 + 141) / 2));
  });

  it('reports zero dropped for clean input', () => {
    const res = mergeTracks(
      [{ t: T0, lat: 1, lon: 2 }],
      [
        { t: T0, hr: 120 },
        { t: T0 + 1000, hr: 121 },
      ],
      0,
    );
    expect(res.hrSpikesDropped).toBe(0);
  });
});
