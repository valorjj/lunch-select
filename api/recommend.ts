import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RecommendResult {
  id: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string;
  lat: number;
  lng: number;
  phone: string;
  distance: number;
  imageUrl?: string;
  source: 'kakao';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = Math.min(3000, Math.max(100, parseInt(req.query.radius as string) || 1000));
  const page = Math.max(1, parseInt(req.query.page as string) || 1);

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'lat, lng 파라미터가 필요합니다.' });
  }

  const kakaoRestKey = process.env.KAKAO_REST_API_KEY;
  const kakaoAdminKey = process.env.KAKAO_ADMIN_KEY;
  if (!kakaoRestKey && !kakaoAdminKey) {
    return res.status(500).json({ error: 'Kakao API key not configured' });
  }

  const authHeader = kakaoRestKey ? `KakaoAK ${kakaoRestKey}` : `KakaoAK ${kakaoAdminKey}`;

  try {
    // Kakao category search: FD6 = 음식점
    const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=${lng}&y=${lat}&radius=${radius}&sort=distance&size=15&page=${page}`;

    const response = await fetch(url, {
      headers: { Authorization: authHeader },
    });

    if (!response.ok) {
      throw new Error(`Kakao API error ${response.status}`);
    }

    const data = await response.json();
    const meta = data.meta || {};
    const total = meta.pageable_count || 0;
    const totalPages = Math.ceil(total / 15);

    const results: RecommendResult[] = (data.documents || []).map((item: any) => ({
      id: item.id || '',
      name: item.place_name || '',
      category: item.category_name || '',
      address: item.address_name || '',
      roadAddress: item.road_address_name || '',
      lat: parseFloat(item.y) || 0,
      lng: parseFloat(item.x) || 0,
      phone: item.phone || '',
      distance: parseInt(item.distance) || 0,
      source: 'kakao' as const,
    }));

    // Try to enrich with Naver thumbnails (non-blocking, best-effort)
    const enriched = await enrichWithThumbnails(results);

    return res.status(200).json({ results: enriched, total, page, totalPages });
  } catch (error: any) {
    console.error('Recommend API error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch recommendations', message: error.message });
  }
}

async function enrichWithThumbnails(results: RecommendResult[]): Promise<RecommendResult[]> {
  // Batch search top results on Naver GraphQL for thumbnails
  // Do max 3 concurrent lookups to keep latency low
  const toEnrich = results.slice(0, 6);

  const promises = toEnrich.map(async (r) => {
    try {
      const body = {
        operationName: 'getRestaurants',
        variables: {
          input: { query: r.name, display: 1, start: 1, deviceType: 'pcmap' },
        },
        query: `query getRestaurants($input: RestaurantListInput) {
          restaurantList(input: $input) {
            items { id name imageUrl }
          }
        }`,
      };

      const resp = await fetch('https://pcmap-api.place.naver.com/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Accept-Language': 'ko',
          'Origin': 'https://pcmap.place.naver.com',
          'Referer': 'https://pcmap.place.naver.com/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) return r;
      const data = await resp.json();
      const imageUrl = data?.data?.restaurantList?.items?.[0]?.imageUrl;
      if (imageUrl) return { ...r, imageUrl };
    } catch { /* ignore */ }
    return r;
  });

  const enrichedTop = await Promise.all(promises);
  return [...enrichedTop, ...results.slice(6)];
}
