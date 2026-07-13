import { describe, expect, it } from 'vitest';
import { hrStats } from '../src/lib/hrStats';
import type { TrackPoint } from '../src/lib/types';

describe('hrStats', () => {
  it('returns nulls when no point has HR', () => {
    expect(hrStats([{ t: 0 }, { t: 1 }])).toEqual({ avg: null, max: null });
  });

  it('averages and maxes over points that have HR', () => {
    const points: TrackPoint[] = [{ t: 0, hr: 100 }, { t: 1 }, { t: 2, hr: 160 }];
    expect(hrStats(points)).toEqual({ avg: 130, max: 160 });
  });

  it('does not overflow the stack on very long activities', () => {
    const points: TrackPoint[] = Array.from({ length: 200_000 }, (_, i) => ({ t: i, hr: 150 }));
    points[123_456].hr = 199;
    expect(hrStats(points)).toEqual({ avg: 150, max: 199 });
  });
});
