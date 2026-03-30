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

// Shift coordinates by a random offset (50~150m) to get different results each search
function jitterCoords(lat: number, lng: number): { lat: number; lng: number } {
  // ~0.001 degree ≈ 111m at Seoul's latitude
  const offsetLat = (Math.random() - 0.5) * 0.003; // ±150m
  const offsetLng = (Math.random() - 0.5) * 0.003;
  return { lat: lat + offsetLat, lng: lng + offsetLng };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawLat = parseFloat(req.query.lat as string);
  const rawLng = parseFloat(req.query.lng as string);
  const radius = Math.min(3000, Math.max(100, parseInt(req.query.radius as string) || 1000));

  if (isNaN(rawLat) || isNaN(rawLng)) {
    return res.status(400).json({ error: 'lat, lng 파라미터가 필요합니다.' });
  }

  // Jitter coordinates slightly for variety on repeated searches
  const { lat, lng } = jitterCoords(rawLat, rawLng);

  const kakaoRestKey = process.env.KAKAO_REST_API_KEY;
  const kakaoAdminKey = process.env.KAKAO_ADMIN_KEY;
  if (!kakaoRestKey && !kakaoAdminKey) {
    return res.status(500).json({ error: 'Kakao API key not configured' });
  }

  const authHeader = kakaoRestKey ? `KakaoAK ${kakaoRestKey}` : `KakaoAK ${kakaoAdminKey}`;

  try {
    const excludeKeywords = ['노래방', '노래연습', '코인노래', '룸카페', 'PC방', '피씨방'];
    const excludeCategories = ['술집', '호프', '요리주점', '일본식주점', '바(BAR)'];

    const fetchPage = async (p: number) => {
      const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=${lng}&y=${lat}&radius=${radius}&sort=distance&size=15&page=${p}`;
      const response = await fetch(url, { headers: { Authorization: authHeader } });
      if (!response.ok) throw new Error(`Kakao API error ${response.status}`);
      return response.json();
    };

    // Fetch page 1 first to get total count
    const firstData = await fetchPage(1);
    const meta = firstData.meta || {};
    const total = meta.pageable_count || 0;
    const totalPages = Math.min(Math.ceil(total / 15), 3); // Kakao caps at 45 results

    // Fetch remaining pages in parallel
    let allDocuments = [...(firstData.documents || [])];
    if (totalPages > 1) {
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      const pageResults = await Promise.all(remainingPages.map(fetchPage));
      for (const pr of pageResults) {
        allDocuments = allDocuments.concat(pr.documents || []);
      }
    }

    // Filter out non-restaurant places
    const results: RecommendResult[] = allDocuments
      .filter((item: any) => {
        const name = item.place_name || '';
        const cat = item.category_name || '';
        if (excludeKeywords.some((kw) => name.includes(kw))) return false;
        if (excludeCategories.some((ec) => cat.includes(ec))) return false;
        return true;
      })
      .map((item: any) => ({
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

    // Enrich with thumbnails (best-effort)
    const enriched = await enrichWithThumbnails(results);

    return res.status(200).json({ results: enriched, total: enriched.length });
  } catch (error: any) {
    console.error('Recommend API error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch recommendations', message: error.message });
  }
}

async function enrichWithThumbnails(results: RecommendResult[]): Promise<RecommendResult[]> {
  // Enrich all results with thumbnails in parallel
  const promises = results.map(async (r) => {
    // Try Kakao Place og:image first (exact match by ID), then Naver GraphQL
    const imageUrl = await fetchKakaoOgImage(r.id) || await fetchNaverImageUrl(r);
    return imageUrl ? { ...r, imageUrl } : r;
  });

  return Promise.all(promises);
}

async function fetchKakaoOgImage(kakaoId: string): Promise<string | null> {
  try {
    const resp = await fetch(`https://place.map.kakao.com/${kakaoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    // Extract og:image meta tag
    const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    if (match?.[1] && !match[1].includes('kakaomapapi')) {
      return match[1];
    }
  } catch { /* ignore */ }
  return null;
}

async function fetchNaverImageUrl(r: RecommendResult): Promise<string | null> {
  try {
    // Extract dong name from address for better accuracy
    const dongMatch = r.address.match(/(\S+동)\b/);
    const query = dongMatch ? `${r.name} ${dongMatch[1]}` : r.name;

    const body = {
      operationName: 'getRestaurants',
      variables: {
        input: { query, display: 1, start: 1, deviceType: 'pcmap' },
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

    if (!resp.ok) return null;
    const data = await resp.json();
    return data?.data?.restaurantList?.items?.[0]?.imageUrl || null;
  } catch { /* ignore */ }
  return null;
}
