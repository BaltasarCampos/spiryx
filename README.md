# Spiryx — Air Quality Dashboard MVP
 
A fast, mobile-first air quality dashboard that shows current AQI, health meaning, and pollutant detail for the user's present location. Built with React 18, TypeScript strict mode, Vite, and TailwindCSS.
 
---
 
## Quick start
 
```bash
node --version   # must be 20+
npm install
npm run dev
```
 
Open the local URL shown by Vite and allow location access when prompted.
 
---
 
## Architecture
 
```
src/
├── components/
│   ├── atoms/          # RetryButton
│   ├── molecules/      # StatusPanel
│   └── organisms/      # AQISummaryCard, HealthMeaningPanel, LocationGate,
│                       # PollutantList, DashboardLayout
├── hooks/
│   ├── useCurrentAQI.ts      # orchestrates fetch, state, refresh timer
│   ├── useGeolocation.ts     # permission state machine
│   └── useRefreshTimer.ts    # 15-minute auto-refresh + manual trigger
├── services/
│   ├── airQualityService.ts  # Open-Meteo AQI endpoint + retry + cache
│   ├── geocodingService.ts   # Nominatim reverse geocoding
│   ├── normalizers.ts        # provider → domain model transformation
│   ├── apiClient.ts          # shared HTTP client with abort support
│   ├── cache.ts              # in-memory TTL cache (session-scoped)
│   └── errors.ts             # typed error classes
├── utils/
│   ├── aqiMapping.ts         # AQI value → category + guidance lookup
│   ├── freshness.ts          # fresh / stale / expired threshold logic
│   └── retry.ts              # exponential backoff retry utility
├── types/
│   └── airQuality.ts         # domain types (AirQualitySnapshot, etc.)
└── config/
    └── constants.ts          # stale thresholds, refresh interval, retry config
```
 
**Data providers**
 
| Purpose | Provider | Auth |
|---|---|---|
| AQI + pollutants | [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | None |
| Reverse geocoding | [Nominatim OpenStreetMap](https://nominatim.org/release-docs/latest/api/Reverse/) | None |
 
**Key design decisions**
 
- No backend — frontend-only SPA
- In-memory API response cache (session-scoped, never persisted)
- Coordinates held in runtime state only — never written to localStorage
- Only `UserPreferences` (units, reducedMotion) persisted to localStorage
- No external analytics or tracking scripts
---
 
## Available scripts
 
```bash
npm run dev            # start Vite dev server
npm run build          # typecheck + production build → dist/
npm run preview        # serve dist/ locally
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run format         # Prettier check
npm run test           # Vitest (single run)
npm run test:watch     # Vitest (watch mode)
npm run test:coverage  # Vitest with coverage report
npm run check:bundle   # gzipped JS bundle ≤ 220 KB (requires build)
npm run check:privacy  # scan dist/ for tracking scripts / console.log
npm run check:coverage # enforce coverage thresholds from coverage-summary.json
npm run check:lighthouse   # Lighthouse ≥ 90 (requires lighthouse installed globally)
npm run check:interaction  # TTI ≤ 3.5s, LCP ≤ 2.5s, CLS ≤ 0.1
npm run validate       # full CI gate: typecheck + lint + test + build + bundle + privacy
```
 
---
 
## Testing
 
**Run all tests**
 
```bash
npm run test
```
 
**Run a specific file**
 
```bash
npm run test -- src/utils/__tests__/aqiMapping.test.ts
```
 
**Coverage report**
 
```bash
npm run test:coverage
# open coverage/index.html
```
 
**Coverage thresholds** (enforced by `scripts/coverage-gate.mjs`):
 
- Utility functions (`src/utils/`): 100% line coverage
- Interactive components (`src/components/`): 80%+ line coverage
---
 
## Validation checklist
 
Run after every significant change before opening a pull request.
 
### Automated
 
```bash
npm run validate
```
 
Covers: TypeScript, ESLint, all tests, production build, bundle budget, privacy scan.
 
### Manual
 
| Check | Pass criteria |
|---|---|
| Location granted | AQI value, location name, scale label, and last-updated timestamp visible within 2 s |
| Location denied | Retry action and browser-settings guidance shown; no manual city input |
| Manual refresh | UI remains responsive; data updates or error shown within 3 s |
| Stale data (> 90 min) | "Stale data" badge and stale warning visible in health panel |
| Expired data (> 180 min) | AQI not shown as current; "Data unavailable" badge shown |
| Partial pollutants | Missing values show explicit "Not available" markers; no layout break |
| Network failure | Retry button and countdown shown after 2 retries exhausted |
 