import React from 'react';
import './ArchitectureModal.scss';

interface ArchitectureModalProps {
  onClose: () => void;
}

export function ArchitectureModal({ onClose }: ArchitectureModalProps) {
  return (
    <div className="arch-modal" onClick={onClose}>
      <div className="arch-modal__card" onClick={(e) => e.stopPropagation()}>
        <button className="arch-modal__close" onClick={onClose}>&times;</button>
        <h2 className="arch-modal__title">Architecture</h2>

        <section className="arch-modal__section">
          <h3>Frontend</h3>
          <ul>
            <li><strong>React 19</strong> + TypeScript (strict mode)</li>
            <li>SCSS with CSS variables</li>
            <li>Phase state machine: input &rarr; game &rarr; result</li>
            <li>Custom hooks (useRestaurants, useAuth, useBookmarks)</li>
            <li>Vercel serverless functions (API proxy)</li>
          </ul>
        </section>

        <section className="arch-modal__section">
          <h3>Backend</h3>
          <ul>
            <li><strong>Spring Boot 3.5</strong> + Kotlin</li>
            <li>MariaDB + JPA/Hibernate</li>
            <li>OAuth2 (Google, Naver) + JWT</li>
            <li>10 REST controllers</li>
            <li>Docker Compose deployment</li>
          </ul>
        </section>

        <section className="arch-modal__section">
          <h3>Search & Menu Strategy</h3>
          <div className="arch-modal__flow">
            <div className="arch-modal__flow-step">
              <span className="arch-modal__flow-badge">1</span>
              <div>
                <strong>Naver GraphQL</strong>
                <p>pcmap-api.place.naver.com/graphql<br/>restaurantList search</p>
              </div>
            </div>
            <div className="arch-modal__flow-arrow">&darr;</div>
            <div className="arch-modal__flow-step">
              <span className="arch-modal__flow-badge">2</span>
              <div>
                <strong>Kakao Local API</strong>
                <p>Fallback keyword search<br/>dapi.kakao.com</p>
              </div>
            </div>
            <div className="arch-modal__flow-arrow">&darr;</div>
            <div className="arch-modal__flow-step">
              <span className="arch-modal__flow-badge">3</span>
              <div>
                <strong>Naver Official API</strong>
                <p>Last resort fallback<br/>openapi.naver.com (max 5)</p>
              </div>
            </div>
          </div>
        </section>

        <section className="arch-modal__section">
          <h3>Menu Data</h3>
          <div className="arch-modal__flow">
            <div className="arch-modal__flow-step">
              <span className="arch-modal__flow-badge arch-modal__flow-badge--alt">A</span>
              <div>
                <strong>Baemin menus</strong>
                <p>Full menu list (80+ items)<br/>via Naver GraphQL baemin field</p>
              </div>
            </div>
            <div className="arch-modal__flow-arrow">&darr; fallback</div>
            <div className="arch-modal__flow-step">
              <span className="arch-modal__flow-badge arch-modal__flow-badge--alt">B</span>
              <div>
                <strong>Base menus</strong>
                <p>~7 representative items<br/>via Naver GraphQL base.menus</p>
              </div>
            </div>
          </div>
        </section>

        <section className="arch-modal__section">
          <h3>Data Flow</h3>
          <div className="arch-modal__diagram">
            <code>
              Search &rarr; Add to List &rarr; Mini Game &rarr; Winner<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Cross-ref (Kakao &rarr; Naver ID) &larr;&rsaquo;<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&darr;<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;GraphQL Menu Fetch &rarr; Display
            </code>
          </div>
        </section>
      </div>
    </div>
  );
}
