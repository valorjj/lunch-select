# Tech Stack

## Core Dependencies

| Category | Library | Version | Purpose | Bundle Impact |
|----------|---------|---------|---------|---------------|
| Framework | `react` | ^19.2.4 | UI framework | Already installed |
| Framework | `react-dom` | ^19.2.4 | DOM rendering | Already installed |
| Language | `typescript` | ^4.9.5 | Type safety | Build-time only |
| Build | `react-scripts` | 5.0.1 | CRA build toolchain | Build-time only |
| Styling | `sass` | ^1.86.0 | SCSS → CSS compilation | **0 KB runtime** |
| Celebration | `canvas-confetti` | ^1.9.3 | Confetti particle effect on winner reveal | **~6 KB gzipped** |
| Types | `@types/canvas-confetti` | latest | TypeScript types for canvas-confetti | Dev only |

### Total New Client Bundle: ~6 KB gzipped

---

## Libraries NOT Needed (and Why)

| Library | Why Not |
|---------|---------|
| `axios` | Native `fetch` covers all our needs. Saves ~13 KB. |
| `framer-motion` / `react-spring` | `requestAnimationFrame` + SVG is sufficient for ladder animation. Saves ~18-32 KB. |
| `redux` / `zustand` / `jotai` | `useState` + `useReducer` is enough for a 3-phase app with simple state. |
| `react-router` | Single page with phase state — no URL routing needed. |
| `lodash` | Modern JS built-ins (`Array.map/filter/reduce`, `structuredClone`, `Intl.NumberFormat`) cover everything. |
| `d3` / SVG libraries | React JSX handles SVG natively. Ladder game is just lines and circles. |
| `node-fetch` | Vercel serverless runs Node 18+ which has native `fetch`. |
| `express` / `cors` | Vercel handles routing and CORS configuration natively. |

---

## Testing Stack (Pre-installed)

| Library | Version | Purpose |
|---------|---------|---------|
| `@testing-library/react` | ^16.3.2 | Component testing |
| `@testing-library/jest-dom` | ^6.9.1 | DOM assertion matchers |
| `@testing-library/user-event` | ^13.5.0 | User interaction simulation |
| `@testing-library/dom` | ^10.4.1 | DOM testing utilities |
| `@types/jest` | ^27.5.2 | Jest TypeScript types |
| Jest | (bundled with react-scripts) | Test runner |

---

## External SDKs (CDN)

| SDK | Load Method | Purpose |
|-----|-------------|---------|
| Naver Map JS SDK v3 | `<script>` tag in `index.html` | Interactive map embed, markers, polylines |
| Noto Sans KR | Google Fonts CDN | Korean web font |

---

## Naver APIs

### Authentication

Two separate auth systems:

1. **Naver Cloud Platform (NCP)** — for Maps, Directions, Geocoding
   - Register at `console.ncloud.com` → Maps → Application
   - Get `Client ID` + `Client Secret`
   - Headers: `x-ncp-apigw-api-key-id` + `x-ncp-apigw-api-key`

2. **Naver Map JS SDK** — for frontend map embed
   - Uses the same NCP Client ID
   - Passed via script tag query param: `?ncpClientId=YOUR_ID`

### API Reference

| API | Endpoint | Method | Free Tier | Purpose |
|-----|----------|--------|-----------|---------|
| Place Details | `pcmap.place.naver.com/restaurant/{id}/home` | GET | Unlimited (unofficial) | Restaurant name, menu, prices, coords, images |
| Directions 5 | `naveropenapi.apigw.ntruss.com/map-direction/v1/driving` | GET | 60,000/month | Walking/driving route with path coordinates |
| Geocoding | `naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode` | GET | 3,000,000/month | Address string → lat/lng coordinates |
| Reverse Geocoding | `naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc` | GET | 3,000,000/month | Coordinates → address |
| Dynamic Map | CDN JS SDK | - | 6,000,000/month | Interactive map embed |
| Static Map | `naveropenapi.apigw.ntruss.com/map-static/v2/raster` | GET | 3,000,000/month | Map image generation (backup option) |

### Pricing (NCP Maps, KRW)

| Service | Free Tier | Over-limit |
|---------|-----------|------------|
| Dynamic Map | 6,000,000 calls/month | 0.1원/call |
| Static Map | 3,000,000 calls/month | 2원/call |
| Geocoding | 3,000,000 calls/month | 0.5원/call |
| Reverse Geocoding | 3,000,000 calls/month | 0.5원/call |
| Directions 5 | 60,000 calls/month | 5원/call |
| Directions 15 | 3,000 calls/month | 20원/call |

*Free tier applies to the "representative account" (대표 계정) only. VAT excluded.*

### Place Details API (Unofficial)

This is the only way to get menu items and prices. It's an internal Naver API, not publicly documented.

**Known patterns:**
- HTML page: `https://pcmap.place.naver.com/restaurant/{placeId}/home`
- Contains `__NEXT_DATA__` script tag with full JSON payload
- JSON includes: name, category, address, coordinates, menu items, prices, images, hours, phone

**Risk:** Naver can change or block this at any time. Our serverless proxy (`api/place.ts`) isolates this risk — only one file needs updating if the API changes.

---

## Development Tools

| Tool | Purpose |
|------|---------|
| Vercel CLI | Local dev (`vercel dev`) + production deploy (`vercel --prod`) |
| WebStorm | IDE (user's choice) |
| Git | Version control |
| npm | Package manager |

---

## Browser Support

Targets from `package.json` browserslist:
- **Production**: >0.2% market share, not dead, not Opera Mini
- **Development**: Latest Chrome, Firefox, Safari
