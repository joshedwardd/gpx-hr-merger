export function renderCoverage(
  container: HTMLElement,
  coverage: number,
  gpsCount: number,
  hrSampleCount: number,
): void {
  const pct = Math.round(coverage * 100);
  const color = pct > 85 ? 'var(--ok)' : pct > 50 ? 'var(--warn)' : 'var(--hr)';
  const hint =
    pct < 70
      ? ' Low coverage — try Auto-align or nudge the time offset.'
      : '';
  container.innerHTML = `
    HR coverage: <b>${pct}%</b> of ${gpsCount} trackpoints matched
    (${hrSampleCount} HR samples in watch file).${hint}
    <div class="bar"><span style="width:${pct}%;background:${color}"></span></div>
  `;
}
