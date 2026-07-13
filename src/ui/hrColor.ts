export interface HrRange {
  min: number;
  max: number;
}

// single pass instead of Math.min/max spread, which overflows the call
// stack on long activities (same crash hrStats guards against)
export function hrRange(hrs: number[]): HrRange | null {
  if (hrs.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const hr of hrs) {
    if (hr < min) min = hr;
    if (hr > max) max = hr;
  }
  return { min, max };
}

/** blue (low) → red (high) across the run's HR range */
export function hrColor(hr: number, range: HrRange): string {
  const f = range.max > range.min ? (hr - range.min) / (range.max - range.min) : 0.5;
  const r = Math.round(76 + f * (255 - 76));
  const g = Math.round(194 - f * (194 - 90));
  const b = Math.round(255 - f * (255 - 77));
  return `rgb(${r},${g},${b})`;
}
