import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const page = Math.max(1, Number(req.query.page) || 1);
  const displayCount = Math.min(20, Math.max(1, Number(req.query.displayCount) || 20));

  try {
    // Use Naver Map's search endpoint for more results
    const results = await searchNaverMap(query, page, displayCount);
    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Search API error:', error.message);

    // Fallback to official Naver Search API (limited to 5 results)
    try {
      const fallback = await searchNaverLocal(query);
      return res.status(200).json(fallback);
    } catch (fallbackError: any) {
      return res.status(500).json({ error: 'Failed to search places', message: error.message });
    }
  }
}

async function searchNaverMap(
  query: string,
  page: number,
  displayCount: number,
): Promise<{ results: SearchResult[]; total: number; page: number; totalPages: number }> {
  const url = `https://map.naver.com/p/api/search/allSearch?query=${encodeURIComponent(query)}&type=all&page=${page}&displayCount=${displayCount}&lang=ko`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://map.naver.com/',
    },
  });

  if (!response.ok) {
    throw new Error(`Naver Map search error ${response.status}`);
  }

  const data = await response.json();

  // The response has result.place or result.restaurant
  const placeResult = data?.result?.place || data?.result?.restaurant;
  if (!placeResult || !placeResult.list) {
    return { results: [], total: 0, page, totalPages: 0 };
  }

  const total = placeResult.totalCount || 0;
  const totalPages = Math.ceil(total / displayCount);

  const results: SearchResult[] = placeResult.list.map((item: any) => {
    const id = item.id || item.placeId || '';
    return {
      id: String(id),
      name: decodeHtmlEntities(item.name || ''),
      category: item.category ? item.category.join('>') : (item.categoryName || ''),
      address: item.address || '',
      roadAddress: item.roadAddress || item.fullRoadAddress || '',
      lat: parseFloat(item.y) || 0,
      lng: parseFloat(item.x) || 0,
      phone: item.tel || item.phone || '',
      naverMapUrl: id
        ? `https://map.naver.com/p/entry/place/${id}`
        : `https://map.naver.com/p/search/${encodeURIComponent(item.name || '')}`,
    };
  });

  return { results, total, page, totalPages };
}

async function searchNaverLocal(
  query: string,
): Promise<{ results: SearchResult[]; total: number; page: number; totalPages: number }> {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Naver Search API credentials not configured');
  }

  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=comment`;

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    throw new Error(`Naver Search API error ${response.status}`);
  }

  const data = await response.json();
  const items = data.items || [];
  const total = items.length;

  const results: SearchResult[] = items.map((item: any) => {
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

  return { results, total, page: 1, totalPages: 1 };
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
  const match = link.match(/(?:place|restaurant)\/(\d+)/);
  return match ? match[1] : null;
}

function naverCoordToWgs84(mapx: number, mapy: number): { lat: number; lng: number } {
  let lng = mapx;
  let lat = mapy;
  while (lng > 200) lng /= 10;
  while (lat > 100) lat /= 10;
  return { lat, lng };
}
