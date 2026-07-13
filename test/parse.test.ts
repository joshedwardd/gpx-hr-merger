import { describe, expect, it } from 'vitest';
import { parseTrack } from '../src/lib/parse';
import { ParseError } from '../src/lib/types';
import { gpxNoHr, gpxWeirdPrefix, gpxWithHr, malformedXml, notTrackXml, tcxWithHr } from './fixtures';

describe('parseTrack GPX', () => {
  it('parses trackpoints with gpxtpx HR extensions', () => {
    const { points, summary } = parseTrack(gpxWithHr);
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({
      t: Date.parse('2026-07-01T08:00:00Z'),
      lat: 52.52,
      lon: 13.405,
      ele: 34.5,
      hr: 120,
      cad: 80,
    });
    expect(summary).toEqual({ totalPoints: 2, withGps: 2, withHr: 2, durationMs: 10_000 });
  });

  it('matches HR by localName regardless of namespace prefix', () => {
    const { points } = parseTrack(gpxWeirdPrefix);
    expect(points[0].hr).toBe(131);
  });

  it('handles missing HR, drops points without time, sorts by time', () => {
    const { points, summary } = parseTrack(gpxNoHr);
    expect(points).toHaveLength(2);
    expect(points[0].t).toBeLessThan(points[1].t);
    expect(points[0].hr).toBeUndefined();
    expect(summary.withHr).toBe(0);
  });
});

describe('parseTrack TCX', () => {
  it('parses Trackpoints with position, altitude, HR, cadence', () => {
    const { points, summary } = parseTrack(tcxWithHr);
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({
      t: Date.parse('2026-07-01T08:00:00Z'),
      lat: 52.52,
      lon: 13.405,
      ele: 34.5,
      hr: 118,
      cad: 78,
    });
    expect(points[1].lat).toBeUndefined();
    expect(points[1].hr).toBe(121);
    expect(summary).toEqual({ totalPoints: 2, withGps: 1, withHr: 2, durationMs: 5_000 });
  });
});

describe('parseTrack errors', () => {
  it('throws typed error for malformed XML', () => {
    expect(() => parseTrack(malformedXml)).toThrowError(ParseError);
    try {
      parseTrack(malformedXml);
    } catch (e) {
      expect((e as ParseError).code).toBe('invalid-xml');
    }
  });

  it('throws typed error for XML that is neither GPX nor TCX', () => {
    try {
      parseTrack(notTrackXml);
      expect.unreachable();
    } catch (e) {
      expect((e as ParseError).code).toBe('unknown-format');
    }
  });

  it('throws typed error for GPX with no timestamped points', () => {
    const empty = `<gpx xmlns="http://www.topografix.com/GPX/1/1"><trk><trkseg><trkpt lat="1" lon="2"/></trkseg></trk></gpx>`;
    try {
      parseTrack(empty);
      expect.unreachable();
    } catch (e) {
      expect((e as ParseError).code).toBe('no-points');
    }
  });
});
