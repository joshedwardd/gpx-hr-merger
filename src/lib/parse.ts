import { ParseError, type ParseResult, type ParseSummary, type TrackPoint } from './types';

function descendantsByLocalName(node: Element | Document, name: string): Element[] {
  const out: Element[] = [];
  for (const el of node.getElementsByTagName('*')) {
    if (el.localName === name) out.push(el);
  }
  return out;
}

function firstByLocalName(node: Element | Document, name: string): Element | null {
  for (const el of node.getElementsByTagName('*')) {
    if (el.localName === name) return el;
  }
  return null;
}

function num(text: string | null | undefined): number | undefined {
  if (text == null) return undefined;
  const v = parseFloat(text);
  return Number.isFinite(v) ? v : undefined;
}

function int(text: string | null | undefined): number | undefined {
  if (text == null) return undefined;
  const v = parseInt(text, 10);
  return Number.isFinite(v) ? v : undefined;
}

function parseGpxPoint(tp: Element): TrackPoint | null {
  const t = Date.parse(firstByLocalName(tp, 'time')?.textContent?.trim() ?? '');
  if (!Number.isFinite(t)) return null;
  const p: TrackPoint = { t };
  const lat = num(tp.getAttribute('lat'));
  const lon = num(tp.getAttribute('lon'));
  if (lat !== undefined && lon !== undefined) {
    p.lat = lat;
    p.lon = lon;
  }
  const ele = num(firstByLocalName(tp, 'ele')?.textContent);
  if (ele !== undefined) p.ele = ele;
  const hr = int(firstByLocalName(tp, 'hr')?.textContent);
  if (hr !== undefined) p.hr = hr;
  const cad = int(firstByLocalName(tp, 'cad')?.textContent);
  if (cad !== undefined) p.cad = cad;
  return p;
}

function parseTcxPoint(tp: Element): TrackPoint | null {
  const t = Date.parse(firstByLocalName(tp, 'Time')?.textContent?.trim() ?? '');
  if (!Number.isFinite(t)) return null;
  const p: TrackPoint = { t };
  const pos = firstByLocalName(tp, 'Position');
  if (pos) {
    const lat = num(firstByLocalName(pos, 'LatitudeDegrees')?.textContent);
    const lon = num(firstByLocalName(pos, 'LongitudeDegrees')?.textContent);
    if (lat !== undefined && lon !== undefined) {
      p.lat = lat;
      p.lon = lon;
    }
  }
  const ele = num(firstByLocalName(tp, 'AltitudeMeters')?.textContent);
  if (ele !== undefined) p.ele = ele;
  const hrEl = firstByLocalName(tp, 'HeartRateBpm');
  if (hrEl) {
    const hr = int((firstByLocalName(hrEl, 'Value') ?? hrEl).textContent);
    if (hr !== undefined) p.hr = hr;
  }
  const cad =
    int(firstByLocalName(tp, 'Cadence')?.textContent) ??
    int(firstByLocalName(tp, 'RunCadence')?.textContent);
  if (cad !== undefined) p.cad = cad;
  return p;
}

export function summarize(points: TrackPoint[]): ParseSummary {
  return {
    totalPoints: points.length,
    withGps: points.filter((p) => p.lat !== undefined && p.lon !== undefined).length,
    withHr: points.filter((p) => p.hr !== undefined).length,
    durationMs: points.length ? points[points.length - 1].t - points[0].t : 0,
  };
}

export function parseTrack(text: string): ParseResult {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(text, 'application/xml');
  } catch {
    throw new ParseError('invalid-xml', 'File is not valid XML');
  }
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new ParseError('invalid-xml', 'File is not valid XML');
  }

  const raw: (TrackPoint | null)[] = [];
  const collect = (containers: Element[], pointTag: string, parse: (el: Element) => TrackPoint | null) => {
    containers.forEach((container, seg) => {
      for (const el of descendantsByLocalName(container, pointTag)) {
        const p = parse(el);
        if (p && seg > 0) p.seg = seg;
        raw.push(p);
      }
    });
  };

  const tcxPoints = descendantsByLocalName(doc, 'Trackpoint');
  if (firstByLocalName(doc, 'TrainingCenterDatabase') || tcxPoints.length > 0) {
    const tracks = descendantsByLocalName(doc, 'Track');
    collect(tracks.length ? tracks : [doc.documentElement], 'Trackpoint', parseTcxPoint);
  } else {
    const trksegs = descendantsByLocalName(doc, 'trkseg');
    if (trksegs.length === 0 && descendantsByLocalName(doc, 'trkpt').length === 0 && !firstByLocalName(doc, 'gpx')) {
      throw new ParseError('unknown-format', 'Not a GPX or TCX file');
    }
    collect(trksegs.length ? trksegs : [doc.documentElement], 'trkpt', parseGpxPoint);
  }

  const points = raw.filter((p): p is TrackPoint => p !== null).sort((a, b) => a.t - b.t);
  if (points.length === 0) {
    throw new ParseError('no-points', 'No timestamped track points found');
  }
  return { points, summary: summarize(points) };
}
