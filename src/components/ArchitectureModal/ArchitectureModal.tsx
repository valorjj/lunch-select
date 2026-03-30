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

const SEARCH_FLOW = `flowchart TD
    A["User searches restaurant"] --> B{"Naver GraphQL\\nrestaurantList"}
    B -->|"results found"| Z["Display results"]
    B -->|"empty / error"| C{"Kakao Local API\\ndapi.kakao.com"}
    C -->|"results found"| Z
    C -->|"empty / error"| D{"Naver Official API\\nopenapi.naver.com"}
    D -->|"results found\\n(max 5)"| Z
    D -->|"all failed"| E["Error: no results"]

    style A fill:#FFF0E8,stroke:#FF6B35
    style Z fill:#E8F5E9,stroke:#38A169
    style E fill:#FEE2E2,stroke:#E53E3E
`;

const MENU_FLOW = `flowchart TD
    A["Winner selected"] --> B{"Has Naver Place ID?"}
    B -->|"Yes (Naver source)"| D["GraphQL placeDetail"]
    B -->|"No (Kakao source)"| C["Cross-reference\\nGraphQL restaurantList\\nby name + address"]
    C --> D
    D --> E{"Baemin menus\\navailable?"}
    E -->|"Yes"| F["Full menu list\\n(80+ items)"]
    E -->|"No"| G["Base menus\\n(~7 representative)"]
    F --> H["Display menus\\nwith prices"]
    G --> H

    style A fill:#FFF0E8,stroke:#FF6B35
    style H fill:#E8F5E9,stroke:#38A169
    style F fill:#E3F2FD,stroke:#1976D2
    style G fill:#FFF8E1,stroke:#F9A825
`;

const APP_FLOW = `flowchart LR
    A["Input Phase"] -->|"2+ restaurants"| B["Game Phase"]
    B -->|"winner selected"| C["Result Phase"]
    C -->|"retry"| B
    C -->|"new start"| A

    subgraph Games
      B1["Gacha\\n(Random Draw)"]
      B2["Ladder\\n(Elimination)"]
    end
    B --> B1
    B --> B2

    style A fill:#FFF0E8,stroke:#FF6B35
    style B fill:#E3F2FD,stroke:#1976D2
    style C fill:#E8F5E9,stroke:#38A169
`;

