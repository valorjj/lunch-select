/// <reference types="react-scripts" />

declare namespace naver {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      setZoom(level: number): void;
      fitBounds(bounds: LatLngBounds): void;
      destroy(): void;
    }

    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class LatLngBounds {
      constructor(sw: LatLng, ne: LatLng);
      extend(latlng: LatLng): LatLngBounds;
    }

    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(latlng: LatLng): void;
    }

    class Polyline {
      constructor(options: PolylineOptions);
      setMap(map: Map | null): void;
    }

    class InfoWindow {
      constructor(options: InfoWindowOptions);
      open(map: Map, marker: Marker): void;
      close(): void;
    }

    interface MapOptions {
      center: LatLng;
      zoom?: number;
      minZoom?: number;
      maxZoom?: number;
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map;
      icon?: MarkerIcon;
      title?: string;
    }

    interface MarkerIcon {
      content?: string;
      size?: Size;
      anchor?: Point;
    }

    interface PolylineOptions {
      map?: Map;
      path: LatLng[];
      strokeColor?: string;
      strokeWeight?: number;
      strokeOpacity?: number;
      strokeLineCap?: string;
      strokeLineJoin?: string;
    }

    interface InfoWindowOptions {
      content: string;
      borderWidth?: number;
      backgroundColor?: string;
    }

    class Size {
      constructor(width: number, height: number);
    }

    class Point {
      constructor(x: number, y: number);
    }

    class Event {
      static addListener(target: any, type: string, listener: Function): void;
      static removeListener(listener: any): void;
    }
  }
}
