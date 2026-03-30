import React, { useEffect, useRef, useCallback } from 'react';
import mermaid from 'mermaid';
import './ArchitectureModal.scss';

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#FFF0E8',
    primaryTextColor: '#1A1A2E',
    primaryBorderColor: '#FF6B35',
    lineColor: '#FF8F5E',
    secondaryColor: '#F7F7F9',
    tertiaryColor: '#FFF',
    fontFamily: 'inherit',
    fontSize: '13px',
  },
});

interface Props {
  onClose: () => void;
}

function MermaidChart({ chart, id }: { chart: string; id: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    mermaid.render(id, chart).then(({ svg }) => {
      if (ref.current) ref.current.innerHTML = svg;
    });
  }, [chart, id]);

  return <div className="arch__mermaid" ref={ref} />;
}

// ── Mermaid Diagrams ──

const INFRA_DIAGRAM = `flowchart TB
    subgraph Client ["Client (Browser)"]
      R["React 19 SPA\\nTypeScript + SCSS"]
      LS[("localStorage\\nrestaurants, theme,\\nsearch history, auth token")]
    end

    subgraph Vercel ["Vercel Edge"]
      SF["Serverless Functions\\n/api/place\\n/api/search\\n/api/directions\\n/api/geocode"]
      Cache[("In-Memory Cache\\n24h TTL")]
    end

    subgraph Backend ["Backend Server (Docker)"]
      SB["Spring Boot 3.5\\nKotlin"]
      JWT["JWT Auth Filter\\n24h token expiry"]
      DB[("MariaDB\\nUsers, Bookmarks,\\nVisitors, GameWords")]
    end

    subgraph External ["External APIs"]
      NG["Naver Place GraphQL\\npcmap-api.place.naver.com"]
      KA["Kakao Local API\\ndapi.kakao.com"]
      NO["Naver Official API\\nopenapi.naver.com"]
      OAuth["OAuth2 Providers\\nGoogle, Naver"]
    end

    R <-->|"apiFetch + Bearer JWT"| SB
    R <-->|"serverless proxy"| SF
    R --- LS
    SF --- Cache
    SF --> NG
    SF --> KA
    SF --> NO
    SB --> JWT
    SB --> DB
    SB --> NG
    SB --> OAuth

    style R fill:#FFF0E8,stroke:#FF6B35
    style SB fill:#E3F2FD,stroke:#1976D2
    style DB fill:#FFF8E1,stroke:#F9A825
    style Cache fill:#FFF8E1,stroke:#F9A825
    style LS fill:#FFF8E1,stroke:#F9A825
`;

const APP_FLOW = `flowchart LR
    A["Input Phase\\n검색 + 추가"] -->|"2+ restaurants"| B["Game Phase\\n게임 선택"]
    B -->|"winner selected"| C["Result Phase\\n결과 + 메뉴"]
    C -->|"다시 하기"| B
    C -->|"새로 시작"| A

    subgraph Games ["Mini Games"]
      B1["Gacha Machine\\n(Random Draw)"]
      B2["Ladder Game\\n(사다리타기)"]
    end
    B --> B1
    B --> B2

    subgraph Result ["Result Features"]
      C1["Menu Display\\n(Naver GraphQL)"]
      C2["Share Link\\n(URL encoding)"]
    end
    C --> C1
    C --> C2

    style A fill:#FFF0E8,stroke:#FF6B35
    style B fill:#E3F2FD,stroke:#1976D2
    style C fill:#E8F5E9,stroke:#38A169
`;

const SEARCH_FLOW = `flowchart TD
    A["User enters query"] --> B["Search History\\nsuggestions from localStorage"]
    A --> S["Submit search"]
    B -->|"click history item"| S
    S --> P1{"Provider 1:\\nNaver Place GraphQL"}
    P1 -->|"results + imageUrl"| Z["Display results\\nwith thumbnails"]
    P1 -->|"empty / error"| P2{"Provider 2:\\nKakao Local API"}
    P2 -->|"results found"| Z
    P2 -->|"empty / error"| P3{"Provider 3:\\nNaver Official API"}
    P3 -->|"max 5 results"| Z
    P3 -->|"all failed"| E["Error message"]
    Z --> H["Save to search history\\n(last 10 queries)"]

    style A fill:#FFF0E8,stroke:#FF6B35
    style Z fill:#E8F5E9,stroke:#38A169
    style E fill:#FEE2E2,stroke:#E53E3E
    style B fill:#FFF8E1,stroke:#F9A825
    style H fill:#FFF8E1,stroke:#F9A825
`;

