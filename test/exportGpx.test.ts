import { describe, expect, it } from 'vitest';
import { buildGpx } from '../src/lib/exportGpx';
import { movingDuration, totalDistance } from '../src/lib/geo';
import { parseTrack } from '../src/lib/parse';
import type { MergedPoint } from '../src/lib/types';

const T0 = Date.parse('2026-07-01T08:00:00Z');

const points: MergedPoint[] = [
  { t: T0, lat: 52.52, lon: 13.405, ele: 34.5, hr: 120, cad: 80 },
  { t: T0 + 10_000, lat: 52.5201, lon: 13.4052, ele: 35, hr: 124 },
  { t: T0 + 20_000, lat: 52.5202, lon: 13.4054 },
];

describe('buildGpx', () => {
  it('round-trips coords, time, ele, hr, cad through the parser', () => {
    const { points: parsed } = parseTrack(buildGpx(points));
    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toEqual({ t: T0, lat: 52.52, lon: 13.405, ele: 34.5, hr: 120, cad: 80 });
    expect(parsed[1]).toEqual({ t: T0 + 10_000, lat: 52.5201, lon: 13.4052, ele: 35, hr: 124 });
    expect(parsed[2]).toEqual({ t: T0 + 20_000, lat: 52.5202, lon: 13.4054 });
  });

  it('declares GPX 1.1 and the Garmin TrackPointExtension namespace', () => {
    const xml = buildGpx(points);
    expect(xml).toContain('xmlns="http://www.topografix.com/GPX/1/1"');
    expect(xml).toContain('xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"');
    expect(xml).toContain('version="1.1"');
  });

  it('writes ISO 8601 UTC times without milliseconds', () => {
    expect(buildGpx(points)).toContain('<time>2026-07-01T08:00:00Z</time>');
  });

  it('omits the extensions block for points without hr and cad', () => {
    const xml = buildGpx([points[2]]);
    expect(xml).not.toContain('<extensions>');
  });

  it('escapes the track name', () => {
    expect(buildGpx(points, 'a <b> & "c"')).toContain('<name>a &lt;b&gt; &amp; &quot;c&quot;</name>');
  });

  it('emits one trkseg per source segment and round-trips the break', () => {
    const paused: MergedPoint[] = [
      { t: T0, lat: 52.52, lon: 13.405 },
      { t: T0 + 10_000, lat: 52.521, lon: 13.405, seg: 1 },
    ];
    const xml = buildGpx(paused);
    expect(xml.match(/<trkseg>/g)).toHaveLength(2);
    expect(parseTrack(xml).points.map((p) => p.seg)).toEqual([undefined, 1]);
  });
});

describe('totalDistance', () => {
  it('does not draw distance across a segment break', () => {
    const straight: MergedPoint[] = [
      { t: T0, lat: 52.52, lon: 13.405 },
      { t: T0 + 1000, lat: 52.521, lon: 13.405 },
    ];
    const across = totalDistance(straight);
    const paused: MergedPoint[] = [straight[0], { ...straight[1], seg: 1 }];
    expect(totalDistance(paused)).toBe(0);
    expect(across).toBeGreaterThan(0);
  });
});

describe('movingDuration', () => {
  it('sums a single segment as last minus first', () => {
    const pts: MergedPoint[] = [
      { t: T0, lat: 52.52, lon: 13.405 },
      { t: T0 + 60_000, lat: 52.521, lon: 13.405 },
    ];
    expect(movingDuration(pts)).toBe(60_000);
  });

  it('excludes the pause gap between segments', () => {
    const pts: MergedPoint[] = [
      { t: T0, lat: 52.52, lon: 13.405 },
      { t: T0 + 60_000, lat: 52.521, lon: 13.405 },
      { t: T0 + 660_000, lat: 52.526, lon: 13.405, seg: 1 },
      { t: T0 + 720_000, lat: 52.527, lon: 13.405, seg: 1 },
    ];
    expect(movingDuration(pts)).toBe(120_000);
  });

  it('returns 0 for empty input', () => {
    expect(movingDuration([])).toBe(0);
  });
});
