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

*More entries will be added as development progresses.*