const MENU_FLOW = `flowchart TD
    A["Winner restaurant selected"] --> B{"Source?"}
    B -->|"Naver\\n(numeric ID)"| D["GraphQL placeDetail\\n3 parallel queries"]
    B -->|"Kakao\\n(no Naver ID)"| C["Cross-reference:\\nGraphQL restaurantList\\nsearch by name + address"]
    C -->|"found match"| D
    C -->|"no match"| ERR["Fallback: no menu"]

    D --> Q1["Query 1: base info\\nname, category, address,\\ncoordinate, phone"]
    D --> Q2["Query 2: base menus\\n~7 representative items"]
    D --> Q3["Query 3: baemin menus\\nfull delivery menu"]

    Q1 --> M{"Baemin menus\\navailable?"}
    Q2 --> M
    Q3 --> M
    M -->|"Yes"| F["Full menu list\\n(80+ items with prices)"]
    M -->|"No"| G["Base menus\\n(~7 representative items)"]
    F --> H["Display in Result Screen"]
    G --> H

    style A fill:#FFF0E8,stroke:#FF6B35
    style H fill:#E8F5E9,stroke:#38A169
    style F fill:#E3F2FD,stroke:#1976D2
    style G fill:#FFF8E1,stroke:#F9A825
    style ERR fill:#FEE2E2,stroke:#E53E3E
`;

const AUTH_FLOW = `sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant O as OAuth Provider

    U->>F: Click login
    F->>B: GET /api/auth/login/google
    B->>O: OAuth2 redirect
    O->>U: Login consent screen
    U->>O: Approve
    O->>B: Authorization code
    B->>O: Exchange for user info
    B->>B: Create/update User entity
    B->>B: Generate JWT (24h)
    B->>F: Redirect with ?token=JWT
    F->>F: Store JWT in localStorage
    F->>B: GET /api/auth/me (Bearer JWT)
    B->>F: User info + isAdmin
`;

const RECOMMEND_FLOW = `flowchart TD
    A["User selects location mode"] --> B{"Mode?"}
    B -->|"GPS"| C["Browser Geolocation\\n5-min cache"]
    B -->|"시/구 선택"| D["Region tabs:\\n서울 / 경기남부 / 경기북부\\n→ pick district/city"]
    B -->|"지하철역"| E["Subway Modal\\n412 stations, 12 lines\\nwith search"]

    C --> F["Set coordinates"]
    D --> F
    E --> F

    F --> G["Budget slider\\n5,000~50,000원"]
    G --> H["Click 맛집 검색"]
    H --> I["Kakao Category API\\nFD6=음식점, 1km radius\\nsort by distance"]
    I --> J["Filter: remove\\n노래방, 술집, PC방"]
    J --> K["Enrich thumbnails"]

    K --> K1["1st: Kakao og:image\\n(exact place ID)"]
    K --> K2["2nd: Naver GraphQL\\n(name + 동 area)"]

    K1 --> L["Display cards\\nwith distance badge"]
    K2 --> L
    L --> M["+ 게임에 추가\\n→ restaurant list"]

    style A fill:#FFF0E8,stroke:#FF6B35
    style L fill:#E8F5E9,stroke:#38A169
    style M fill:#E3F2FD,stroke:#1976D2
    style J fill:#FFF8E1,stroke:#F9A825
`;

const LOCATION_SYSTEM = `flowchart LR
    subgraph Search ["Search Tab"]
      S1["⚡ 인기 지역\\n강남, 역삼, 판교..."]
      S2["🔲 시/구 선택\\n서울 25구 + 경기 27시"]
      S3["🚇 지하철역\\n412 stations"]
    end

    subgraph Recommend ["Recommend Tab"]
      R1["📍 현재 위치\\nBrowser GPS"]
      R2["🔲 시/구 선택\\nSame region data"]
      R3["🚇 지하철역\\nSame subway modal"]
    end

    S2 --- R2
    S3 --- R3
    DB["Shared Data\\nregions.ts\\nsubwayLines.ts"] --- S2
    DB --- S3
    DB --- R2
    DB --- R3

    style DB fill:#FFF8E1,stroke:#F9A825
`;

