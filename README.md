# 🌅 Sunsetrise

A 7-day forecast for beautiful sunrises and sunsets in any city, plus a moon
calendar (phases, moonrise/moonset, supermoons, eclipses). Pick a city
(or detect your location) — and see on which day and at which hour the sky will
be truly beautiful.

A static site built with React + TypeScript, no backend. Weather data comes from
[Open-Meteo](https://open-meteo.com) (free, no API key, open CORS — requests go
straight from the browser).

## How it works

The beauty of a sunrise/sunset is estimated from weather factors (following the
published principles of [SunsetWx](https://sunburstwx.com); the formula is
closed, the principles are public):

- **High and mid clouds** (cirrus, altocumulus) — a screen catching the light of
  the low sun. Required for a "Great" score.
- **Low clouds and precipitation** — block the sun; the sky turns grey.
- **Overcast due to cirrostratus** is NOT penalized — it produces a beautiful
  afterglow (protects against a false "Poor").
- **Moderate humidity** and **rising pressure after a front** intensify the colour.

Categories: **Poor** 0–25 · **Fair** 25–50 · **Good** 50–75 · **Great** 75–100.
The event window is H-3…H+3, asymmetric: for sunset the weight is shifted to the
hours **after** (afterglow), for sunrise — to the hours **before** (pre-glow).
The event score = 0.8 × weighted mean + 0.2 × peak.

> This is an amateur estimate from weather factors, not a scientific forecast.
> The sky is alive — the model does make mistakes.

## Running locally

```bash
npm install
npm run dev             # http://localhost:5173
npm test                # unit tests
npm run test:coverage   # with coverage (thresholds: lines/functions ≥85%, branches ≥80%)
npm run build           # build into dist/
npm run preview         # preview the built site
```

Requires Node 20+.

## Deploying to GitHub Pages

1. Push the repository to GitHub.
2. In the repo settings: **Settings → Pages → Source: GitHub Actions**.
3. A push to `main` triggers the workflow `.github/workflows/deploy.yml`
   (Node 20, `npm ci`, `npm run build`, deploys `dist/`). The site lives at
   `https://<username>.github.io/sunsetrise/`.

`vite.config.ts` uses `base: './'`, so the build works on a project page with
any repo name.

## Privacy

There is no backend, no analytics and no tracking. The browser sends exactly
two kinds of requests, both key-free:

- **Open-Meteo** — weather forecast and city search. Receives coordinates or a
  city name typed in the search field.
- **BigDataCloud** (`reverse-geocode-client`) — only after pressing "My
  location": the detected coordinates are resolved to a city name.

Everything else lives in `localStorage` on your own device (recents, theme,
UI strings); nothing is sent anywhere. The moon page computes all astronomy
(astronomy-engine) fully offline.

## Structure

```
src/
├─ App.tsx, MoonApp.tsx, main.tsx, moon-main.tsx, types.ts
├─ i18n/         strings.ts (English-only UI dictionary)
├─ constants/    categories · colors · weatherCodes · endpoints
├─ lib/          smooth · windowing · pressure · aggregate · categorize · scoring · format · forecast · moon · url
├─ api/          forecastClient · geocodingClient · reverseGeocode · errors
├─ hooks/        useForecast · useGeocoding · useGeolocation · useMediaQuery · useTheme · useLocationSync · useRecents
├─ components/   (each in its own folder: .tsx + .module.css + .test.tsx)
│   Header · SearchBar · LocationPicker · ForecastList · DayCard ·
│   QualityBadge · HourlyChart · Legend · ErrorState · MoonCalendar ·
│   MoonEventsList · MoonEventBadge
└─ styles/       tokens.css (tokens + themes) · global.css
```

Styling uses CSS Modules plus shared tokens in `tokens.css`. The dark theme
follows the system `prefers-color-scheme` with a manual toggle (persisted in
`localStorage`). Category colors have a single source of truth:
`constants/colors.ts` (for the chart) and `tokens.css` (for badges).

## Tech stack

React 18 · TypeScript (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) ·
Vite · Vitest + @testing-library + jsdom · CSS Modules.

## License and data

Code — MIT. Weather data — Open-Meteo, licensed CC-BY 4.0.