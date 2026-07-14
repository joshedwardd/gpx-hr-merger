import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MergedPoint } from '../lib/types';
import { hrColor, hrRange } from './hrColor';

const FALLBACK_COLOR = '#4cc2ff';
const COLOR_BINS = 24;

export class MapView {
  private map: L.Map;
  private trackLayer: L.LayerGroup;

  constructor(container: HTMLElement) {
    this.map = L.map(container, { zoomSnap: 0.5 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);
    this.trackLayer = L.layerGroup().addTo(this.map);
    this.map.setView([0, 0], 2);
  }

  update(points: MergedPoint[]): void {
    this.trackLayer.clearLayers();
    if (points.length < 2) return;

    const range = hrRange(points.filter((p) => p.hr !== undefined).map((p) => p.hr!));
    const colorOf = (p: MergedPoint): string => {
      if (p.hr === undefined || !range) return FALLBACK_COLOR;
      const bin = Math.round(((p.hr - range.min) / Math.max(1, range.max - range.min)) * COLOR_BINS);
      return hrColor(range.min + (bin / COLOR_BINS) * (range.max - range.min), range);
    };

    let runColor = colorOf(points[1]);
    let run: L.LatLngExpression[] = [[points[0].lat, points[0].lon]];
    const flush = () => {
      if (run.length < 2) return;
      L.polyline(run, { color: runColor, weight: 4, lineCap: 'round', lineJoin: 'round' }).addTo(
        this.trackLayer,
      );
    };
    for (let i = 1; i < points.length; i++) {
      const c = colorOf(points[i]);
      const ll: L.LatLngExpression = [points[i].lat, points[i].lon];
      if (points[i].seg !== points[i - 1].seg) {
        flush();
        run = [ll];
        runColor = c;
      } else if (c === runColor) {
        run.push(ll);
      } else {
        flush();
        run = [[points[i - 1].lat, points[i - 1].lon], ll];
        runColor = c;
      }
    }
    flush();

    const start = points[0];
    const end = points[points.length - 1];
    L.circleMarker([start.lat, start.lon], {
      radius: 6,
      color: '#0e1116',
      weight: 2,
      fillColor: '#3fb950',
      fillOpacity: 1,
    })
      .bindTooltip('Start')
      .addTo(this.trackLayer);
    L.circleMarker([end.lat, end.lon], {
      radius: 6,
      color: '#0e1116',
      weight: 2,
      fillColor: '#ff5a4d',
      fillOpacity: 1,
    })
      .bindTooltip('End')
      .addTo(this.trackLayer);

    this.map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lon])), { padding: [20, 20] });
  }

  invalidateSize(): void {
    this.map.invalidateSize();
  }
}
