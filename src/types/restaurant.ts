export interface MenuItem {
  name: string;
  price: number | null;
  description?: string;
  images?: string[];
}

export interface SearchResult {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  phone: string;
  naverMapUrl: string;
  source?: 'kakao' | 'naver';
  imageUrl?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  category: string;
  menuItems: MenuItem[];
  thumbnail: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  phone?: string;
  naverMapUrl: string;
  source?: 'kakao' | 'naver';
  naverPlaceId?: string;
}
