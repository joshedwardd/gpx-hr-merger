import { describe, expect, it } from 'vitest';
import { buildGpx } from '../src/lib/exportGpx';
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
});
