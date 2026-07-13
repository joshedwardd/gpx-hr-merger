import { describe, expect, it } from 'vitest';
import { hrColor, hrRange } from '../src/ui/hrColor';

describe('hrRange', () => {
  it('returns null for empty input', () => {
    expect(hrRange([])).toBeNull();
  });

  it('finds min and max', () => {
    expect(hrRange([140, 120, 165, 130])).toEqual({ min: 120, max: 165 });
  });

  it('survives very long activities without a stack overflow', () => {
    const hrs = new Array(500_000).fill(0).map((_, i) => 100 + (i % 80));
    expect(hrRange(hrs)).toEqual({ min: 100, max: 179 });
  });
});

describe('hrColor', () => {
  it('maps low HR to blue and high HR to red', () => {
    const range = { min: 100, max: 180 };
    expect(hrColor(100, range)).toBe('rgb(76,194,255)');
    expect(hrColor(180, range)).toBe('rgb(255,90,77)');
  });

  it('uses the midpoint color for a flat range', () => {
    const range = { min: 140, max: 140 };
    expect(hrColor(140, range)).toBe(hrColor(140, { min: 100, max: 180 }));
  });
});
