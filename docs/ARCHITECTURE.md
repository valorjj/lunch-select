# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (Client)                      │
│                                                         │
│  React 19 + TypeScript + SCSS                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │                   App.tsx                        │    │
│  │              Phase State Machine                 │    │
│  │         'input' → 'game' → 'result'             │    │
│  │                                                  │    │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │    │
│  │  │UrlInput  │  │LadderGame │  │ResultScreen  │  │    │
│  │  │Restaurant│  │(SVG +     │  │NaverMap      │  │    │
│  │  │List      │  │ animation)│  │Directions    │  │    │
│  │  └──────────┘  └───────────┘  └──────────────┘  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Naver Map JS SDK (loaded via CDN <script> tag)         │
└────────────────────┬────────────────────────────────────┘
                     │ fetch('/api/...')
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Vercel Serverless Functions                  │
│                                                         │
│  /api/place.ts        → pcmap.place.naver.com           │
│  /api/directions.ts   → Naver Directions 5 API          │
│  /api/geocode.ts      → Naver Geocoding API             │
│                                                         │
│  (Hides API keys, handles CORS, transforms responses)   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Naver APIs (External)                    │
│                                                         │
│  pcmap.place.naver.com    — Restaurant details (내부 API) │
│  Directions 5 API         — Walking/driving routes       │
│  Geocoding API            — Address → coordinates        │
│  Dynamic Map JS SDK       — Interactive map embed        │
└─────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Phase State Machine

The app has three phases, managed by a single `useState` in `App.tsx`. No routing library needed.

```
┌─────────┐    Start Game    ┌─────────┐    Winner Selected    ┌─────────┐
│  INPUT  │ ───────────────▶ │  GAME   │ ────────────────────▶ │ RESULT  │
│         │  (2+ restaurants) │         │                       │         │
└─────────┘                  └─────────┘                       └─────────┘
     ▲                                                              │
     │                        "새로 시작"                            │
     └──────────────────────────────────────────────────────────────┘
     ▲                                                              │
     │                        "다시 하기" (same restaurants)          │
     └───────────────────── back to GAME ◀──────────────────────────┘
```

### Component Tree

```
App
├── Header ("점심 뭐 먹지?")
├── StartingPoint (configurable office/GPS/manual)
│
├── [phase: input]
│   ├── UrlInput (paste URL + "추가" button)
│   └── RestaurantList
│       ├── RestaurantCard (×N)
│       └── "사다리 타기 시작!" button
│
├── [phase: game]
│   └── LadderGame (SVG + animation)
│
└── [phase: result]
    └── ResultScreen
        ├── Winner info (name, image, category)
        ├── NaverMap (embedded map + route polyline)
        ├── Directions info (time, distance)
        └── Action buttons ("다시 하기", "새로 시작")
```

### Hooks

| Hook | Purpose |
|------|---------|
| `useRestaurants` | Restaurant list state: add from URL, remove, clear |
| `useDirections` | Fetch route from Directions API, return path + duration |
| `useGeolocation` | Browser GPS wrapper with error handling |

### Utils

| Utility | Purpose |
|---------|---------|
| `parseNaverUrl` | Extract Naver place ID from various URL formats |

---

## Backend Architecture (Vercel Serverless)

### API Routes

All routes live in the `/api/` directory at project root. Vercel automatically deploys these as serverless functions.

#### `GET /api/place?id={placeId}`

```
Client request
  → Serverless function
    → Fetch pcmap.place.naver.com/restaurant/{id}/home
    → Parse __NEXT_DATA__ JSON or API response
    → Transform to Restaurant type
  → Return JSON { name, category, menuItems, thumbnail, address, lat, lng }
```

#### `GET /api/directions?start={lng,lat}&goal={lng,lat}`

```
Client request
  → Serverless function
    → Fetch naveropenapi.apigw.ntruss.com/map-direction/v1/driving
      (with x-ncp-apigw-api-key-id and x-ncp-apigw-api-key headers)
    → Forward response
  → Return JSON { path, duration, distance }
```

#### `GET /api/geocode?query={address}`

```
Client request
  → Serverless function
    → Fetch naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode
      (with NCP auth headers)
    → Extract coordinates
  → Return JSON { lat, lng }
```

### Environment Variables

| Variable | Where Used | Purpose |
|----------|-----------|---------|
| `REACT_APP_NAVER_MAP_CLIENT_ID` | Frontend (index.html) | Naver Map JS SDK |
| `NAVER_MAP_CLIENT_ID` | Serverless functions | NCP API auth (key ID) |
| `NAVER_MAP_CLIENT_SECRET` | Serverless functions | NCP API auth (key secret) |

---

## Data Flow

### Adding a Restaurant

```
User pastes URL
  → parseNaverUrl() extracts place ID (regex)
  → fetch('/api/place?id=693144763')
  → Serverless proxy fetches from pcmap.place.naver.com
  → Response transformed to Restaurant type
  → Added to restaurants[] state
  → RestaurantCard renders
```

### Playing the Game

```
User clicks "사다리 타기 시작!"
  → Phase changes to 'game'
  → generateLadder(restaurantCount, rungCount) creates ladder structure
  → Random start column selected
  → tracePath(ladder, startCol) computes the ball's path
  → useAnimation hook animates the ball along PathPoint[]
  → Ball reaches bottom → winner determined
  → Phase changes to 'result'
```

### Showing Directions

```
Winner selected
  → Phase changes to 'result'
  → useDirections(startPoint, restaurantCoords) called
  → fetch('/api/directions?start=lng,lat&goal=lng,lat')
  → Route path + duration + distance returned
  → NaverMap renders with markers + polyline
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| No routing library | Only 3 phases, managed by useState — react-router is overkill |
| SVG for ladder game | React manages SVG declaratively, easier than Canvas for state-driven UI |
| Vercel serverless proxy | Hides API keys from client, handles CORS, single deploy with frontend |
| SCSS (not Tailwind/CSS-in-JS) | Clean separation, familiar syntax, zero runtime cost, CRA supports natively |
| `pcmap.place.naver.com` internal API | Only way to get menu/price data — no official Place Detail API exists |
| `requestAnimationFrame` for animation | No animation library needed, full control over timing and easing |
