# V2 Implementation Plan: Spring Boot Backend

## Architecture Overview

```
Browser (React)  ←→  Spring Boot (Kotlin)  ←→  Naver APIs / PostgreSQL
                     localhost:8080
```

- Frontend: React 19 stays on Vercel, calls `REACT_APP_API_BASE_URL`
- Backend: Spring Boot + Kotlin + Gradle, runs locally (later deployed)
- Database: H2 (local dev) → PostgreSQL (production)
- Auth: JWT in HttpOnly cookie via Spring Security OAuth2

---

## Incremental Migration Phases

### Phase 1: Spring Boot Skeleton + Port Existing APIs
- Create `backend/` directory with Spring Boot project
- Port `api/place.ts`, `api/directions.ts`, `api/geocode.ts` to Kotlin
- Add `REACT_APP_API_BASE_URL` to frontend fetch calls
- **No new features, just backend swap**

### Phase 2: Database + Restaurant Caching
- PostgreSQL with Spring Data JPA
- Cache scraped restaurant data (24h TTL)
- Flyway migrations

### Phase 3: OAuth2 Login (Google + Naver)
- Spring Security OAuth2 client
- Google + Naver providers
- `User` entity, JWT issuance
- Frontend: `useAuth` hook, `AuthButton` component

### Phase 4: Bookmarks
- `Bookmark` entity, CRUD endpoints
- Frontend: bookmark toggle on cards, `BookmarkList` page

### Phase 5: In-Site Restaurant Search
- Naver Local Search API (`openapi.naver.com/v1/search/local`)
- `SearchPanel` component replaces/augments URL paste input

### Phase 6: Additional Mini Games (frontend-only)
- Game selector phase: `input` → `gameSelect` → `game` → `result`
- New games: Roulette (룰렛), Tournament (토너먼트), Card Flip (카드 뒤집기), Slot Machine (슬롯머신)
- All share same interface: `restaurants: Restaurant[]` + `onComplete: (winner) => void`

### Phase 7: Share
- `SharedLink` entity with short codes
- KakaoTalk share via Kakao JS SDK
- Web Share API + clipboard fallback
- `/share/{code}` URL detection in App.tsx

### Phase 8: Production Deployment
- Deploy Spring Boot to VPS/Railway/AWS
- Point `REACT_APP_API_BASE_URL` to production URL
- Remove Vercel serverless functions

---

## Database Entities

| Entity | Key Fields |
|--------|-----------|
| `User` | provider, provider_id, email, name, profile_image |
| `Restaurant` | naver_place_id, name, category, menu_items_json, lat, lng |
| `Bookmark` | user_id, restaurant_id, memo |
| `GameSession` | user_id, game_type, restaurant_ids, winner_id |
| `SharedLink` | share_code, game_session_id, restaurant_ids, winner_id |

## API Endpoints

| Method | Path | Auth | Feature |
|--------|------|------|---------|
| `GET` | `/api/place?id={id}` | Public | Restaurant data |
| `GET` | `/api/directions?start=&goal=` | Public | Route |
| `GET` | `/api/geocode?query=` | Public | Address → coords |
| `GET` | `/api/search?query=&lat=&lng=` | Public | Restaurant search |
| `GET/POST/DELETE` | `/api/bookmarks` | Required | Bookmark CRUD |
| `POST` | `/api/games/sessions` | Optional | Save game |
| `POST` | `/api/share` | Optional | Generate share link |
| `GET` | `/api/share/{code}` | Public | Resolve share link |
| `GET` | `/api/me` | Required | Current user |

## Mini Games

| Game | Description | Effort |
|------|-------------|--------|
| Roulette (룰렛) | Spinning wheel, pointer lands on segment | Medium |
| Tournament (토너먼트) | Elimination bracket, user picks each round | Medium |
| Card Flip (카드 뒤집기) | Face-down cards, pick one to reveal | Low |
| Slot Machine (슬롯머신) | Three reels spinning, stops on winner | Medium |

## Current Status

**Active Phase**: Phase 1 — Spring Boot skeleton
**Last Updated**: 2026-03-26
