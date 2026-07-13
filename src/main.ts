import './style.css';
import { autoAlign, mergeTracks } from './lib/merge';
import { buildGpx } from './lib/exportGpx';
import type { ParseResult } from './lib/types';
import { renderCoverage } from './ui/coverage';
import { downloadFile } from './ui/download';
import { createDropzone } from './ui/dropzone';
import { drawHrChart } from './ui/hrChart';
import { MapView } from './ui/mapView';
import { renderStats } from './ui/stats';

interface AppState {
  gps: ParseResult | null;
  hr: ParseResult | null;
  offsetSeconds: number;
}

const state: AppState = { gps: null, hr: null, offsetSeconds: 0 };

const resultEl = document.querySelector<HTMLElement>('#result')!;
const offsetRange = document.querySelector<HTMLInputElement>('#offset-range')!;
const offsetNum = document.querySelector<HTMLInputElement>('#offset-num')!;
const offsetVal = document.querySelector<HTMLOutputElement>('#offset-val')!;
const autoAlignBtn = document.querySelector<HTMLButtonElement>('#auto-align')!;

let mapView: MapView | null = null;
let chartCanvas: HTMLCanvasElement | null = null;
let statsEl: HTMLElement | null = null;
let covEl: HTMLElement | null = null;
let hintEl: HTMLElement | null = null;
let filenameInput: HTMLInputElement | null = null;

function buildResultDom(): void {
  resultEl.innerHTML = `
    <div class="viz">
      <div class="card"><h4>Route · colored by heart rate</h4><div id="map"></div></div>
      <div class="card"><h4>Heart rate over time</h4><canvas class="chart" id="hr-chart"></canvas></div>
    </div>
    <div class="stats" id="stats"></div>
    <div class="cov" id="cov"></div>
    <div class="actions">
      <button class="go" id="export">Download merged GPX</button>
      <label class="visually-hidden" for="fname">Export filename</label>
      <input class="fname-input" id="fname" value="merged-activity.gpx" spellcheck="false" />
      <span class="hint" id="export-hint"></span>
    </div>
  `;
  mapView = new MapView(resultEl.querySelector<HTMLElement>('#map')!);
  chartCanvas = resultEl.querySelector<HTMLCanvasElement>('#hr-chart')!;
  statsEl = resultEl.querySelector<HTMLElement>('#stats')!;
  covEl = resultEl.querySelector<HTMLElement>('#cov')!;
  hintEl = resultEl.querySelector<HTMLElement>('#export-hint')!;
  filenameInput = resultEl.querySelector<HTMLInputElement>('#fname')!;
  resultEl.querySelector<HTMLButtonElement>('#export')!.addEventListener('click', exportMerged);
  mapView.invalidateSize();
}

function render(): void {
  autoAlignBtn.disabled = !(state.gps && state.hr);
  if (!state.gps || !state.hr) {
    resultEl.innerHTML = '<div class="empty">Load both files to see the merge.</div>';
    mapView = null;
    return;
  }
  if (!mapView) buildResultDom();

  const { points, coverage, hrSpikesDropped } = mergeTracks(
    state.gps.points,
    state.hr.points,
    state.offsetSeconds,
  );
  const hrSampleCount = state.hr.summary.withHr;

  mapView!.update(points);
  drawHrChart(chartCanvas!, points);
  renderStats(statsEl!, points);
  renderCoverage(covEl!, coverage, points.length, hrSampleCount, hrSpikesDropped);
  hintEl!.textContent =
    points.length === 0
      ? 'No GPS points to export — the phone file has no coordinates.'
      : coverage < 0.7
        ? 'Low coverage — the exported file will have HR gaps.'
        : 'Ready for Strava.';
}

function exportMerged(): void {
  if (!state.gps || !state.hr) return;
  const { points } = mergeTracks(state.gps.points, state.hr.points, state.offsetSeconds);
  if (points.length === 0) return;
  const name = filenameInput?.value.trim() || 'merged-activity.gpx';
  downloadFile(buildGpx(points), name.endsWith('.gpx') ? name : `${name}.gpx`);
}

function setOffset(seconds: number, source?: 'range' | 'num'): void {
  const v = Math.max(-300, Math.min(300, Math.round(seconds) || 0));
  state.offsetSeconds = v;
  if (source !== 'range') offsetRange.value = String(v);
  if (source !== 'num') offsetNum.value = String(v);
  offsetVal.textContent = `${v >= 0 ? '+' : ''}${v} s`;
  render();
}

createDropzone(document.querySelector<HTMLElement>('#drop-gps')!, 'gps', (result) => {
  state.gps = result;
  render();
});
createDropzone(document.querySelector<HTMLElement>('#drop-hr')!, 'hr', (result) => {
  state.hr = result;
  render();
});

offsetRange.addEventListener('input', () => setOffset(Number(offsetRange.value), 'range'));
offsetNum.addEventListener('input', () => setOffset(Number(offsetNum.value), 'num'));
autoAlignBtn.addEventListener('click', () => {
  if (!state.gps || !state.hr) return;
  setOffset(autoAlign(state.gps.points, state.hr.points));
});

window.addEventListener('resize', () => {
  if (mapView && state.gps && state.hr) {
    mapView.invalidateSize();
    render();
  }
});
