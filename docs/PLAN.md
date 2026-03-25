# Implementation Plan

## Overview

Build "점심 뭐 먹지?" (What should we eat for lunch?) — a lunch picker app for Korean office workers. Users paste Naver Map restaurant URLs, play an animated 사다리타기 (ghost leg) game to pick one, then see walking directions on an embedded Naver Map.

---

## Phase 1: Prototype (COMPLETE)

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

### Step 2: URL Input + Restaurant Cards
- [x] URL parser utility (`parseNaverUrl.ts`)
- [x] `useRestaurants` hook (add/remove state management)
- [x] `UrlInput`, `RestaurantCard`, `RestaurantList` components
- [x] App shell with phase state (`input` | `game` | `result`)

### Step 3-4: Ghost Leg Game (사다리타기)
- [x] `ladderLogic.ts` — generation, path tracing, result
- [x] SVG-based rendering + `useAnimation` hook
- [x] Animated ball, trail line, confetti celebration

### Step 5-6: Result Screen + Map + Starting Point
- [x] `NaverMap` component with markers + route polyline
- [x] `ResultScreen` with directions summary
- [x] `StartingPoint` — office default / GPS / manual address

### Step 7: Polish + Deploy
- [x] OG meta tags, Korean error messages, responsive design
- [x] Vercel deployment + NCP application registered

### Bugfix: naver.me short URLs
- [x] Server-side URL resolution for Naver share button short URLs

---

## Phase 2: Validate & Fix (NEXT)

The prototype is deployed. The next session should focus on **end-to-end testing** and fixing issues with the Naver data pipeline.

### Priority 1: Verify the data flow works
- [ ] Test with real Naver Map URLs on the deployed Vercel app
- [ ] Confirm `api/place.ts` successfully fetches `__NEXT_DATA__` from `pcmap.place.naver.com`
- [ ] Confirm restaurant name, menu, prices, thumbnail, coordinates all populate correctly
- [ ] If `__NEXT_DATA__` parsing fails, inspect the actual HTML response and adjust field paths
- [ ] Test `naver.me` short URL resolution end-to-end

### Priority 2: Verify map + directions
- [ ] Confirm Naver Map JS SDK loads with your NCP Client ID
- [ ] Confirm Directions 5 API returns route data via `api/directions.ts`
- [ ] Confirm map renders markers + route polyline on result screen

### Priority 3: UX issues
- [ ] Test the full flow: add 3+ restaurants → ladder game → result
- [ ] Check mobile responsiveness
- [ ] Fix any styling issues found during testing

---

## Phase 3: Enhancement (FUTURE)

Ideas for after the prototype is validated:

- [ ] Browser address bar URL support (the long `map.naver.com/p/search/...` URLs)
- [ ] Restaurant photo carousel on cards
- [ ] Save favorite restaurant sets (localStorage)
- [ ] Share game results via KakaoTalk
- [ ] Walking directions option (vs driving)
- [ ] Sound effects for the ladder game
- [ ] Custom participant names on the ladder (not just restaurant names)
- [ ] History of past lunch picks
- [ ] Dark mode

---

## Current Status

**Active Phase**: Phase 2 — Validate & Fix

**Last Updated**: 2026-03-26
