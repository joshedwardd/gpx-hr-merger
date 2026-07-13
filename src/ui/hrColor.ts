export interface HrRange {
  min: number;
  max: number;
}

export function hrRange(hrs: number[]): HrRange | null {
  if (hrs.length === 0) return null;
  return { min: Math.min(...hrs), max: Math.max(...hrs) };
}

/** blue (low) → red (high) across the run's HR range */
export function hrColor(hr: number, range: HrRange): string {
  const f = range.max > range.min ? (hr - range.min) / (range.max - range.min) : 0.5;
  const r = Math.round(76 + f * (255 - 76));
  const g = Math.round(194 - f * (194 - 90));
  const b = Math.round(255 - f * (255 - 77));
  return `rgb(${r},${g},${b})`;
}
