# Development History

## 2026-03-26 — Project Initialized

- Initialized project with Create React App (TypeScript template)
- React 19.2.4, TypeScript 4.9.5, react-scripts 5.0.1
- Created project documentation:
  - `docs/PLAN.md` — Implementation roadmap
  - `docs/FEATURES.md` — Feature descriptions + acceptance criteria
  - `docs/ARCHITECTURE.md` — System architecture + data flow
  - `docs/TECH-STACK.md` — Dependencies + Naver API reference
  - `docs/HISTORY.md` — This file
  - `docs/TRIAL-ERROR.md` — Experiment log

### Design Decisions Made
- **Data source**: Use `pcmap.place.naver.com` internal API for restaurant data (richest data: menus, prices, photos)
- **Directions**: Naver Directions 5 API with embedded map (free 60K calls/month)
- **Starting point**: Default office address + browser GPS + manual address input
- **Architecture**: React frontend + Vercel serverless functions (API proxy)
- **Styling**: SCSS (via `sass` package)
- **Deployment**: Vercel
- **New dependencies**: Only `sass` (build-time) + `canvas-confetti` (~6 KB)

### Naver API Research
- Confirmed all Maps APIs have generous free tiers (representative account)
- No official Place Detail API exists — internal API is the only option for menu/price data
- NCP application registered at `console.ncloud.com`

## 2026-03-26 — Phase 2: Apollo State Migration + URL Fix

### Naver Place Page Migration
- Naver migrated `pcmap.place.naver.com` from Next.js (`__NEXT_DATA__`) to Apollo Client (`__APOLLO_STATE__`)
- Updated `api/place.ts` to parse Apollo cache: `PlaceDetailBase:{placeId}` for info, `Menu:{placeId}_N` for menus
- Thumbnail extraction searches menu images and other Apollo cache entries

### naver.me Short URL Issue
- `naver.me` short URLs return 404 when fetched server-side (expired or blocked)
- Updated UI to guide users to copy browser address bar URL instead of share button URL

## 2026-03-26 — Prototype Complete (Steps 0-8)

### Step 1: Project Scaffolding
- Installed `sass` (^1.98.0) and `canvas-confetti` (^1.9.4)
- Created `vercel.json`, `.env.local`, TypeScript type definitions
- Added Naver Map JS SDK to `index.html`, Noto Sans KR font
- Set up `naver.maps` global type declarations in `react-app-env.d.ts`

### Step 2: Serverless API Proxy
- `api/place.ts` — Fetches restaurant data from `pcmap.place.naver.com`, parses `__APOLLO_STATE__`
- `api/directions.ts` — Proxies Naver Directions 5 API with NCP auth
- `api/geocode.ts` — Proxies Naver Geocoding API

### Step 3: URL Input + Restaurant Cards
- `UrlInput` component with loading spinner and error display
- `RestaurantCard` with thumbnail, name, category badge, menu items/prices
- `RestaurantList` with grid layout and "사다리 타기 시작!" button
- `useRestaurants` hook with add/remove/clear + duplicate detection
- App shell with 3-phase state machine (`input` → `game` → `result`)

### Step 4-5: Ghost Leg Game (사다리타기)
- `ladderLogic.ts` — Ladder generation, path tracing, result determination
- SVG-based rendering with vertical lines, horizontal rungs, restaurant labels
- `useAnimation` hook with `requestAnimationFrame` and ease-out cubic timing
- Animated ball with glow effect, colored trail line
- Confetti celebration on winner reveal (via `canvas-confetti`)

### Step 6: Result Screen + Naver Map
- `NaverMap` component — embedded interactive map with custom markers + route polyline
- `ResultScreen` — winner card, directions summary (distance, time, taxi fare), action buttons
- `useDirections` hook with distance/duration formatters

### Step 7: Starting Point Configuration
- `useGeolocation` hook — browser GPS with permission error handling
- `StartingPoint` component — collapsible panel with 3 modes (default/GPS/manual address)
- Geocoding integration for manual address input

### Step 8: Polish
- Removed CRA boilerplate (logo.svg, App.css, index.css, App.test.tsx)
- Updated manifest.json with Korean app name and theme color
- OG meta tags for KakaoTalk sharing
- Clean build with 0 warnings
- Build size: 70 KB JS + 2.9 KB CSS (gzipped)
