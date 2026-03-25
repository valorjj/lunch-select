# Features

## F1. Naver Map URL Paste + Restaurant Info Extraction

**Description**: User pastes a Naver Map restaurant URL. The app extracts the place ID and fetches restaurant details (name, category, menu items with prices, thumbnail photo, address, coordinates).

**User Flow**:
1. User copies a URL from Naver Map (e.g., `https://map.naver.com/p/search/.../place/693144763?...`)
2. Pastes it into the input field
3. Clicks "추가" (Add)
4. Restaurant card appears with fetched info

**Acceptance Criteria**:
- Supports various Naver Map URL formats (search results, direct place links, mobile URLs)
- Extracts place ID via regex `/place\/(\d+)/`
- Shows loading spinner during fetch
- Displays error message for invalid URLs
- Prevents adding duplicate restaurants

---

## F2. Restaurant Card List

**Description**: Visual list of added restaurants displayed as cards.

**Card Contents**:
- Thumbnail image
- Restaurant name
- Category badge (한식, 일식, 중식, etc.)
- Top 3 menu items with prices (formatted in ₩)
- Remove button (삭제)

**Acceptance Criteria**:
- Cards display in a responsive grid
- Remove button removes the restaurant from the list
- Empty state: "네이버 지도에서 음식점 URL을 추가해보세요!"
- Minimum 2 restaurants required to start the game

---

## F3. Ghost Leg Game (사다리타기)

**Description**: Animated ladder game to randomly select one restaurant. This is the fun, viral centerpiece of the app.

**Game Mechanics**:
- Vertical lines = one per restaurant
- Horizontal rungs = randomly placed between adjacent lines
- A ball starts at a random column and traces down, turning at each rung
- The restaurant at the bottom of the ball's path is the winner

**Animation**:
- SVG-based rendering
- Ball animated with `requestAnimationFrame`
- Ease-out timing (slows near bottom for suspense)
- Colored trail line follows the ball's path
- Winner highlighted with pulse animation
- Confetti celebration on selection

**Acceptance Criteria**:
- Fair: each restaurant has equal probability of being selected
- Smooth animation at 60fps
- Works with 2-10 restaurants
- "시작!" button triggers the game
- Clear visual indication of the winner

---

## F4. Result Screen

**Description**: Displays the winning restaurant with celebration and navigation info.

**Contents**:
- "여기로 가자!" (Let's go here!) celebration header
- Winner restaurant name, image, category
- Embedded Naver Map with route
- Walking/driving time and distance
- "다시 하기" (Try again) — replay with same restaurants
- "새로 시작" (Start over) — clear everything

**Acceptance Criteria**:
- Confetti animation on reveal
- Map shows both starting point and restaurant markers
- Route polyline drawn on map
- Duration/distance displayed clearly

---

## F5. Embedded Naver Map with Directions

**Description**: Interactive Naver Map showing the route from starting point to the selected restaurant.

**Map Features**:
- Blue marker: starting point (office/current location)
- Red marker: restaurant location
- Polyline: walking/driving route
- Auto-fit bounds to show both markers
- Info window on restaurant marker (name + category)

**API Used**: Naver Dynamic Map JS SDK + Directions 5 API

**Acceptance Criteria**:
- Map loads without errors
- Route polyline renders correctly
- Map auto-zooms to fit both markers
- Walking time/distance shown

---

## F6. Starting Point Configuration

**Description**: Users can configure where directions start from.

**Options**:
1. **기본 위치 사용** (Use default) — pre-configured office address
2. **현재 위치 사용** (Use current location) — browser GPS
3. **주소 입력** (Enter address) — manual input, geocoded via API

**Acceptance Criteria**:
- Default office address works out of the box
- GPS permission request handled gracefully (show error if denied)
- Manual address geocoded to coordinates
- Directions update when starting point changes

---

## F7. Mobile Responsive + Social Sharing

**Description**: App works well on mobile devices and looks good when shared via KakaoTalk.

**Acceptance Criteria**:
- Responsive layout adapts to mobile screens
- Ghost leg game is playable on mobile (touch-friendly)
- OG meta tags for KakaoTalk/social sharing preview
- App title + description shown in link preview
