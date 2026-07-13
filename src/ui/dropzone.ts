import { parseTrack } from '../lib/parse';
import { ParseError, type ParseResult } from '../lib/types';

export type Role = 'gps' | 'hr';

export interface Dropzone {
  el: HTMLElement;
}

const COPY: Record<Role, { title: string; blurb: string; warnWhenMissing: string }> = {
  gps: {
    title: 'Phone track — GPS',
    blurb: 'The accurate route. Distance & map come from this file.',
    warnWhenMissing: 'This file has no GPS coordinates — did you mean to drop it in the watch slot?',
  },
  hr: {
    title: 'Watch track — heart rate',
    blurb: 'Your Zepp/watch export. Only HR and cadence are pulled from here; its GPS is ignored.',
    warnWhenMissing: 'This file has no heart-rate samples — did you mean to drop it in the phone slot?',
  },
};

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return (h ? `${h}:` : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(ss).padStart(2, '0');
}

export function createDropzone(
  container: HTMLElement,
  role: Role,
  onLoad: (result: ParseResult, filename: string) => void,
): Dropzone {
  const copy = COPY[role];
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `drop role-${role}`;
  el.innerHTML = `
    <h3><span class="dot role-${role}"></span>${copy.title}</h3>
    <p>${copy.blurb}</p>
    <div class="fname"></div>
    <div class="metaline"></div>
    <div class="warn" hidden></div>
    <div class="error" hidden></div>
  `;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.gpx,.tcx,.xml';
  el.appendChild(input);
  container.appendChild(el);

  const fname = el.querySelector<HTMLElement>('.fname')!;
  const meta = el.querySelector<HTMLElement>('.metaline')!;
  const warn = el.querySelector<HTMLElement>('.warn')!;
  const error = el.querySelector<HTMLElement>('.error')!;

  async function load(file: File) {
    error.hidden = true;
    warn.hidden = true;
    try {
      const result = parseTrack(await file.text());
      const s = result.summary;
      el.classList.add('filled');
      fname.textContent = file.name;
      meta.innerHTML =
        `<span><b>${s.totalPoints}</b> pts</span>` +
        `<span><b>${s.withGps}</b> GPS</span>` +
        `<span><b>${s.withHr}</b> HR</span>` +
        `<span>${formatDuration(s.durationMs)}</span>`;
      const missing = role === 'gps' ? s.withGps === 0 : s.withHr === 0;
      if (missing) {
        warn.textContent = copy.warnWhenMissing;
        warn.hidden = false;
      }
      onLoad(result, file.name);
    } catch (e) {
      el.classList.remove('filled');
      fname.textContent = '';
      meta.textContent = '';
      error.textContent =
        e instanceof ParseError ? `Couldn't read file: ${e.message}` : 'Unexpected error reading file';
      error.hidden = false;
    }
  }

  el.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files?.[0]) void load(input.files[0]);
    input.value = '';
  });
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.classList.add('dragover');
  });
  el.addEventListener('dragleave', () => el.classList.remove('dragover'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('dragover');
    if (e.dataTransfer?.files[0]) void load(e.dataTransfer.files[0]);
  });

  return { el };
}
