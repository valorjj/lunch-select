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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let placeId = typeof req.query.id === 'string' ? req.query.id : null;
  const rawUrl = typeof req.query.url === 'string' ? req.query.url : null;

  // If no direct ID, try to resolve from URL
  if (!placeId && rawUrl) {
    placeId = await resolveUrlToPlaceId(rawUrl);
  }

  if (!placeId) {
    return res.status(400).json({ error: 'Could not extract place ID from the provided URL or parameters' });
  }

  try {
    const data = await fetchPlaceData(placeId);
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

  if (!response.ok) {
    throw new Error(`Naver place fetch failed: ${response.status}`);
  }

  const html = await response.text();

  // Extract __NEXT_DATA__ JSON from the page
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s);
  if (!nextDataMatch) {
    throw new Error('Could not find __NEXT_DATA__ in page');
  }

  const nextData = JSON.parse(nextDataMatch[1]);
  const initialState = nextData?.props?.initialState;

  if (!initialState) {
    throw new Error('Could not parse initialState from __NEXT_DATA__');
  }

  // Navigate the data structure to extract place info
  const place = initialState.place?.detailPlace?.detail || initialState.place?.detailPlace;

  if (!place) {
    throw new Error('Could not find place detail in data');
  }

  // Extract basic info
  const name = place.name || place.basicInfo?.name || '';
  const category = place.category || place.basicInfo?.category || '';
  const address = place.address || place.basicInfo?.address || '';
  const roadAddress = place.roadAddress || place.basicInfo?.roadAddress || '';
  const phone = place.phone || place.basicInfo?.phone || '';
  const lat = place.y || place.basicInfo?.coordY || 0;
  const lng = place.x || place.basicInfo?.coordX || 0;

  // Extract thumbnail
  const thumbnail =
    place.thumbnail ||
    place.basicInfo?.mainPhotoUrl ||
    place.photos?.[0]?.url ||
    '';

  // Extract menu items
  const rawMenus = place.menus || place.menuInfo?.menuList || [];
  const menuItems = rawMenus.slice(0, 5).map((menu: any) => ({
    name: menu.name || menu.menuName || '',
    price: parsePrice(menu.price || menu.unitprice || menu.menuPrice || ''),
    description: menu.description || '',
    images: menu.images || [],
  }));

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
