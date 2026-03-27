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
  const { query, start } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Naver Search API credentials not configured' });
  }

  const startIndex = Math.max(1, Number(start) || 1);
  const count = Math.min(20, Math.max(1, Number(req.query.count) || 20));

  try {
    // Naver local search API max display=5, so we batch multiple requests
    const batchSize = 5;
    const numRequests = Math.ceil(count / batchSize);
    const fetches = Array.from({ length: numRequests }, (_, i) => {
      const batchStart = startIndex + i * batchSize;
      const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=${batchSize}&start=${batchStart}&sort=comment`;
      return fetch(url, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      }).then(async (r) => {
        if (!r.ok) throw new Error(`Naver Search API error ${r.status}`);
        return r.json();
      });
    });

    const responses = await Promise.all(fetches);
    const items: NaverSearchItem[] = responses.flatMap((d) => d.items || []);
    const total: number = responses[0]?.total || 0;

    // Deduplicate by link/coordinates
    const seen = new Set<string>();
    const uniqueItems = items.filter((item) => {
      const key = item.link || `${item.mapx}_${item.mapy}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const results: SearchResult[] = uniqueItems.map((item) => {
      const placeId = extractPlaceId(item.link);
      const { lat, lng } = naverCoordToWgs84(Number(item.mapx), Number(item.mapy));
      const id = placeId || `${item.mapx}_${item.mapy}`;

      return {
        id,
        name: decodeHtmlEntities(stripHtml(item.title)),
        category: item.category,
        address: item.address,
        roadAddress: item.roadAddress,
        lat,
        lng,
        phone: item.telephone,
        naverMapUrl: placeId
          ? `https://map.naver.com/p/entry/place/${placeId}`
          : `https://map.naver.com/p/search/${encodeURIComponent(decodeHtmlEntities(stripHtml(item.title)))}`,
      };
    });

    return res.status(200).json({ results, total, start: startIndex });
  } catch (error: any) {
    console.error('Search API error:', error.message);
    return res.status(500).json({ error: 'Failed to search places', message: error.message });
  }
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
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
