import type { MergedPoint } from './types';

function isoUtc(t: number): string {
  return new Date(t).toISOString().replace(/\.\d+Z$/, 'Z');
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a GPX 1.1 document with Garmin TrackPointExtension HR/cadence,
 * as accepted by Strava.
 */
export function buildGpx(points: MergedPoint[], trackName = 'Merged activity'): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="hr-merger"' +
      ' xmlns="http://www.topografix.com/GPX/1/1"' +
      ' xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">',
    ` <trk><name>${escapeXml(trackName)}</name><trkseg>`,
  ];
  for (const p of points) {
    let pt = `  <trkpt lat="${p.lat}" lon="${p.lon}">`;
    if (p.ele !== undefined) pt += `<ele>${p.ele}</ele>`;
    pt += `<time>${isoUtc(p.t)}</time>`;
    if (p.hr !== undefined || p.cad !== undefined) {
      pt += '<extensions><gpxtpx:TrackPointExtension>';
      if (p.hr !== undefined) pt += `<gpxtpx:hr>${p.hr}</gpxtpx:hr>`;
      if (p.cad !== undefined) pt += `<gpxtpx:cad>${p.cad}</gpxtpx:cad>`;
      pt += '</gpxtpx:TrackPointExtension></extensions>';
    }
    pt += '</trkpt>';
    lines.push(pt);
  }
  lines.push(' </trkseg></trk>', '</gpx>', '');
  return lines.join('\n');
}
