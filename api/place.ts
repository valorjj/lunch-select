import type { VercelRequest, VercelResponse } from '@vercel/node';

interface NaverPlaceData {
  id: string;
  name: string;
  category: string;
  menuItems: { name: string; price: number | null; description?: string; images?: string[] }[];
  thumbnail: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  phone: string;
  rating: number | null;
  reviewCount: number | null;
}

// In-memory caches
const cache = new Map<string, { data: NaverPlaceData; timestamp: number }>();
const crossRefCache = new Map<string, { naverId: string | null; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const GRAPHQL_URL = 'https://pcmap-api.place.naver.com/graphql';
const GRAPHQL_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': '*/*',
  'Accept-Language': 'ko',
  'Origin': 'https://pcmap.place.naver.com',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function getCached(placeId: string): NaverPlaceData | null {
  const entry = cache.get(placeId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(placeId);
    return null;
  }
  return entry.data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let placeId = typeof req.query.id === 'string' ? req.query.id : null;
  const rawUrl = typeof req.query.url === 'string' ? req.query.url : null;
  const name = typeof req.query.name === 'string' ? req.query.name : null;
  const address = typeof req.query.address === 'string' ? req.query.address : null;

  // If no direct ID, try to resolve from URL
  if (!placeId && rawUrl) {
    placeId = await resolveUrlToPlaceId(rawUrl);
  }

  // If still no ID, try cross-reference by name+address (for Kakao-sourced restaurants)
  if (!placeId && name) {
    placeId = await resolveByNameAddress(name, address || '');
  }

  if (!placeId) {
    return res.status(400).json({
      error: name
        ? '네이버에서 일치하는 음식점을 찾을 수 없습니다.'
        : 'URL에서 음식점 ID를 찾을 수 없습니다. 공유 링크(naver.me) 대신 브라우저 주소창의 URL을 복사해주세요.',
    });
  }

  // Check cache first
  const cached = getCached(placeId);
  if (cached) {
    return res.status(200).json(cached);
  }

  try {
    const data = await fetchPlaceData(placeId);
    cache.set(placeId, { data, timestamp: Date.now() });
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Place API error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch place data', message: error.message });
  }
}

// ──────────────────────────────────────────────
// URL resolution
// ──────────────────────────────────────────────
async function resolveUrlToPlaceId(url: string): Promise<string | null> {
  const directId = extractPlaceIdFromUrl(url);
  if (directId) return directId;

  if (url.includes('naver.me')) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      const resolvedUrl = response.url;
      console.log('Resolved short URL:', url, '->', resolvedUrl);
      return extractPlaceIdFromUrl(resolvedUrl);
    } catch (err: any) {
      console.error('Failed to resolve short URL:', err.message);
      return null;
    }
  }

  return null;
}

function extractPlaceIdFromUrl(url: string): string | null {
  const placeMatch = url.match(/place\/(\d+)/);
  if (placeMatch) return placeMatch[1];
  const restaurantMatch = url.match(/restaurant\/(\d+)/);
  if (restaurantMatch) return restaurantMatch[1];
  return null;
}

// ──────────────────────────────────────────────
// Naver Place GraphQL API
// ──────────────────────────────────────────────
async function fetchPlaceData(placeId: string): Promise<NaverPlaceData> {
  console.log('[place] fetching via GraphQL, placeId:', placeId);

  // Query 1: base info (category + coordinate can't be combined with menus)
  const baseQuery = {
    operationName: 'getPlaceDetail',
    variables: { input: { id: placeId } },
    query: `query getPlaceDetail($input: PlaceDetailInput!) {
      placeDetail(input: $input) {
        base {
          name
          category
          address
          roadAddress
          phone
          virtualPhone
          coordinate { x y }
          visitorReviewsScore
          visitorReviewsTotal
        }
      }
    }`,
  };

  // Query 2: base menus (~7 representative items, separate to avoid WAF 400)
  const menuQuery = {
    operationName: 'getPlaceDetail',
    variables: { input: { id: placeId } },
    query: `query getPlaceDetail($input: PlaceDetailInput!) {
      placeDetail(input: $input) {
        base {
          name
          address
          roadAddress
          menus { name price }
        }
      }
    }`,
  };

  // Query 3: baemin menus (full menu list, only available for Baemin-listed restaurants)
  const baeminQuery = {
    operationName: 'getPlaceDetail',
    variables: { input: { id: placeId } },
    query: `query getPlaceDetail($input: PlaceDetailInput!) {
      placeDetail(input: $input) {
        baemin {
          menus { name price }
        }
      }
    }`,
  };

  // Query 4: images
  const imageQuery = {
    operationName: 'getPlaceDetail',
    variables: { input: { id: placeId } },
    query: `query getPlaceDetail($input: PlaceDetailInput!) {
      placeDetail(input: $input) {
        images {
          images { origin }
        }
      }
    }`,
  };

  const referer = `https://pcmap.place.naver.com/restaurant/${placeId}/home`;

  // Fire all queries in parallel
  const [baseRes, menuRes, baeminRes, imageRes] = await Promise.all([
    fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { ...GRAPHQL_HEADERS, Referer: referer },
      body: JSON.stringify(baseQuery),
    }),
    fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { ...GRAPHQL_HEADERS, Referer: referer },
      body: JSON.stringify(menuQuery),
    }),
    fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { ...GRAPHQL_HEADERS, Referer: referer },
      body: JSON.stringify(baeminQuery),
    }),
    fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { ...GRAPHQL_HEADERS, Referer: referer },
      body: JSON.stringify(imageQuery),
    }),
  ]);

  if (!baseRes.ok) {
    throw new Error(`GraphQL base query failed: ${baseRes.status} ${baseRes.statusText}`);
  }

  const baseData = await baseRes.json();
  const menuData = menuRes.ok ? await menuRes.json() : null;
  const imageData = imageRes.ok ? await imageRes.json() : null;
  const baeminData = baeminRes.ok ? await baeminRes.json() : null;

  const base = baseData?.data?.placeDetail?.base;
  if (!base) {
    throw new Error(`Place not found: ${placeId}`);
  }

  // Prefer baemin menus (full list) over base menus (~7 representative)
  const baeminMenus: { name: string; price: string }[] =
    baeminData?.data?.placeDetail?.baemin?.menus || [];
  const baseMenus: { name: string; price: string }[] =
    menuData?.data?.placeDetail?.base?.menus || [];

  const rawMenus = baeminMenus.length > 0 ? baeminMenus : baseMenus;

  const menuItems = rawMenus.map((m) => ({
    name: m.name || '',
    price: parsePrice(m.price || ''),
  }));

  const coord = base.coordinate || {};

  return {
    id: placeId,
    name: base.name || '',
    category: base.category || '',
    menuItems,
    thumbnail: imageData?.data?.placeDetail?.images?.images?.[0]?.origin || '',
    address: base.address || '',
    roadAddress: base.roadAddress || '',
    lat: Number(coord.y) || 0,
    lng: Number(coord.x) || 0,
    phone: base.virtualPhone || base.phone || '',
    rating: base.visitorReviewsScore ? parseFloat(base.visitorReviewsScore) : null,
    reviewCount: base.visitorReviewsTotal ? parseInt(base.visitorReviewsTotal) : null,
  };
}

function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;
  // Handle range prices like "13,000~14,900" — take the first price
  const firstPrice = priceStr.split(/[~\-\/]/).at(0) || priceStr;
  const numStr = firstPrice.replace(/[^0-9]/g, '');
  const num = parseInt(numStr, 10);
  return isNaN(num) ? null : num;
}

// ──────────────────────────────────────────────
// Cross-reference: find Naver Place ID by name + address
// ──────────────────────────────────────────────
function getCrossRefCached(key: string): string | null | undefined {
  const entry = crossRefCache.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    crossRefCache.delete(key);
    return undefined;
  }
  return entry.naverId;
}

function normalizeName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

async function resolveByNameAddress(name: string, address: string): Promise<string | null> {
  const cacheKey = `${name}|${address}`;
  const cached = getCrossRefCached(cacheKey);
  if (cached !== undefined) return cached;

  // Try name only first, then with address if no match
  const queries = [name, address ? `${name} ${address}` : null].filter(Boolean) as string[];
  const normalizedTarget = normalizeName(name);

  for (const query of queries) {
    console.log('[place] cross-ref GraphQL search:', query);

    try {
      const searchBody = {
        operationName: 'getRestaurants',
        variables: {
          input: { query, display: 5, start: 1, deviceType: 'pcmap' },
        },
        query: `query getRestaurants($input: RestaurantListInput) {
          restaurantList(input: $input) {
            items { id name category address roadAddress x y phone imageUrl }
            total
          }
        }`,
      };

      const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: { ...GRAPHQL_HEADERS, Referer: 'https://pcmap.place.naver.com/' },
        body: JSON.stringify(searchBody),
      });

      if (!response.ok) continue;

      const data = await response.json();
      const items = data?.data?.restaurantList?.items;
      if (!items?.length) continue;

      // Find best match by name similarity
      for (const item of items) {
        const itemName = normalizeName(item.name || '');
        const itemId = String(item.id || '');
        if (!itemId) continue;

        if (
          itemName === normalizedTarget ||
          itemName.includes(normalizedTarget) ||
          normalizedTarget.includes(itemName)
        ) {
          console.log('[place] cross-ref matched:', name, '->', itemId, `(${item.name})`);
          crossRefCache.set(cacheKey, { naverId: itemId, timestamp: Date.now() });
          return itemId;
        }
      }

      // Fallback to first result
      const firstId = String(items[0].id || '');
      if (firstId) {
        console.log('[place] cross-ref fallback to first result:', name, '->', firstId, `(${items[0].name})`);
        crossRefCache.set(cacheKey, { naverId: firstId, timestamp: Date.now() });
        return firstId;
      }
    } catch (e: any) {
      console.error('[place] cross-ref GraphQL search error:', e.message);
    }
  }

  crossRefCache.set(cacheKey, { naverId: null, timestamp: Date.now() });
  return null;
}
