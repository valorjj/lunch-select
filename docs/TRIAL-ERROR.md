# Trial & Error Log

Document experiments, what worked, what didn't, and lessons learned during development.

---

## Format

Each entry follows this structure:

| Field | Description |
|-------|-------------|
| **Date** | When the experiment happened |
| **What We Tried** | What approach/solution was attempted |
| **Result** | Did it work? What happened? |
| **Lesson Learned** | What to do (or avoid) next time |

---

## Log

### 2026-03-26 — Naver API Research

**What We Tried**: Investigated official Naver APIs for fetching restaurant details (name, menu, prices) from a place ID.

**Result**: No official Place Detail API exists. The only options are:
1. `pcmap.place.naver.com` internal API (unofficial, rich data)
2. Naver Local Search API (`openapi.naver.com/v1/search/local`) — official but no menu/price data
3. Scraping the Naver Map page HTML

**Lesson Learned**: Decided to use the internal API (`pcmap.place.naver.com`) via a serverless proxy. This gives us the best data (menus, prices, photos, coordinates) but is risky since Naver can change it without notice. The serverless proxy (`api/place.ts`) isolates this risk to a single file. If it breaks, we can switch to scraping `__NEXT_DATA__` from the HTML page or fall back to the Local Search API (losing menu data).

---

### 2026-03-26 — Naver Share URL (naver.me) Not Recognized

**What We Tried**: Users paste URLs from Naver Map's "공유하기" (share) button, which produces shortened URLs like `https://naver.me/FY3WJyBA`. Our client-side parser only matched `/place/(\d+)` patterns.

**Result**: Error "URL에서 음식점 정보를 찾을 수 없습니다." — the shortened URL contains no place ID.

**Lesson Learned**: The Naver share button produces `naver.me` short URLs that redirect to the full URL containing the place ID. Fix: send the raw URL to the backend (`api/place.ts`), which follows redirects server-side to resolve the short URL, then extracts the place ID from the resolved URL. The frontend now supports both: direct place ID extraction (for full URLs) and server-side resolution (for `naver.me` short URLs). Always test with the actual URL users will copy — don't assume URL format.

---

### 2026-03-26 — Naver Place Page Structure Changed (Next.js → Apollo Client)

**What We Tried**: Fetching restaurant data from `pcmap.place.naver.com/restaurant/{id}/home` and parsing `<script id="__NEXT_DATA__">` JSON.

**Result**: 500 error — `__NEXT_DATA__` no longer exists. Naver migrated from Next.js to Apollo Client. Data is now in `window.__APOLLO_STATE__`, a normalized Apollo cache with keys like `PlaceDetailBase:{placeId}` and `Menu:{placeId}_N`.

**Lesson Learned**: Internal APIs can change without notice. Updated `api/place.ts` to parse `__APOLLO_STATE__` instead. Key differences:
- Place info: `PlaceDetailBase:{placeId}` (name, category, address, coordinate.x/y, virtualPhone)
- Menu items: `Menu:{placeId}_0` through `Menu:{placeId}_N` (name, price, description, images)
- No thumbnail in `PlaceDetailBase` — images are in `paiUpperImage`, menu item `images[]`, or `PlaceDetailImages`
- JSON extraction uses brace-depth counting instead of regex (Apollo state is large and complex)

---

### 2026-03-26 — naver.me Short URLs Expire / Don't Resolve Server-Side

**What We Tried**: Server-side `fetch` with `redirect: 'follow'` to resolve `naver.me` short URLs to full Naver Map URLs containing the place ID.

**Result**: Returns 404. Naver short URLs either expire quickly or block non-browser requests. Tried HEAD requests, various User-Agent/Referer headers — all return 404.

**Lesson Learned**: `naver.me` short URLs are unreliable for server-side resolution. Users should copy the **browser address bar URL** instead of the share button URL. The address bar URL (e.g., `map.naver.com/p/search/.../place/2038138593`) contains the place ID directly, requiring no server-side resolution. Updated UI text to guide users accordingly.

---

*More entries will be added as development progresses.*
