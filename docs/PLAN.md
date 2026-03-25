# Implementation Plan

## Overview

Build "점심 뭐 먹지?" (What should we eat for lunch?) — a lunch picker app for Korean office workers. Users paste Naver Map restaurant URLs, play an animated 사다리타기 (ghost leg) game to pick one, then see walking directions on an embedded Naver Map.

---

## Roadmap

### Step 0: Project Documentation + Scaffolding
- [x] Create project documentation (`docs/`)
- [x] Install dependencies (`sass`, `canvas-confetti`)
- [x] Configure Vercel (`vercel.json`)
- [x] Set up environment variables (`.env.local`)
- [x] Add Naver Map JS SDK to `index.html`
- [x] Define TypeScript types (`Restaurant`, `MenuItem`, `Ladder`)
- [x] Add `naver.maps` type declarations

### Step 1: Serverless API Proxy
- [x] `api/place.ts` — Naver Place data proxy (name, menu, prices, coords)
- [x] `api/directions.ts` — Naver Directions 5 API proxy
- [x] `api/geocode.ts` — Naver Geocoding API proxy
- [x] Verify with `vercel dev`

### Step 2: URL Input + Restaurant Cards
- [x] URL parser utility (`parseNaverUrl.ts`)
- [x] `useRestaurants` hook (add/remove state management)
- [x] `UrlInput` component — paste URL + "추가" button
- [x] `RestaurantCard` component — thumbnail, name, category, menu, prices
- [x] `RestaurantList` component — card grid + "사다리 타기 시작!" button
- [x] App shell with phase state (`input` | `game` | `result`)

### Step 3: Ghost Leg Game — Logic + Static SVG
- [x] `ladderLogic.ts` — `generateLadder()`, `tracePath()`, `determineResult()`
- [x] `LadderGame` component — SVG rendering (vertical lines, rungs, restaurant names)

### Step 4: Ghost Leg Game — Animation
- [x] `useAnimation` hook — `requestAnimationFrame` with ease-out timing
- [x] Animated ball tracing down the ladder
- [x] Trail line, winner highlight, confetti celebration

### Step 5: Result Screen + Naver Map
- [x] `NaverMap` component — Naver Map wrapper (markers, polyline, bounds)
- [x] `ResultScreen` component — winner display + map + directions info
- [x] `useDirections` hook — fetch route, duration, distance

### Step 6: Starting Point Configuration
- [x] `useGeolocation` hook — browser GPS wrapper
- [x] `StartingPoint` component — office default / GPS / manual address

### Step 7: Polish + Deploy
- [x] Loading skeletons for restaurant cards
- [x] Korean error messages
- [x] Responsive design (mobile / KakaoTalk sharing)
- [x] OG meta tags + favicon
- [x] Vercel production deployment

---

## Current Status

**Active Step**: All steps complete — prototype ready for testing

**Last Updated**: 2026-03-26
