import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { DOMParser as XmldomParser } from '@xmldom/xmldom';
import { ParseError } from '../lib/types';
import { runMerge } from './run';

globalThis.DOMParser = XmldomParser as unknown as typeof DOMParser;

const HELP = `Merge a phone GPS track with a watch heart-rate track into one Strava-ready GPX.

Usage:
  npm run merge -- --gps <phone.gpx> --hr <watch.tcx> [options]

Options:
  --gps <file>       GPS track (geometry comes from here)         [required]
  --hr <file>        HR track (heart rate / cadence from here)    [required]
  -o, --out <file>   output file                     (default: merged-activity.gpx)
  --offset <sec>     fixed HR time offset in seconds (default: auto-align)
  --name <name>      track name in the GPX           (default: Merged activity)
  -h, --help         show this help
`;

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return (h ? `${h}:` : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(ss).padStart(2, '0');
}

const { values } = parseArgs({
  options: {
    gps: { type: 'string' },
    hr: { type: 'string' },
    out: { type: 'string', short: 'o', default: 'merged-activity.gpx' },
    offset: { type: 'string' },
    name: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(HELP);
  process.exit(0);
}
if (!values.gps || !values.hr) {
  console.error(HELP);
  fail('both --gps and --hr are required');
}

let offsetSeconds: number | undefined;
if (values.offset !== undefined) {
  offsetSeconds = Number(values.offset);
  if (!Number.isFinite(offsetSeconds)) fail(`invalid --offset: ${values.offset}`);
}

function readTrack(path: string): string {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    fail(`cannot read file: ${path}`);
  }
}

try {
  const result = runMerge({
    gpsText: readTrack(values.gps),
    hrText: readTrack(values.hr),
    ...(offsetSeconds !== undefined && { offsetSeconds }),
    ...(values.name !== undefined && { trackName: values.name }),
  });
  const { report } = result;

  for (const w of report.warnings) console.error(`Warning: ${w}`);
  if (report.mergedPoints === 0) fail('no GPS points to export — the GPS file has no coordinates');

  writeFileSync(values.out!, result.xml);

  const pct = Math.round(result.coverage * 100);
  const sign = result.offsetSeconds >= 0 ? '+' : '';
  console.log(`GPS file : ${report.gps.totalPoints} pts, ${report.gps.withGps} with coords, ${formatDuration(report.gps.durationMs)}`);
  console.log(`HR file  : ${report.hr.totalPoints} pts, ${report.hr.withHr} with HR, ${formatDuration(report.hr.durationMs)}`);
  console.log(`Offset   : ${sign}${result.offsetSeconds} s${result.offsetWasAuto ? ' (auto-aligned)' : ''}`);
  console.log(`Coverage : ${pct}% of ${report.mergedPoints} trackpoints got HR`);
  if (report.hrSpikesDropped > 0) {
    console.log(`Filtered : ${report.hrSpikesDropped} implausible HR samples (spikes / out of range)`);
  }
  console.log(`Stats    : ${report.distanceKm.toFixed(2)} km, ${formatDuration(report.durationMs)}, avg ${report.avgHr ?? '—'} bpm, max ${report.maxHr ?? '—'} bpm`);
  console.log(`Wrote    : ${values.out}`);
  if (pct < 70) {
    console.error('Warning: low HR coverage — try a different --offset or check that both files cover the same activity');
  }
} catch (e) {
  if (e instanceof ParseError) fail(e.message);
  throw e;
}
