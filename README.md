# HR Merger

Merge a phone GPS track with a watch heart-rate track into one Strava-ready GPX file, entirely in your browser.

**Why:** some watches (e.g. Amazfit T-Rex Pro) have a good HR sensor but poor GPS in dense urban areas. Record GPS on your phone and HR on your watch, then use this tool to align both recordings by timestamp, write the watch's HR (and cadence) onto the phone's GPS track, and export a single GPX you can upload to Strava.

## Features

- Reads **GPX and TCX**, namespace-agnostic (handles `gpxtpx:hr`, `ns3:hr`, and friends)
- Time-offset slider plus **Auto-align**, which finds the offset that maximizes HR coverage
- Linear HR/cadence interpolation with a 30 s max-gap cutoff, so sensor dropouts stay honest gaps instead of invented data
- Spike filter: HR samples outside 25–250 bpm or deviating wildly from their local median (optical-sensor spikes) are discarded before merging; the UI/CLI report how many
- Leaflet map with the route colored by HR, an HR-over-time chart, distance/duration/avg/max HR stats, and a coverage indicator
- Exports GPX 1.1 with the Garmin `TrackPointExtension` namespace, as accepted by Strava

## Privacy

Everything runs client-side. Files are parsed in your browser and **no data ever leaves your device**. There is no backend, no upload, no analytics.

## How to get the two files

1. Record the run with GPS on your **phone app** and the same run on your **watch**. Start them close together so the clocks roughly line up.
2. Phone: export the activity as **GPX**. It must include `<time>` stamps per trackpoint.
3. Watch: in the **Zepp app**, open the workout and share/export it as GPX or TCX. If the watch already auto-synced the activity to Strava, open that Strava activity and use **Export Original** instead.
4. Load both files here, check the coverage bar (use Auto-align if it is low), download the merged GPX, and upload it to Strava.
5. If the watch version also synced to Strava, **delete that duplicate activity** — or disable the watch app's auto-sync and only upload merged files.

## Running the app

Clone the repo and install dependencies once:

```sh
git clone <this-repo>
cd hr-merger
npm install
```

### Web app (local)

```sh
npm run dev
```

Open the printed URL (usually `http://localhost:5173`), drop your two files onto the slots, and download the merged GPX. No deployment needed — the dev server runs entirely on your machine.

### CLI (no browser)

Copy your two exported files into the repo folder (or use absolute paths) and run:

```sh
npm run merge -- --gps phone.gpx --hr watch.tcx -o merged.gpx
```

Note: `npm run` resolves relative paths from the repo root, so either run the command from there or pass absolute paths. The CLI wraps the same `src/lib/` modules the web app uses, so both produce identical output.

| Flag | Meaning |
| --- | --- |
| `--gps <file>` | GPS track — geometry comes from here (required) |
| `--hr <file>` | HR track — heart rate/cadence come from here (required) |
| `-o, --out <file>` | output file (default `merged-activity.gpx`) |
| `--offset <sec>` | fixed HR time offset in seconds; omit to auto-align |
| `--name <name>` | track name written into the GPX |

Example output:

```
GPS file : 901 pts, 901 with coords, 30:00
HR file  : 1801 pts, 1801 with HR, 30:00
Offset   : +42 s (auto-aligned)
Coverage : 100% of 901 trackpoints got HR
Stats    : 10.42 km, 30:00, avg 138 bpm, max 165 bpm
Wrote    : merged.gpx
```

Warnings (swapped files, low coverage) go to stderr; the exit code is non-zero on unreadable or malformed input.

## Development

```sh
npm run test      # vitest unit tests
npm run build     # type-check + production build to dist/
npm run preview   # serve the production build locally
```

All parsing, merging, and GPX-writing logic lives in pure, DOM-free modules under `src/lib/`, unit-tested with Vitest. The web UI (`src/ui/`, `src/main.ts`) and the CLI (`src/cli/`) are thin consumers of those modules.

## Deploying to GitHub Pages

The included workflow (`.github/workflows/deploy.yml`) builds and publishes `dist/` to GitHub Pages on every push to `main`. One-time setup: in the repository settings, set **Pages → Source → GitHub Actions**.

The Vite `base` is `/gpx-hr-merger/`; change it in `vite.config.ts` if the repository has a different name or you serve from a custom domain.

## Roadmap

- Editable trackpoints (drag to fix bad GPS fixes)
- Elevation smoothing
- FIT-file support via a FIT parser
- Activity splitting
- Direct Strava upload via OAuth

## License

[MIT](LICENSE)
