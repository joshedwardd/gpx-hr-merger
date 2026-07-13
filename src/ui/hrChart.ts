import type { MergedPoint } from '../lib/types';

export function drawHrChart(canvas: HTMLCanvasElement, points: MergedPoint[]): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const s = points.filter((p) => p.hr !== undefined);
  if (s.length < 2) {
    ctx.fillStyle = '#8b98a8';
    ctx.font = '13px sans-serif';
    ctx.fillText('No overlapping heart-rate data at this offset.', 12, h / 2);
    return;
  }

  const pad = 30;
  const t0 = s[0].t;
  const t1 = s[s.length - 1].t;
  const hrs = s.map((p) => p.hr!);
  const lo = Math.min(...hrs) - 5;
  const hi = Math.max(...hrs) + 5;
  const x = (t: number) => pad + ((t - t0) / (t1 - t0 || 1)) * (w - 2 * pad);
  const y = (v: number) => h - pad - ((v - lo) / (hi - lo || 1)) * (h - 2 * pad);

  ctx.strokeStyle = '#2b3440';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#8b98a8';
  ctx.font = '10px monospace';
  for (const v of [lo, (lo + hi) / 2, hi]) {
    const gy = y(v);
    ctx.beginPath();
    ctx.moveTo(pad, gy);
    ctx.lineTo(w - pad, gy);
    ctx.stroke();
    ctx.fillText(String(Math.round(v)), 4, gy + 3);
  }

  ctx.strokeStyle = '#ff5a4d';
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  s.forEach((p, i) => {
    if (i === 0) ctx.moveTo(x(p.t), y(p.hr!));
    else ctx.lineTo(x(p.t), y(p.hr!));
  });
  ctx.stroke();
}
