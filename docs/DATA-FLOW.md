# Data Flow & URL Guide

## How to Get the Right URL

### Browser Address Bar (Recommended)
1. Go to Naver Map → search for a restaurant
2. Click on the restaurant to open the detail panel
3. Copy the full URL from the **browser address bar**, e.g.:
   ```
   https://map.naver.com/p/search/역삼역%20맛집/place/693144763?...
   ```
4. Paste into the app

### ~~Share Button~~ (Not Recommended)
The share button produces `naver.me` short URLs (e.g., `https://naver.me/FY3WJyBA`). These **expire quickly** and **cannot be resolved server-side** (Naver returns 404 for non-browser requests). Use the address bar URL instead.

---

## Data Flow: URL → Restaurant Card

```
[User pastes URL]
       │
       ▼
[Frontend: isNaverMapUrl()?] ──No──▶ Error: "네이버 지도 URL을 입력해주세요"
       │ Yes
       ▼
[Frontend: extractPlaceId()]
       │
       ├── Found ID (e.g., 693144763)
       │   └──▶ GET /api/place?id=693144763
       │
       └── No ID found (naver.me short URL)
           └──▶ GET /api/place?url=https://naver.me/FY3WJyBA
                     │
                     ▼
              [api/place.ts: resolveUrlToPlaceId()]
                     │
                     ├── Follow redirects on naver.me
                     │   └── Resolved: https://map.naver.com/.../place/693144763
                     │       └── Extract ID: 693144763
                     │
                     ▼
              [api/place.ts: fetchPlaceData(693144763)]
                     │
                     ▼
              [Fetch: pcmap.place.naver.com/restaurant/693144763/home]
                     │
                     ▼
              [Parse HTML → extract window.__APOLLO_STATE__]
                     │
                     ▼
              [JSON: PlaceDetailBase:{placeId} + Menu:{placeId}_N]
                     │
                     ▼
              [Extract fields: name, category, menus, thumbnail, coords]
                     │
                     ▼
              [Return JSON to frontend]
                     │
                     ▼
              [Frontend: create Restaurant object, render card]
```

---

## Data Flow: Directions

```
[Winner selected from ladder game]
       │
       ▼
[useDirections hook triggers]
       │
       ▼
[GET /api/directions?start=127.036,37.500&goal=127.025,37.505]
       │
       ▼
[api/directions.ts]
       │
       ▼
[Fetch: naveropenapi.apigw.ntruss.com/map-direction/v1/driving]
  Headers: x-ncp-apigw-api-key-id + x-ncp-apigw-api-key
       │
       ▼
[Return: { path: [[lng,lat],...], summary: { distance, duration } }]
       │
       ▼
[NaverMap component renders polyline + markers]
```

---

## Key URLs for Testing

### Naver Place Page (what api/place.ts fetches)
```
https://pcmap.place.naver.com/restaurant/{placeId}/home
```
Example: `https://pcmap.place.naver.com/restaurant/693144763/home`

You can open this in a browser to see what the serverless function sees. Right-click → View Source → search for `__NEXT_DATA__` to see the JSON payload.

### Naver Directions API
```
https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start={lng},{lat}&goal={lng},{lat}
```
Requires headers: `x-ncp-apigw-api-key-id` and `x-ncp-apigw-api-key`

### Naver Geocoding API
```
https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query={address}
```
Requires same headers.

### Your Deployed API Endpoints
```
https://lunch-select.vercel.app/api/place?id=693144763
https://lunch-select.vercel.app/api/place?url=https://naver.me/FY3WJyBA
https://lunch-select.vercel.app/api/directions?start=127.036,37.500&goal=127.025,37.505
https://lunch-select.vercel.app/api/geocode?query=서울+강남구+역삼동
```

---

## Debugging Tips

### If restaurant data doesn't load:
1. Open browser DevTools → Network tab
2. Look for the `/api/place` request
3. Check the response JSON for error messages
4. Try opening `pcmap.place.naver.com/restaurant/{placeId}/home` directly in browser
5. If `__APOLLO_STATE__` structure changed, inspect the JSON and update field paths in `api/place.ts`
6. If using a `naver.me` short URL, it may have expired — copy the address bar URL instead

### If map doesn't load:
1. Check browser console for Naver Map SDK errors
2. Verify `REACT_APP_NAVER_MAP_CLIENT_ID` is set in Vercel env vars
3. Verify the Web 서비스 URL in NCP includes your Vercel domain

### If directions don't load:
1. Check `/api/directions` response in Network tab
2. Verify `NAVER_MAP_CLIENT_ID` and `NAVER_MAP_CLIENT_SECRET` in Vercel env vars
3. Verify Directions 5 API is checked in your NCP application

### Vercel Environment Variables Checklist
| Variable | Where to get it | Used by |
|----------|----------------|---------|
| `REACT_APP_NAVER_MAP_CLIENT_ID` | NCP Console → Maps → Application → 인증 정보 | Frontend (map SDK) |
| `NAVER_MAP_CLIENT_ID` | Same as above | Serverless functions (API auth) |
| `NAVER_MAP_CLIENT_SECRET` | Same as above | Serverless functions (API auth) |

### NCP Application Settings Checklist
| Setting | Required Value |
|---------|---------------|
| Application 이름 | `lunch-select` |
| API 선택 | Dynamic Map, Directions 5, Geocoding (all checked) |
| Web 서비스 URL | `http://localhost:3000`, `https://lunch-select.vercel.app` (or your actual domain) |
