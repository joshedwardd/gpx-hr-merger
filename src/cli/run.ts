import { buildGpx } from '../lib/exportGpx';
import { totalDistance } from '../lib/geo';
import { autoAlign, mergeTracks } from '../lib/merge';
import { parseTrack } from '../lib/parse';
import type { ParseSummary } from '../lib/types';

export interface RunMergeOptions {
  gpsText: string;
  hrText: string;
  offsetSeconds?: number;
  trackName?: string;
}

export interface RunMergeResult {
  xml: string;
  offsetSeconds: number;
  offsetWasAuto: boolean;
  coverage: number;
  report: {
    gps: ParseSummary;
    hr: ParseSummary;
    warnings: string[];
    mergedPoints: number;
    distanceKm: number;
    durationMs: number;
    avgHr: number | null;
    maxHr: number | null;
  };
}

export function runMerge(opts: RunMergeOptions): RunMergeResult {
  const gps = parseTrack(opts.gpsText);
  const hr = parseTrack(opts.hrText);

  const warnings: string[] = [];
  if (gps.summary.withGps === 0) {
    warnings.push('GPS file has no coordinates — did you swap the two files?');
  }
  if (hr.summary.withHr === 0) {
    warnings.push('HR file has no heart-rate samples — did you swap the two files?');
  }

  const offsetWasAuto = opts.offsetSeconds === undefined;
  const offsetSeconds = opts.offsetSeconds ?? autoAlign(gps.points, hr.points);
  const { points, coverage } = mergeTracks(gps.points, hr.points, offsetSeconds);

  const hrs = points.filter((p) => p.hr !== undefined).map((p) => p.hr!);
  return {
    xml: buildGpx(points, opts.trackName),
    offsetSeconds,
    offsetWasAuto,
    coverage,
    report: {
      gps: gps.summary,
      hr: hr.summary,
      warnings,
      mergedPoints: points.length,
      distanceKm: totalDistance(points) / 1000,
      durationMs: points.length ? points[points.length - 1].t - points[0].t : 0,
      avgHr: hrs.length ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length) : null,
      maxHr: hrs.length ? Math.max(...hrs) : null,
    },
  };
}
