import type { VercelRequest, VercelResponse } from '@vercel/node';

interface NaverSearchItem {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

interface SearchResult {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  phone: string;
  naverMapUrl: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Naver Search API credentials not configured' });
  }

  try {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=comment`;

    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Naver Search API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const items: NaverSearchItem[] = data.items || [];

    const results: SearchResult[] = items.map((item) => {
      const placeId = extractPlaceId(item.link);
      const { lat, lng } = naverCoordToWgs84(Number(item.mapx), Number(item.mapy));
      // Use place ID if available, otherwise generate ID from coordinates
      const id = placeId || `${item.mapx}_${item.mapy}`;

      return {
        id,
        name: stripHtml(item.title),
        category: item.category,
        address: item.address,
        roadAddress: item.roadAddress,
        lat,
        lng,
        phone: item.telephone,
        naverMapUrl: placeId
          ? `https://map.naver.com/p/entry/place/${placeId}`
          : `https://map.naver.com/p/search/${encodeURIComponent(stripHtml(item.title))}`,
      };
    });

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Search API error:', error.message);
    return res.status(500).json({ error: 'Failed to search places', message: error.message });
  }
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

function extractPlaceId(link: string): string | null {
  // Naver search link format: https://pcmap.place.naver.com/restaurant/1234567890
  const match = link.match(/(?:place|restaurant)\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Convert Naver Search API mapx/mapy to WGS84 (lat/lng).
 * Despite docs saying "KATECH", the values are WGS84 coordinates
 * scaled by a power of 10. Detect the magnitude and divide accordingly.
 * Korea ranges: lat 33-43, lng 124-132
 */
function naverCoordToWgs84(mapx: number, mapy: number): { lat: number; lng: number } {
  let lng = mapx;
  let lat = mapy;

  // Normalize longitude (should be 124-132 for Korea)
  while (lng > 200) lng /= 10;
  // Normalize latitude (should be 33-43 for Korea)
  while (lat > 100) lat /= 10;

  return { lat, lng };
}
