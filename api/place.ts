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
}

// In-memory cache to avoid 429 rate limits from Naver Place scraping
const cache = new Map<string, { data: NaverPlaceData; timestamp: number }>();
const crossRefCache = new Map<string, { naverId: string | null; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

async function resolveUrlToPlaceId(url: string): Promise<string | null> {
  // First, try to extract directly from the URL
  const directId = extractPlaceIdFromUrl(url);
  if (directId) return directId;

  // If it's a shortened URL (naver.me), follow redirects to get the real URL
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
  // Pattern: /place/1234567890
  const placeMatch = url.match(/place\/(\d+)/);
  if (placeMatch) return placeMatch[1];

  // Pattern: /restaurant/1234567890
  const restaurantMatch = url.match(/restaurant\/(\d+)/);
  if (restaurantMatch) return restaurantMatch[1];

  return null;
}

async function fetchPlaceData(placeId: string): Promise<NaverPlaceData> {
  console.log('[place] fetching placeId:', placeId);

  const response = await fetch(
    `https://pcmap.place.naver.com/restaurant/${placeId}/home`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    }
  );

  console.log('[place] naver response status:', response.status);

  if (!response.ok) {
    throw new Error(`Naver place fetch failed: ${response.status}`);
  }

  const html = await response.text();
  console.log('[place] html length:', html.length);

  // Naver Place uses Apollo Client — data is in window.__APOLLO_STATE__
  const apolloStart = html.indexOf('window.__APOLLO_STATE__');
  if (apolloStart === -1) {
    throw new Error('Could not find __APOLLO_STATE__ in page. HTML preview: ' + html.substring(0, 500));
  }
  const jsonStart = html.indexOf('{', apolloStart);
  // Find the matching closing brace by tracking depth
  let depth = 0;
  let jsonEnd = jsonStart;
  for (let i = jsonStart; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') depth--;
    if (depth === 0) {
      jsonEnd = i + 1;
      break;
    }
  }
  const jsonStr = html.slice(jsonStart, jsonEnd);
  console.log('[place] JSON length:', jsonStr.length);
  const apolloState = JSON.parse(jsonStr);
  console.log('[place] parsed OK, keys:', Object.keys(apolloState).length);

  // Main place info is in PlaceDetailBase:{placeId}
  const place = apolloState[`PlaceDetailBase:${placeId}`];
  if (!place) {
    throw new Error('Could not find PlaceDetailBase in Apollo state');
  }

  const name = place.name || '';
  const category = place.category || '';
  const address = place.address || '';
  const roadAddress = place.roadAddress || '';
  const phone = place.virtualPhone || place.phone || '';
  const coord = place.coordinate || {};
  const lat = coord.y || 0;
  const lng = coord.x || 0;

  // Thumbnail: search Apollo state for place images
  let thumbnail = '';
  // Try menu item images first (most reliable)
  const firstMenu = apolloState[`Menu:${placeId}_0`];
  if (firstMenu?.images?.length) {
    thumbnail = firstMenu.images[0];
  }
  // Try to find images from ROOT_QUERY placeDetail entries
  if (!thumbnail) {
    for (const key of Object.keys(apolloState)) {
      const val = apolloState[key];
      if (val?.images && Array.isArray(val.images) && val.images.length > 0) {
        const img = val.images[0];
        // Could be a direct URL string or an object with origin/url
        if (typeof img === 'string' && img.startsWith('http')) {
          thumbnail = img;
          break;
        } else if (img?.origin) {
          thumbnail = img.origin;
          break;
        } else if (img?.url) {
          thumbnail = img.url;
          break;
        }
      }
    }
  }

  // Menu items are in Menu:{placeId}_0, Menu:{placeId}_1, etc.
  const menuItems: { name: string; price: number | null; description?: string; images?: string[] }[] = [];
  for (let i = 0; i < 20; i++) {
    const menuKey = `Menu:${placeId}_${i}`;
    const menu = apolloState[menuKey];
    if (!menu) break;
    menuItems.push({
      name: menu.name || '',
      price: parsePrice(menu.price || ''),
      description: menu.description || '',
      images: menu.images || [],
    });
    if (menuItems.length >= 5) break;
  }

  return {
    id: placeId,
    name,
    category,
    menuItems,
    thumbnail,
    address,
    roadAddress,
    lat: Number(lat),
    lng: Number(lng),
    phone,
  };
}

function parsePrice(priceStr: string): number | null {
  if (!priceStr) return null;
  const numStr = priceStr.replace(/[^0-9]/g, '');
  const num = parseInt(numStr, 10);
  return isNaN(num) ? null : num;
}

// ──────────────────────────────────────────────
// Cross-reference: find Naver Place ID by name + address
// ──────────────────────────────────────────────
function getCrossRefCached(key: string): string | null | undefined {
  const entry = crossRefCache.get(key);
  if (!entry) return undefined; // not cached
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    crossRefCache.delete(key);
    return undefined;
  }
  return entry.naverId; // may be null (= "no match found")
}

function normalizeName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase();
}

async function resolveByNameAddress(name: string, address: string): Promise<string | null> {
  const cacheKey = `${name}|${address}`;
  const cached = getCrossRefCached(cacheKey);
  if (cached !== undefined) return cached;

  const query = address ? `${name} ${address}` : name;
  console.log('[place] cross-ref search:', query);

  const urls = [
    `https://map.naver.com/p/api/search/allSearch?query=${encodeURIComponent(query)}&type=all&page=1&displayCount=5&lang=ko`,
    `https://map.naver.com/v5/api/search?caller=pcweb&query=${encodeURIComponent(query)}&type=all&page=1&displayCount=5&lang=ko`,
  ];

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://map.naver.com/',
    'Origin': 'https://map.naver.com',
  };

  const normalizedTarget = normalizeName(name);

  for (const url of urls) {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) continue;

      const data = await response.json();
      const placeResult =
        data?.result?.place ||
        data?.result?.restaurant ||
        data?.result?.cafe ||
        data?.result?.food;

      if (!placeResult?.list?.length) continue;

      // Find best match by name similarity
      for (const item of placeResult.list) {
        const itemName = normalizeName(item.name || item.title || '');
        const itemId = String(item.id || item.placeId || '');
        if (!itemId || !/^\d+$/.test(itemId)) continue;

        // Check: names contain each other, or one is a substring of the other
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

      // If no substring match, accept the first result if it's a restaurant
      const firstItem = placeResult.list[0];
      const firstId = String(firstItem.id || firstItem.placeId || '');
      if (firstId && /^\d+$/.test(firstId)) {
        console.log('[place] cross-ref fallback to first result:', name, '->', firstId, `(${firstItem.name})`);
        crossRefCache.set(cacheKey, { naverId: firstId, timestamp: Date.now() });
        return firstId;
      }
    } catch (e: any) {
      console.error('[place] cross-ref search error:', e.message);
    }
  }

  // Cache the miss to avoid repeated lookups
  crossRefCache.set(cacheKey, { naverId: null, timestamp: Date.now() });
  return null;
}