const DARK_MODE_FLOW = `flowchart LR
    A["App mounts"] --> B{"localStorage\\ntheme saved?"}
    B -->|"Yes"| C["Use saved theme"]
    B -->|"No"| D{"prefers-color-scheme\\ndark?"}
    D -->|"Yes"| E["Dark mode"]
    D -->|"No"| F["Light mode"]
    C --> G["Set data-theme attribute\\non document root"]
    E --> G
    F --> G
    G --> H["CSS variables swap\\nvia :root / data-theme=dark"]

    style A fill:#FFF0E8,stroke:#FF6B35
    style G fill:#E3F2FD,stroke:#1976D2
    style H fill:#E8F5E9,stroke:#38A169
`;

export function ArchitectureModal({ onClose }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="arch">
      <div className="arch__header">
        <button className="arch__back" onClick={onClose}>&larr; Back</button>
        <h1 className="arch__title">Architecture Overview</h1>
        <a
          className="arch__github"
          href="https://github.com/valorjj/lunch-select"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </div>

      <div className="arch__content">
        {/* Project Overview */}
        <section className="arch__section">
          <h2>Project Overview</h2>
          <p className="arch__desc">
            <strong>점심 뭐 먹지?</strong> is a Korean lunch restaurant selection app. Users search and add
            restaurants, play a mini game (gacha or ladder) to pick a winner, and view the result with
            full menu data and prices. The app is designed for office teams who struggle with the daily
            "where should we eat?" question.
          </p>
          <div className="arch__highlights">
            <div className="arch__highlight">
              <span className="arch__highlight-num">3</span>
              <span className="arch__highlight-label">External APIs</span>
            </div>
            <div className="arch__highlight">
              <span className="arch__highlight-num">10</span>
              <span className="arch__highlight-label">REST Controllers</span>
            </div>
            <div className="arch__highlight">
              <span className="arch__highlight-num">6</span>
              <span className="arch__highlight-label">Serverless Functions</span>
            </div>
            <div className="arch__highlight">
              <span className="arch__highlight-num">412</span>
              <span className="arch__highlight-label">Subway Stations</span>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="arch__section">
          <h2>Tech Stack</h2>
          <div className="arch__columns">
            <div className="arch__col">
              <h3>Frontend</h3>
              <table className="arch__table">
                <tbody>
                  <tr><td>Framework</td><td>React 19</td></tr>
                  <tr><td>Language</td><td>TypeScript (strict mode)</td></tr>
                  <tr><td>Styling</td><td>SCSS + CSS Variables (dark mode)</td></tr>
                  <tr><td>State</td><td>Custom Hooks + localStorage</td></tr>
                  <tr><td>Charts</td><td>Mermaid.js (this page)</td></tr>
                  <tr><td>Hosting</td><td>Vercel (auto-deploy from GitHub)</td></tr>
                  <tr><td>Serverless</td><td>Vercel Functions (/api/*)</td></tr>
                  <tr><td>Games</td><td>SVG + requestAnimationFrame</td></tr>
                </tbody>
              </table>
            </div>
            <div className="arch__col">
              <h3>Backend</h3>
              <table className="arch__table">
                <tbody>
                  <tr><td>Framework</td><td>Spring Boot 3.5.3</td></tr>
                  <tr><td>Language</td><td>Kotlin</td></tr>
                  <tr><td>Database</td><td>MariaDB + JPA/Hibernate</td></tr>
                  <tr><td>Auth</td><td>OAuth2 (Google, Naver) + JWT</td></tr>
                  <tr><td>HTTP Client</td><td>WebClient (reactive)</td></tr>
                  <tr><td>Caching</td><td>DB-level, 24h TTL</td></tr>
                  <tr><td>Deploy</td><td>Docker Compose</td></tr>
                  <tr><td>Build</td><td>Gradle (Kotlin DSL)</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Infrastructure */}
        <section className="arch__section">
          <h2>Infrastructure Diagram</h2>
          <p className="arch__desc">
            The frontend is a React SPA hosted on Vercel with serverless functions acting as API proxies
            to external services. The Spring Boot backend handles auth, bookmarks, visitor tracking, and
            game data. All external API calls that require secret keys go through serverless functions or
            the backend — never from the browser directly.
          </p>
          <MermaidChart chart={INFRA_DIAGRAM} id="infra-diagram" />
        </section>

        {/* App Phase Flow */}
        <section className="arch__section">
          <h2>App Phase State Machine</h2>
          <p className="arch__desc">
            The app uses a <strong>three-phase state machine</strong> instead of a router. Each phase manages
            its own UI: search &amp; add restaurants, play a mini game to select a winner, then view the
            result with full menu data. The phase state is tracked per tab (restaurant vs cafe), so users
            can switch tabs without losing progress.
          </p>
          <MermaidChart chart={APP_FLOW} id="app-flow" />
        </section>

        {/* Frontend Features */}
        <section className="arch__section">
          <h2>Frontend Features</h2>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Feature</th><th>Implementation</th><th>Storage</th></tr>
            </thead>
            <tbody>
              <tr><td>Restaurant search</td><td>3-tier API fallback with thumbnails, 3-mode area selector</td><td>-</td></tr>
              <tr><td>Area selection</td><td>인기 지역 presets / 시·구 (서울+경기) / 지하철역 (412 stations, 12 lines)</td><td>-</td></tr>
              <tr><td>Recommendation</td><td>GPS or area-based nearby restaurants via Kakao category search</td><td>-</td></tr>
              <tr><td>Budget filter</td><td>5,000~50,000원 slider for recommendations</td><td>-</td></tr>
              <tr><td>Thumbnail enrichment</td><td>Kakao og:image (primary) + Naver GraphQL imageUrl (fallback)</td><td>-</td></tr>
              <tr><td>Search history</td><td>Last 10 queries, click to re-search</td><td>localStorage</td></tr>
              <tr><td>Restaurant list</td><td>Add/remove with background menu fetch</td><td>localStorage</td></tr>
              <tr><td>Bookmarks</td><td>Star toggle, localStorage for all users</td><td>localStorage</td></tr>
              <tr><td>Gacha game</td><td>CSS animation capsule machine</td><td>-</td></tr>
              <tr><td>Ladder game</td><td>SVG + requestAnimationFrame path tracing</td><td>-</td></tr>
              <tr><td>Word game (꼬들)</td><td>Wordle-like with Korean jamo decomposition</td><td>-</td></tr>
              <tr><td>Menu display</td><td>Naver GraphQL (baemin 80+ items / base ~7 items)</td><td>-</td></tr>
              <tr><td>Result sharing</td><td>Base64-encoded URL with restaurant data</td><td>URL param</td></tr>
              <tr><td>Dark mode</td><td>CSS variable swap + system preference detection</td><td>localStorage</td></tr>
              <tr><td>Offline mode</td><td>Offline banner, search disabled, bookmarks auto-expand</td><td>-</td></tr>
              <tr><td>Visitor counter</td><td>TODAY + TOTAL count from backend</td><td>Backend DB</td></tr>
              <tr><td>Admin panel</td><td>Word management, search stats, user management</td><td>Backend DB</td></tr>
            </tbody>
          </table>
        </section>

        {/* Search Strategy */}
        <section className="arch__section">
          <h2>Search API Strategy</h2>
          <p className="arch__desc">
            Restaurant search uses a <strong>three-tier fallback</strong> strategy. The primary provider is
            Naver Place GraphQL which returns rich data including restaurant thumbnails. If it fails or returns
            empty, the system falls back to Kakao Local API, then Naver Official Search API. Search queries
            are saved to localStorage for the autocomplete history feature.
          </p>
          <MermaidChart chart={SEARCH_FLOW} id="search-flow" />
          <h3>Search Provider Comparison</h3>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Provider</th><th>Endpoint</th><th>Max Results</th><th>Thumbnails</th><th>Auth</th></tr>
            </thead>
            <tbody>
              <tr><td>Naver GraphQL</td><td><code>pcmap-api.place.naver.com/graphql</code></td><td>Paginated</td><td>Yes (imageUrl)</td><td>None (headers only)</td></tr>
              <tr><td>Kakao Local</td><td><code>dapi.kakao.com/v2/local/search/keyword</code></td><td>15/page, 45 pages</td><td>No</td><td>REST API Key</td></tr>
              <tr><td>Naver Official</td><td><code>openapi.naver.com/v1/search/local</code></td><td>5 total</td><td>No</td><td>Client ID + Secret</td></tr>
            </tbody>
          </table>
        </section>

        {/* Menu Data Flow */}
        <section className="arch__section">
          <h2>Menu Data Flow (Hybrid Approach)</h2>
          <p className="arch__desc">
            Neither Kakao nor Naver official APIs provide menu data. We use the <strong>Naver Place GraphQL
            API</strong> (<code>pcmap-api.place.naver.com/graphql</code>) which was discovered as an alternative
            after the HTML scraping approach got permanently 429-blocked. For Kakao-sourced restaurants, a
            cross-reference search finds the matching Naver Place ID by name + address before fetching menus.
          </p>
          <MermaidChart chart={MENU_FLOW} id="menu-flow" />
          <h3>Why 3 Parallel Queries?</h3>
          <p className="arch__desc">
            Naver's GraphQL WAF blocks certain field combinations in a single query (e.g., <code>category</code> +
            <code>menus</code> returns 400). The workaround is to split into separate queries and fire them
            in parallel. This has no performance impact since all three resolve concurrently.
          </p>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Query</th><th>Operation</th><th>Fields</th><th>Note</th></tr>
            </thead>
            <tbody>
              <tr><td>Base info</td><td><code>getPlaceDetail</code></td><td>name, category, address, roadAddress, phone, virtualPhone, coordinate</td><td>Cannot combine with menus</td></tr>
              <tr><td>Base menus</td><td><code>getPlaceDetail</code></td><td>menus &#123; name, price &#125;</td><td>~7 representative items</td></tr>
              <tr><td>Baemin menus</td><td><code>getPlaceDetail</code></td><td>baemin.menus &#123; name, price &#125;</td><td>Full list (80+), only for Baemin-listed restaurants</td></tr>
              <tr><td>Search</td><td><code>getRestaurants</code></td><td>id, name, category, address, roadAddress, x, y, phone, imageUrl</td><td>Used for search + cross-reference</td></tr>
            </tbody>
          </table>
          <h3>Price Parsing</h3>
          <p className="arch__desc">
            The API returns prices as strings like <code>"13,000~14,900"</code> (단품~세트 range).
            The parser splits on <code>~</code>, <code>-</code>, <code>/</code> and takes the first
            price only. Displayed as Korean won format: <code>13,000원</code>.
          </p>
        </section>

        {/* API Endpoints */}
        <section className="arch__section">
          <h2>API Endpoints</h2>
          <h3>Serverless Functions (Vercel)</h3>
          <p className="arch__desc">
            These run on Vercel's edge network, proxying requests to external APIs. They handle CORS,
            inject API keys, and cache responses. The client never calls external APIs directly.
          </p>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Endpoint</th><th>Method</th><th>Description</th><th>External API</th><th>Cache</th></tr>
            </thead>
            <tbody>
              <tr><td><code>/api/search</code></td><td>GET</td><td>Restaurant search (3-tier fallback)</td><td>Naver GraphQL &rarr; Kakao &rarr; Naver Official</td><td>-</td></tr>
              <tr><td><code>/api/place?id=</code></td><td>GET</td><td>Place detail + menu by Naver Place ID</td><td>Naver GraphQL (3 parallel queries)</td><td>24h in-memory</td></tr>
              <tr><td><code>/api/place?name=&amp;address=</code></td><td>GET</td><td>Cross-ref Kakao restaurant to Naver, then fetch menu</td><td>Naver GraphQL (restaurantList + placeDetail)</td><td>24h cross-ref + place</td></tr>
              <tr><td><code>/api/place?url=</code></td><td>GET</td><td>Resolve Naver Map URL to place data</td><td>Naver GraphQL</td><td>24h in-memory</td></tr>
              <tr><td><code>/api/recommend</code></td><td>GET</td><td>Nearby restaurants by GPS/area coordinates</td><td>Kakao Category (FD6) + Kakao og:image + Naver GraphQL</td><td>-</td></tr>
              <tr><td><code>/api/directions</code></td><td>GET</td><td>Driving route between two coordinates</td><td>Naver Directions API (NCP)</td><td>-</td></tr>
              <tr><td><code>/api/geocode</code></td><td>GET</td><td>Address to lat/lng coordinates</td><td>Naver Geocoding API (NCP)</td><td>-</td></tr>
            </tbody>
          </table>

          <h3>Backend REST API (Spring Boot)</h3>
          <p className="arch__desc">
            The backend handles stateful operations: authentication, user data, bookmarks, analytics, and
            game content. All endpoints are under <code>/api/*</code>. Protected endpoints require a valid
            JWT in the <code>Authorization: Bearer</code> header.
          </p>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Endpoint</th><th>Method</th><th>Auth</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>/api/auth/login/google</code></td><td>GET</td><td>-</td><td>Initiate Google OAuth2 flow</td></tr>
              <tr><td><code>/api/auth/login/naver</code></td><td>GET</td><td>-</td><td>Initiate Naver OAuth2 flow</td></tr>
              <tr><td><code>/api/auth/me</code></td><td>GET</td><td>JWT</td><td>Current user profile + isAdmin flag</td></tr>
              <tr><td><code>/api/bookmarks</code></td><td>GET</td><td>JWT</td><td>List user's bookmarked restaurants</td></tr>
              <tr><td><code>/api/bookmarks</code></td><td>POST</td><td>JWT</td><td>Add bookmark</td></tr>
              <tr><td><code>/api/bookmarks/&#123;id&#125;</code></td><td>DELETE</td><td>JWT</td><td>Remove bookmark</td></tr>
              <tr><td><code>/api/visitors/today</code></td><td>GET</td><td>-</td><td>Today's count + cumulative total</td></tr>
              <tr><td><code>/api/visitors/track</code></td><td>POST</td><td>-</td><td>Increment today's visitor count</td></tr>
              <tr><td><code>/api/share</code></td><td>POST</td><td>-</td><td>Create shareable result link</td></tr>
              <tr><td><code>/api/share/&#123;id&#125;</code></td><td>GET</td><td>-</td><td>Retrieve shared result</td></tr>
              <tr><td><code>/api/search-logs</code></td><td>POST</td><td>-</td><td>Log search query for analytics</td></tr>
              <tr><td><code>/api/search-logs/stats</code></td><td>GET</td><td>Admin</td><td>Search analytics (1/7/30 days)</td></tr>
              <tr><td><code>/api/game-words</code></td><td>GET</td><td>-</td><td>Public word list for Word Game</td></tr>
              <tr><td><code>/api/admin/words</code></td><td>Various</td><td>Admin</td><td>CRUD game words</td></tr>
              <tr><td><code>/api/admin/users</code></td><td>Various</td><td>Super Admin</td><td>User management</td></tr>
            </tbody>
          </table>
        </section>

        {/* Location Selection System */}
        <section className="arch__section">
          <h2>Location Selection System</h2>
          <p className="arch__desc">
            Both search and recommendation tabs share the same 3-mode location selector pattern.
            Region data (서울 25구, 경기남부 17시, 경기북부 10시) and subway station data (412 stations
            across 12 lines) are stored in shared TypeScript files and reused across components.
          </p>
          <MermaidChart chart={LOCATION_SYSTEM} id="location-system" />
          <h3>Subway Station Data</h3>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Line</th><th>Stations</th><th>Color</th></tr>
            </thead>
            <tbody>
              <tr><td>1호선</td><td>36 stations (도봉산~인천)</td><td><code>#0052A4</code></td></tr>
              <tr><td>2호선</td><td>52 stations (시청~성수 순환)</td><td><code>#009B3E</code></td></tr>
              <tr><td>3호선</td><td>33 stations (대화~오금)</td><td><code>#EF7C1C</code></td></tr>
              <tr><td>4호선</td><td>26 stations (당고개~오이도)</td><td><code>#00A5DE</code></td></tr>
              <tr><td>5호선</td><td>51 stations (방화~마천)</td><td><code>#996CAC</code></td></tr>
              <tr><td>6호선</td><td>38 stations (응암~신내)</td><td><code>#CD7C2F</code></td></tr>
              <tr><td>7호선</td><td>39 stations (장암~부평)</td><td><code>#747F00</code></td></tr>
              <tr><td>8호선</td><td>11 stations (암사~모란)</td><td><code>#E6186C</code></td></tr>
              <tr><td>9호선</td><td>38 stations (개화~중앙보훈병원)</td><td><code>#BDB092</code></td></tr>
              <tr><td>분당선</td><td>33 stations (왕십리~수원)</td><td><code>#FABE00</code></td></tr>
              <tr><td>신분당선</td><td>16 stations (신사~광교)</td><td><code>#D31145</code></td></tr>
              <tr><td>경의중앙선</td><td>26 stations (서울역~문산, 옥수~덕소)</td><td><code>#77C4A3</code></td></tr>
            </tbody>
          </table>
          <h3>Region Data</h3>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Region</th><th>Count</th><th>Examples</th></tr>
            </thead>
            <tbody>
              <tr><td>서울</td><td>25 districts</td><td>강남구, 서초구, 마포구, 종로구, 송파구...</td></tr>
              <tr><td>경기 남부</td><td>17 cities</td><td>성남시, 판교, 분당, 수원시, 용인시, 안양시...</td></tr>
              <tr><td>경기 북부</td><td>10 cities</td><td>고양시, 일산, 파주시, 의정부시, 남양주시...</td></tr>
            </tbody>
          </table>
        </section>

        {/* Recommendation System */}
        <section className="arch__section">
          <h2>Recommendation System</h2>
          <p className="arch__desc">
            The recommendation tab (<strong>추천</strong>) discovers nearby restaurants based on user's
            location. It uses Kakao Local API's category search (FD6 = 음식점) with coordinate-based
            radius query, sorted by distance. Results are enriched with thumbnails and filtered to
            exclude non-restaurant places (노래방, 술집, PC방). Users can add recommendations directly
            to their game list.
          </p>
          <MermaidChart chart={RECOMMEND_FLOW} id="recommend-flow" />
          <h3>Non-Restaurant Filter</h3>
          <p className="arch__desc">
            Kakao's FD6 category includes some non-restaurant places. The API response is filtered by:
          </p>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Filter Type</th><th>Excluded</th></tr>
            </thead>
            <tbody>
              <tr><td>Name keywords</td><td>노래방, 노래연습, 코인노래, 룸카페, PC방, 피씨방</td></tr>
              <tr><td>Category subcategories</td><td>술집, 호프, 요리주점, 일본식주점, 바(BAR)</td></tr>
            </tbody>
          </table>
          <h3>Thumbnail Enrichment (2-layer)</h3>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Priority</th><th>Source</th><th>Method</th><th>Accuracy</th><th>Speed</th></tr>
            </thead>
            <tbody>
              <tr><td>1st</td><td>Kakao Place</td><td>Fetch <code>place.map.kakao.com/&#123;id&#125;</code>, parse <code>og:image</code> meta tag</td><td>100% (exact ID)</td><td>~88ms</td></tr>
              <tr><td>2nd</td><td>Naver GraphQL</td><td>Search <code>name + 동name</code> for imageUrl</td><td>Good (dong-level match)</td><td>~189ms</td></tr>
            </tbody>
          </table>
        </section>

        {/* Auth Flow */}
        <section className="arch__section">
          <h2>Authentication Flow</h2>
          <p className="arch__desc">
            OAuth2 login via Google or Naver. The backend exchanges the authorization code for user info,
            creates or updates the User entity, generates a JWT (24-hour expiry), and redirects back to
            the frontend with the token as a URL parameter. The frontend stores it in localStorage and
            attaches it to all subsequent API calls via <code>apiFetch()</code>.
          </p>
          <MermaidChart chart={AUTH_FLOW} id="auth-flow" />
        </section>

        {/* Dark Mode */}
        <section className="arch__section">
          <h2>Dark Mode Implementation</h2>
          <p className="arch__desc">
            Dark mode uses CSS custom properties (variables) defined in <code>:root</code> for light theme
            and <code>[data-theme='dark']</code> for dark theme. The <code>useTheme</code> hook detects
            system preference via <code>prefers-color-scheme</code> media query and persists the user's
            choice to localStorage. All components use CSS variables, so the theme switch is instant with
            zero re-renders.
          </p>
          <MermaidChart chart={DARK_MODE_FLOW} id="dark-mode-flow" />
          <h3>Color Palette</h3>
          <div className="arch__columns">
            <div className="arch__col">
              <h4>Light Theme</h4>
              <table className="arch__table">
                <tbody>
                  <tr><td>Background</td><td><code>#FAFAFA</code></td></tr>
                  <tr><td>Surface</td><td><code>#FFFFFF</code></td></tr>
                  <tr><td>Text</td><td><code>#1A1A2E</code></td></tr>
                  <tr><td>Primary</td><td><code>#FF6B35</code></td></tr>
                  <tr><td>Border</td><td><code>#EDEDF0</code></td></tr>
                </tbody>
              </table>
            </div>
            <div className="arch__col">
              <h4>Dark Theme</h4>
              <table className="arch__table">
                <tbody>
                  <tr><td>Background</td><td><code>#121218</code></td></tr>
                  <tr><td>Surface</td><td><code>#1C1C26</code></td></tr>
                  <tr><td>Text</td><td><code>#E8E8ED</code></td></tr>
                  <tr><td>Primary</td><td><code>#FF8F5E</code></td></tr>
                  <tr><td>Border</td><td><code>#2E2E3A</code></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Database Schema */}
        <section className="arch__section">
          <h2>Database Entities</h2>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Entity</th><th>Key Fields</th><th>Purpose</th></tr>
            </thead>
            <tbody>
              <tr><td><code>User</code></td><td>email, name, provider, isAdmin</td><td>OAuth user accounts</td></tr>
              <tr><td><code>Bookmark</code></td><td>user_id, restaurant JSON</td><td>Saved restaurant favorites</td></tr>
              <tr><td><code>Restaurant</code></td><td>naverPlaceId, menuItemsJson, fetchedAt</td><td>Cached Naver Place data (24h TTL)</td></tr>
              <tr><td><code>DailyVisitor</code></td><td>visitDate (unique), count</td><td>Daily visitor tracking</td></tr>
              <tr><td><code>GameWord</code></td><td>word, theme, letterCount, active</td><td>Words for 꼬들 game</td></tr>
              <tr><td><code>SearchLog</code></td><td>keyword, region, createdAt</td><td>Search analytics</td></tr>
              <tr><td><code>SharedLink</code></td><td>linkId, resultData</td><td>Shareable result URLs</td></tr>
            </tbody>
          </table>
        </section>

        {/* Key Decisions */}
        <section className="arch__section">
          <h2>Key Technical Decisions</h2>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Decision</th><th>Why</th></tr>
            </thead>
            <tbody>
              <tr><td>No router (phase state machine)</td><td>Simple three-phase flow doesn't need URL routing complexity. Phases are tracked per tab.</td></tr>
              <tr><td>No state library (hooks + localStorage)</td><td>App state is simple and local. No shared global state that justifies Redux/Zustand overhead.</td></tr>
              <tr><td>Naver GraphQL over HTML scraping</td><td>HTML scraping triggers permanent 429 IP blocks. GraphQL endpoint has no such restriction.</td></tr>
              <tr><td>Hybrid Kakao search + Naver menus</td><td>Kakao search is reliable but has no menu data. Naver GraphQL provides menus. Cross-reference bridges them.</td></tr>
              <tr><td>3 parallel GraphQL queries per place</td><td>WAF blocks certain field combinations. Parallel queries have same latency as a single query.</td></tr>
              <tr><td>Baemin menus as primary source</td><td>Base menus cap at ~7 items. Baemin field returns 80+ items for delivery-listed restaurants.</td></tr>
              <tr><td>Serverless functions as API proxy</td><td>Keeps API keys server-side. Handles CORS. In-memory caching reduces external API calls.</td></tr>
              <tr><td>JWT over sessions</td><td>Stateless auth works across Vercel (frontend) and Docker (backend) without shared session store.</td></tr>
              <tr><td>CSS variables for theming</td><td>Dark mode with zero JS re-renders. All components automatically adapt through variable swap.</td></tr>
              <tr><td>Kakao category search for recommendations</td><td>Only API that supports coordinate + radius + category filter. Naver GraphQL has no geo-search.</td></tr>
              <tr><td>Kakao og:image for thumbnails</td><td>Exact match by place ID (~88ms). Naver GraphQL search by name can return wrong restaurant for common names.</td></tr>
              <tr><td>Static subway data (412 stations)</td><td>GitHub open data source. No API key needed. Covers 12 lines including 신분당선 and 경의중앙선.</td></tr>
              <tr><td>Shared region/subway data files</td><td>Both search and recommend tabs reuse the same location data. Single source of truth.</td></tr>
              <tr><td>Non-restaurant filtering</td><td>Kakao FD6 category includes 노래방 and bars. Server-side filter by name/category keywords.</td></tr>
              <tr><td>Explicit search button (recommendations)</td><td>No auto-fetch on location change. User configures location + budget first, then searches.</td></tr>
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <footer className="arch__footer">
          <div className="arch__footer-links">
            <a href="https://github.com/valorjj/lunch-select" target="_blank" rel="noopener noreferrer">
              Frontend Repository
            </a>
            <span>|</span>
            <a href="https://github.com/valorjj/lunch-select-backend" target="_blank" rel="noopener noreferrer">
              Backend Repository
            </a>
          </div>
          <p className="arch__footer-note">
            Built with React, Spring Boot, and Naver Place GraphQL API
          </p>
        </footer>
      </div>
    </div>
  );
}
