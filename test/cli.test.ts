import { DOMParser as XmldomParser } from '@xmldom/xmldom';
import { afterEach, describe, expect, it } from 'vitest';
import { runMerge } from '../src/cli/run';
import { parseTrack } from '../src/lib/parse';
import { ParseError } from '../src/lib/types';
import { gpxWithHr, malformedXml, tcxWithHr } from './fixtures';

const T0 = Date.parse('2026-07-01T08:00:00Z');
const iso = (s: number) => new Date(T0 + s * 1000).toISOString().replace(/\.\d+Z$/, 'Z');

function syntheticGpx(shiftSeconds: number, withCoords: boolean): string {
  let pts = '';
  for (let s = 0; s <= 600; s += 5) {
    const attrs = withCoords ? ` lat="${(52.52 + s * 1e-5).toFixed(6)}" lon="13.405"` : '';
    pts += `<trkpt${attrs}><time>${iso(s - shiftSeconds)}</time><extensions><gpxtpx:hr>${120 + (s % 40)}</gpxtpx:hr></extensions></trkpt>`;
  }
  return `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><trkseg>${pts}</trkseg></trk></gpx>`;
}

describe('runMerge', () => {
  it('auto-aligns when no offset is given and produces re-parseable GPX', () => {
    const res = runMerge({ gpsText: syntheticGpx(0, true), hrText: syntheticGpx(42, false) });
    expect(res.offsetWasAuto).toBe(true);
    expect(res.offsetSeconds).toBe(42);
    expect(res.coverage).toBe(1);
    const back = parseTrack(res.xml);
    expect(back.summary.totalPoints).toBe(res.report.mergedPoints);
    expect(back.summary.withHr).toBe(res.report.mergedPoints);
  });

  it('uses the explicit offset when given', () => {
    const res = runMerge({ gpsText: gpxWithHr, hrText: tcxWithHr, offsetSeconds: 5 });
    expect(res.offsetWasAuto).toBe(false);
    expect(res.offsetSeconds).toBe(5);
  });

  it('warns when the GPS file has no coordinates', () => {
    const res = runMerge({ gpsText: syntheticGpx(0, false), hrText: tcxWithHr });
    expect(res.report.warnings.some((w) => w.includes('no coordinates'))).toBe(true);
    expect(res.report.mergedPoints).toBe(0);
  });

  it('warns when the HR file has no heart-rate samples', () => {
    const noHr = syntheticGpx(0, true).replace(/<extensions>.*?<\/extensions>/g, '');
    const res = runMerge({ gpsText: gpxWithHr, hrText: noHr });
    expect(res.report.warnings.some((w) => w.includes('no heart-rate'))).toBe(true);
  });

  it('propagates ParseError for malformed input', () => {
    expect(() => runMerge({ gpsText: malformedXml, hrText: tcxWithHr })).toThrowError(ParseError);
  });

  it('passes the track name through to the GPX', () => {
    const res = runMerge({ gpsText: gpxWithHr, hrText: tcxWithHr, trackName: 'Morning run' });
    expect(res.xml).toContain('<name>Morning run</name>');
  });
});

describe('runMerge under the xmldom shim (Node CLI path)', () => {
  const browserDomParser = globalThis.DOMParser;
  afterEach(() => {
    globalThis.DOMParser = browserDomParser;
  });

  it('parses and merges identically to the browser DOMParser', () => {
    const browser = runMerge({ gpsText: gpxWithHr, hrText: tcxWithHr, offsetSeconds: 0 });
    globalThis.DOMParser = XmldomParser as unknown as typeof DOMParser;
    const node = runMerge({ gpsText: gpxWithHr, hrText: tcxWithHr, offsetSeconds: 0 });
    expect(node.xml).toBe(browser.xml);
    expect(node.report).toEqual(browser.report);
  });

  it('turns xmldom parse throws into ParseError', () => {
    globalThis.DOMParser = XmldomParser as unknown as typeof DOMParser;
    try {
      parseTrack(malformedXml);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).code).toBe('invalid-xml');
    }
  });
});
