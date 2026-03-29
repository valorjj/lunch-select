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

  // Try Naver Map search (more results), then Kakao, then official Naver (5 max)
  const errors: string[] = [];

  // 1. Try Naver Map internal search
  try {
    const result = await searchNaverMap(query, page, displayCount);
    if (result.results.length > 0) {
      return res.status(200).json(result);
    }
    errors.push('Naver Map: empty results');
  } catch (e: any) {
    errors.push(`Naver Map: ${e.message}`);
  }

  // 2. Try Kakao Local Search (up to 15 per page)
  try {
    const result = await searchKakao(query, page, displayCount);
    if (result.results.length > 0) {
      return res.status(200).json(result);
    }
    errors.push('Kakao: empty results');
  } catch (e: any) {
    errors.push(`Kakao: ${e.message}`);
  }

  // 3. Fallback: Official Naver Search API (max 5 results, page 1 only)
  try {
    const result = await searchNaverLocal(query);
    return res.status(200).json({ ...result, _debug: errors });
  } catch (e: any) {
    errors.push(`Naver Local: ${e.message}`);
    return res.status(500).json({ error: 'All search providers failed', _debug: errors });
  }
}

// ──────────────────────────────────────────────
// Provider 1: Naver Place GraphQL search
// ──────────────────────────────────────────────
async function searchNaverMap(
  query: string,
  page: number,
  displayCount: number,
): Promise<{ results: SearchResult[]; total: number; page: number; totalPages: number }> {
  const start = (page - 1) * displayCount + 1;

  const body = {
    operationName: 'getRestaurants',
    variables: {
      input: { query, display: displayCount, start, deviceType: 'pcmap' },
    },
    query: `query getRestaurants($input: RestaurantListInput) {
      restaurantList(input: $input) {
        items { id name category address roadAddress x y phone imageUrl }
        total
      }
    }`,
  };

  const response = await fetch('https://pcmap-api.place.naver.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Accept-Language': 'ko',
      'Origin': 'https://pcmap.place.naver.com',
      'Referer': 'https://pcmap.place.naver.com/',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Naver GraphQL search failed: ${response.status}`);
  }

  const data = await response.json();
  const restaurantList = data?.data?.restaurantList;
  if (!restaurantList?.items?.length) {
    throw new Error('Naver GraphQL: empty results');
  }

  const total = restaurantList.total || restaurantList.items.length;
  const totalPages = Math.ceil(total / displayCount);

  const results: SearchResult[] = restaurantList.items.map((item: any) => ({
    id: String(item.id || ''),
    name: item.name || '',
    category: item.category || '',
    address: item.address || '',
    roadAddress: item.roadAddress || '',
    lat: parseFloat(item.y) || 0,
    lng: parseFloat(item.x) || 0,
    phone: item.phone || '',
    naverMapUrl: item.id
      ? `https://map.naver.com/p/entry/place/${item.id}`
      : `https://map.naver.com/p/search/${encodeURIComponent(item.name || '')}`,
  }));

  return { results, total, page, totalPages };
}

// ──────────────────────────────────────────────
// Provider 2: Kakao Local Search
// ──────────────────────────────────────────────
async function searchKakao(
  query: string,
  page: number,
  displayCount: number,
): Promise<{ results: SearchResult[]; total: number; page: number; totalPages: number }> {
  const kakaoRestKey = process.env.KAKAO_REST_API_KEY;
  const kakaoAdminKey = process.env.KAKAO_ADMIN_KEY;
  if (!kakaoRestKey && !kakaoAdminKey) throw new Error('Kakao API key not configured');

  // Kakao supports size=1~15, page=1~45 (max 45 results)
  const size = Math.min(15, displayCount);
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=${size}&page=${page}`;

  // Try REST API key first, then Admin key
  const authHeader = kakaoRestKey
    ? `KakaoAK ${kakaoRestKey}`
    : `KakaoAK ${kakaoAdminKey}`;

  const response = await fetch(url, {
    headers: { Authorization: authHeader },
  });

  if (!response.ok) throw new Error(`Kakao API error ${response.status}`);

  const data = await response.json();
  const meta = data.meta || {};
  const total = meta.pageable_count || 0;
  const totalPages = Math.ceil(total / size);

  const results: SearchResult[] = (data.documents || []).map((item: any) => ({
    id: item.id || '',
    name: item.place_name || '',
    category: item.category_name || '',
    address: item.address_name || '',
    roadAddress: item.road_address_name || '',
    lat: parseFloat(item.y) || 0,
    lng: parseFloat(item.x) || 0,
    phone: item.phone || '',
    naverMapUrl: `https://map.naver.com/p/search/${encodeURIComponent(item.place_name || '')}`,
    source: 'kakao',
  }));

  return { results, total, page, totalPages };
}

// ──────────────────────────────────────────────
// Provider 3: Official Naver Search (fallback, max 5)
// ──────────────────────────────────────────────
async function searchNaverLocal(
  query: string,
): Promise<{ results: SearchResult[]; total: number; page: number; totalPages: number }> {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) throw new Error('Naver Search API credentials not configured');

  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=comment`;

  const response = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) throw new Error(`Naver Search API error ${response.status}`);

  const data = await response.json();
  const items = data.items || [];

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

  return { results, total: items.length, page: 1, totalPages: 1 };
}

// ──────────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────────
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