const INFRA_DIAGRAM = `flowchart TB
    subgraph Frontend ["Frontend (Vercel)"]
      R["React 19 + TypeScript"]
      SF["Serverless Functions\\n/api/place, /api/search"]
    end

    subgraph Backend ["Backend (Docker)"]
      SB["Spring Boot 3.5\\nKotlin"]
      DB[("MariaDB")]
    end

    subgraph External ["External APIs"]
      NG["Naver GraphQL\\npcmap-api.place.naver.com"]
      KA["Kakao Local API\\ndapi.kakao.com"]
      NO["Naver Official API\\nopenapi.naver.com"]
    end

    R <-->|"apiFetch"| SB
    R <-->|"serverless"| SF
    SF --> NG
    SF --> KA
    SF --> NO
    SB --> DB
    SB --> NG

    style R fill:#FFF0E8,stroke:#FF6B35
    style SB fill:#E3F2FD,stroke:#1976D2
    style DB fill:#FFF8E1,stroke:#F9A825
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
        {/* Tech Stack */}
        <section className="arch__section">
          <h2>Tech Stack</h2>
          <div className="arch__columns">
            <div className="arch__col">
              <h3>Frontend</h3>
              <table className="arch__table">
                <tbody>
                  <tr><td>Framework</td><td>React 19</td></tr>
                  <tr><td>Language</td><td>TypeScript (strict)</td></tr>
                  <tr><td>Styling</td><td>SCSS + CSS Variables</td></tr>
                  <tr><td>State</td><td>Custom Hooks + localStorage</td></tr>
                  <tr><td>Hosting</td><td>Vercel</td></tr>
                  <tr><td>Serverless</td><td>Vercel Functions (/api)</td></tr>
                </tbody>
              </table>
            </div>
            <div className="arch__col">
              <h3>Backend</h3>
              <table className="arch__table">
                <tbody>
                  <tr><td>Framework</td><td>Spring Boot 3.5</td></tr>
                  <tr><td>Language</td><td>Kotlin</td></tr>
                  <tr><td>Database</td><td>MariaDB + JPA/Hibernate</td></tr>
                  <tr><td>Auth</td><td>OAuth2 (Google, Naver) + JWT</td></tr>
                  <tr><td>Deploy</td><td>Docker Compose</td></tr>
                  <tr><td>API Style</td><td>RESTful (10 controllers)</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Infrastructure */}
        <section className="arch__section">
          <h2>Infrastructure</h2>
          <MermaidChart chart={INFRA_DIAGRAM} id="infra-diagram" />
        </section>

        {/* App Phase Flow */}
        <section className="arch__section">
          <h2>App Phase Flow</h2>
          <p className="arch__desc">
            The app uses a three-phase state machine with no router. Users add restaurants,
            play a mini game, and see the winner with menus and directions.
          </p>
          <MermaidChart chart={APP_FLOW} id="app-flow" />
        </section>

        {/* Search API Strategy */}
        <section className="arch__section">
          <h2>Search API Strategy</h2>
          <p className="arch__desc">
            Three-tier fallback search. Naver GraphQL is preferred for its rich data.
            Kakao is the primary fallback. Official Naver API is the last resort (max 5 results).
          </p>
          <MermaidChart chart={SEARCH_FLOW} id="search-flow" />
        </section>

        {/* API Table */}
        <section className="arch__section">
          <h2>API Endpoints</h2>
          <h3>Serverless Functions (Vercel)</h3>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Endpoint</th><th>Method</th><th>Description</th><th>External API</th></tr>
            </thead>
            <tbody>
              <tr><td><code>/api/search</code></td><td>GET</td><td>Restaurant search with 3-tier fallback</td><td>Naver GraphQL, Kakao, Naver Official</td></tr>
              <tr><td><code>/api/place?id=</code></td><td>GET</td><td>Place detail + menu by Naver ID</td><td>Naver GraphQL (placeDetail)</td></tr>
              <tr><td><code>/api/place?name=&amp;address=</code></td><td>GET</td><td>Cross-reference Kakao restaurant to Naver</td><td>Naver GraphQL (restaurantList + placeDetail)</td></tr>
              <tr><td><code>/api/directions</code></td><td>GET</td><td>Route between two points</td><td>Naver Directions API</td></tr>
              <tr><td><code>/api/geocode</code></td><td>GET</td><td>Address to coordinates</td><td>Naver Geocoding API</td></tr>
            </tbody>
          </table>

          <h3>Backend REST API (Spring Boot)</h3>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Endpoint</th><th>Method</th><th>Description</th></tr>
            </thead>
            <tbody>
              <tr><td><code>/api/auth/login/*</code></td><td>GET/POST</td><td>OAuth2 login (Google, Naver)</td></tr>
              <tr><td><code>/api/auth/me</code></td><td>GET</td><td>Current user info</td></tr>
              <tr><td><code>/api/bookmarks</code></td><td>GET/POST/DELETE</td><td>User bookmark management</td></tr>
              <tr><td><code>/api/visitors/today</code></td><td>GET</td><td>Today + total visitor count</td></tr>
              <tr><td><code>/api/visitors/track</code></td><td>POST</td><td>Increment today's visitor count</td></tr>
              <tr><td><code>/api/share</code></td><td>GET/POST</td><td>Result sharing links</td></tr>
              <tr><td><code>/api/search-logs</code></td><td>GET/POST</td><td>Search analytics</td></tr>
              <tr><td><code>/api/admin/*</code></td><td>Various</td><td>Admin panel (words, users, stats)</td></tr>
              <tr><td><code>/api/game-words</code></td><td>GET</td><td>Public game words for Word Game</td></tr>
            </tbody>
          </table>
        </section>

        {/* Menu Data Flow */}
        <section className="arch__section">
          <h2>Menu Data Flow</h2>
          <p className="arch__desc">
            Menu data is fetched via Naver Place GraphQL API. For Kakao-sourced restaurants,
            a cross-reference search finds the matching Naver Place ID first. Baemin delivery menus
            provide the full list (80+ items); base menus (~7) are the fallback.
          </p>
          <MermaidChart chart={MENU_FLOW} id="menu-flow" />
        </section>

        {/* Naver GraphQL Detail */}
        <section className="arch__section">
          <h2>Naver Place GraphQL Queries</h2>
          <table className="arch__table arch__table--full">
            <thead>
              <tr><th>Query</th><th>Fields</th><th>Note</th></tr>
            </thead>
            <tbody>
              <tr><td><code>getPlaceDetail</code> (base)</td><td>name, category, address, roadAddress, phone, coordinate</td><td>Cannot combine with menus (WAF block)</td></tr>
              <tr><td><code>getPlaceDetail</code> (menus)</td><td>menus &#123; name, price &#125;</td><td>~7 representative items</td></tr>
              <tr><td><code>getPlaceDetail</code> (baemin)</td><td>baemin.menus &#123; name, price &#125;</td><td>Full menu list, only for Baemin restaurants</td></tr>
              <tr><td><code>getRestaurants</code></td><td>id, name, category, address, x, y, phone, imageUrl</td><td>Search + cross-reference</td></tr>
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <footer className="arch__footer">
          <a
            href="https://github.com/valorjj/lunch-select"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/valorjj/lunch-select
          </a>
          <span>|</span>
          <a
            href="https://github.com/valorjj/lunch-select-backend"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/valorjj/lunch-select-backend
          </a>
        </footer>
      </div>
    </div>
  );
}
