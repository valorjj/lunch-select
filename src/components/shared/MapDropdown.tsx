import React, { useState } from 'react';
import './MapDropdown.scss';

interface MapDropdownProps {
  name: string;
  lat: number;
  lng: number;
}

export function MapDropdown({ name, lat, lng }: MapDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="map-dropdown">
      <button className="map-dropdown__btn" onClick={() => setOpen(!open)}>
        지도
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>
      {open && (
        <div className="map-dropdown__popup">
          <a className="map-dropdown__item" href={`nmap://place?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}&appname=com.lunchselect`} onClick={() => { setTimeout(() => { window.open(`https://map.naver.com/p/search/${encodeURIComponent(name)}`, '_blank'); }, 500); }}>
            <span className="map-dropdown__dot map-dropdown__dot--naver">N</span>네이버지도
          </a>
          <a className="map-dropdown__item" href={`kakaomap://look?p=${lat},${lng}`} onClick={() => { setTimeout(() => { window.open(`https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`, '_blank'); }, 500); }}>
            <span className="map-dropdown__dot map-dropdown__dot--kakao">K</span>카카오맵
          </a>
          <a className="map-dropdown__item" href={`tmap://route?goalx=${lng}&goaly=${lat}&goalname=${encodeURIComponent(name)}`}>
            <span className="map-dropdown__dot map-dropdown__dot--tmap">T</span>티맵
          </a>
        </div>
      )}
    </div>
  );
}

interface MapButtonsProps {
  name: string;
  lat: number;
  lng: number;
}

export function MapButtons({ name, lat, lng }: MapButtonsProps) {
  return (
    <div className="map-buttons">
      <a className="map-buttons__app map-buttons__app--naver" href={`nmap://place?lat=${lat}&lng=${lng}&name=${encodeURIComponent(name)}&appname=com.lunchselect`} onClick={() => { setTimeout(() => { window.open(`https://map.naver.com/p/search/${encodeURIComponent(name)}`, '_blank'); }, 500); }}>
        <span>N</span>네이버지도
      </a>
      <a className="map-buttons__app map-buttons__app--kakao" href={`kakaomap://look?p=${lat},${lng}`} onClick={() => { setTimeout(() => { window.open(`https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`, '_blank'); }, 500); }}>
        <span>K</span>카카오맵
      </a>
      <a className="map-buttons__app map-buttons__app--tmap" href={`tmap://route?goalx=${lng}&goaly=${lat}&goalname=${encodeURIComponent(name)}`}>
        <span>T</span>티맵
      </a>
    </div>
  );
}
