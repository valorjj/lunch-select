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

// Haversine distance in meters
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Generate grid of sub-centers to overcome Kakao's 45-result cap
// For a 1km radius: 4 sub-cells of 600m radius each (overlapping to ensure coverage)
function generateGridCenters(lat: number, lng: number, radiusM: number): { lat: number; lng: number; radius: number }[] {
  // For small radius, single query is enough
  if (radiusM <= 500) {
    return [{ lat, lng, radius: radiusM }];
  }

  const subRadius = Math.ceil(radiusM * 0.65); // overlap ensures full coverage
  // ~0.001 degree ≈ 111m latitude, ~89m longitude at Seoul (37.5°N)
  const offsetLat = (radiusM * 0.45) / 111000;
  const offsetLng = (radiusM * 0.45) / 89000;

  // Add small random jitter to each center for variety on repeated searches
  const jitter = () => (Math.random() - 0.5) * 0.001;

  return [
    { lat: lat + offsetLat + jitter(), lng: lng + offsetLng + jitter(), radius: subRadius },
    { lat: lat + offsetLat + jitter(), lng: lng - offsetLng + jitter(), radius: subRadius },
    { lat: lat - offsetLat + jitter(), lng: lng + offsetLng + jitter(), radius: subRadius },
    { lat: lat - offsetLat + jitter(), lng: lng - offsetLng + jitter(), radius: subRadius },
  ];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = Math.min(3000, Math.max(100, parseInt(req.query.radius as string) || 1000));

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
    const excludeKeywords = ['노래방', '노래연습', '코인노래', '룸카페', 'PC방', '피씨방'];
    const excludeCategories = ['술집', '호프', '요리주점', '일본식주점', '바(BAR)'];

    const fetchAllPages = async (centerLat: number, centerLng: number, r: number) => {
      const fetchPage = async (p: number) => {
        const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=${centerLng}&y=${centerLat}&radius=${r}&sort=distance&size=15&page=${p}`;
        const response = await fetch(url, { headers: { Authorization: authHeader } });
        if (!response.ok) throw new Error(`Kakao API error ${response.status}`);
        return response.json();
      };

      const firstData = await fetchPage(1);
      const meta = firstData.meta || {};
      const pageCount = Math.min(Math.ceil((meta.pageable_count || 0) / 15), 3);
      let docs = [...(firstData.documents || [])];

      if (pageCount > 1) {
        const rest = await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, i) => fetchPage(i + 2))
        );
        for (const r of rest) docs = docs.concat(r.documents || []);
      }
      return docs;
    };

    // Grid subdivision: query multiple sub-centers in parallel
    const gridCenters = generateGridCenters(lat, lng, radius);
    const allGridResults = await Promise.all(
      gridCenters.map((c) => fetchAllPages(c.lat, c.lng, c.radius))
    );

    // Deduplicate by place ID
    const seen = new Set<string>();
    let allDocuments: any[] = [];
    for (const docs of allGridResults) {
      for (const doc of docs) {
        const id = doc.id || doc.place_name;
        if (!seen.has(id)) {
          seen.add(id);
          allDocuments.push(doc);
        }
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
      .map((item: any) => {
        const pLat = parseFloat(item.y) || 0;
        const pLng = parseFloat(item.x) || 0;
        return {
          id: item.id || '',
          name: item.place_name || '',
          category: item.category_name || '',
          address: item.address_name || '',
          roadAddress: item.road_address_name || '',
          lat: pLat,
          lng: pLng,
          phone: item.phone || '',
          // Recalculate distance from original center (not sub-center)
          distance: Math.round(haversineM(lat, lng, pLat, pLng)),
          source: 'kakao' as const,
        };
      })
      .filter((r) => r.distance <= radius) // Only keep results within the requested radius
      .sort((a, b) => a.distance - b.distance);

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
