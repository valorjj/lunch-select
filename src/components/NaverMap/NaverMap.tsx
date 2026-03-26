import React, { useRef, useEffect } from 'react';
import './NaverMap.scss';

interface MapMarker {
  lat: number;
  lng: number;
  label: string;
  color: string;
}

interface NaverMapProps {
  center: { lat: number; lng: number };
  markers: MapMarker[];
  path?: [number, number][];
  zoom?: number;
}

export function NaverMap({ center, markers, path, zoom = 15 }: NaverMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const [mapError, setMapError] = React.useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Check if Naver Maps SDK is available and properly authenticated
    if (typeof naver === 'undefined' || !naver.maps || !naver.maps.Map) {
      setMapError(true);
      return;
    }

    let map: naver.maps.Map;
    try {
      map = new naver.maps.Map(containerRef.current, {
        center: new naver.maps.LatLng(center.lat, center.lng),
        zoom,
      });
    } catch (e) {
      console.error('Failed to initialize Naver Map:', e);
      setMapError(true);
      return;
    }
    mapRef.current = map;

    const mapMarkers: naver.maps.Marker[] = [];
    const bounds = new naver.maps.LatLngBounds(
      new naver.maps.LatLng(center.lat, center.lng),
      new naver.maps.LatLng(center.lat, center.lng)
    );

    // Add markers
    markers.forEach((m) => {
      const position = new naver.maps.LatLng(m.lat, m.lng);
      bounds.extend(position);

      const marker = new naver.maps.Marker({
        position,
        map,
        icon: {
          content: `<div class="naver-map-marker" style="background:${m.color}"><span>${m.label}</span></div>`,
          anchor: new naver.maps.Point(16, 40),
        },
      });
      mapMarkers.push(marker);
    });

    // Draw route path
    let polyline: naver.maps.Polyline | null = null;
    if (path && path.length > 0) {
      const pathLatLngs = path.map(
        ([lng, lat]) => new naver.maps.LatLng(lat, lng)
      );
      pathLatLngs.forEach((ll) => bounds.extend(ll));

      polyline = new naver.maps.Polyline({
        map,
        path: pathLatLngs,
        strokeColor: '#FF6B35',
        strokeWeight: 4,
        strokeOpacity: 0.8,
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      });
    }

    // Fit bounds to show all markers
    if (markers.length > 1 || (path && path.length > 0)) {
      map.fitBounds(bounds);
    }

    return () => {
      mapMarkers.forEach((m) => m.setMap(null));
      if (polyline) polyline.setMap(null);
      map.destroy();
    };
  }, [center.lat, center.lng, markers, path, zoom]);

  if (mapError) {
    return (
      <div className="naver-map">
        <div className="naver-map__error">
          <p>지도를 불러올 수 없습니다.</p>
          <p className="naver-map__error-hint">네이버 지도 API 인증을 확인해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="naver-map">
      <div ref={containerRef} className="naver-map__container" />
    </div>
  );
}
