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
  source: 'tmap' | 'kakao';
}

const TMAP_APP_KEY = process.env.TMAP_APP_KEY || '';

const EXCLUDE_NAMES = ['주차장', '정문', '후문', '노래방', '노래연습', '코인노래', '룸카페', 'PC방', '피씨방'];
const EXCLUDE_CATEGORIES = ['술집', '호프', '요리주점', '일본식주점', '바(BAR)', '주차'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  const radius = Math.min(3000, Math.max(100, parseInt(req.query.radius as string) || 1000));
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const count = Math.min(150, Math.max(1, parseInt(req.query.count as string) || 100));

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'lat, lng 파라미터가 필요합니다.' });
  }

  try {
    // Try T Map first (up to 150 results per page, thousands total)
    if (TMAP_APP_KEY) {
      const result = await fetchFromTmap(lat, lng, radius, page, count);
      if (result) {
        const enriched = await enrichWithThumbnails(result.results);
        return res.status(200).json({ results: enriched, total: result.total });
      }
    }

    // Fallback: Kakao grid subdivision
    const kakaoResult = await fetchFromKakao(lat, lng, radius);
    const enriched = await enrichWithThumbnails(kakaoResult);
    return res.status(200).json({ results: enriched, total: enriched.length });
  } catch (error: any) {
    console.error('Recommend API error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch recommendations', message: error.message });
  }
}

// ──────────────────────────────────────────────
// T Map POI Search (primary — up to thousands of results)
// ──────────────────────────────────────────────
async function fetchFromTmap(
  lat: number, lng: number, radiusM: number, page: number, count: number,
): Promise<{ results: RecommendResult[]; total: number } | null> {
  try {
    const radiusKm = Math.max(1, Math.round(radiusM / 1000));
    const url = `https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent('음식점')}&searchType=all&page=${page}&count=${count}&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&searchtypCd=R&centerLat=${lat}&centerLon=${lng}&radius=${radiusKm}&poiGroupYn=Y&multiPoint=N`;

    const response = await fetch(url, {
      headers: { Accept: 'application/json', appKey: TMAP_APP_KEY },
    });

    if (!response.ok) {
      console.error('[recommend] T Map error:', response.status);
      return null;
    }

    const data = await response.json();
    const info = data?.searchPoiInfo;
    if (!info?.pois?.poi) return null;

    const total = parseInt(info.totalCount) || 0;
    const pois: any[] = info.pois.poi;

    const results: RecommendResult[] = pois
      .filter((poi: any) => {
        const name = poi.name || '';
        const mid = poi.middleBizName || '';
        const low = poi.lowerBizName || '';
        // Must be a restaurant
        if (mid !== '음식점') return false;
        // Exclude by name
        if (EXCLUDE_NAMES.some((kw) => name.includes(kw))) return false;
        // Exclude by category
        if (EXCLUDE_CATEGORIES.some((ec) => low.includes(ec))) return false;
        return true;
      })
      .map((poi: any) => {
        const pLat = parseFloat(poi.frontLat || poi.noorLat) || 0;
        const pLng = parseFloat(poi.frontLon || poi.noorLon) || 0;
        const dist = poi.radius ? Math.round(parseFloat(poi.radius) * 1000) : 0;

        // Build category string
        const lower = poi.lowerBizName || '';
        const detail = poi.detailBizName || '';
        const category = detail ? `음식점 > ${lower} > ${detail}` : lower ? `음식점 > ${lower}` : '음식점';

        // Build road address
        const newAddr = poi.newAddressList?.newAddress?.[0];
        const roadAddress = newAddr?.fullAddressRoad || '';
        const address = [poi.upperAddrName, poi.middleAddrName, poi.lowerAddrName, poi.roadName, poi.firstBuildNo]
          .filter(Boolean).join(' ');

        return {
          id: poi.pkey || poi.id || '',
          name: (poi.name || '').replace(/\[.*?\]/g, '').trim(), // Remove [중식] suffix
          category,
          address,
          roadAddress,
          lat: pLat,
          lng: pLng,
          phone: poi.telNo || '',
          distance: dist,
          source: 'tmap' as const,
        };
      });

    // Deduplicate by name + address (T Map can have duplicate POIs)
    const seen = new Set<string>();
    const deduped = results.filter((r) => {
      const key = `${r.name}|${r.address}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return { results: deduped, total };
  } catch (e: any) {
    console.error('[recommend] T Map fetch error:', e.message);
    return null;
  }
}

// ──────────────────────────────────────────────
// Kakao grid subdivision (fallback — up to ~180 results)
// ──────────────────────────────────────────────
function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchFromKakao(lat: number, lng: number, radiusM: number): Promise<RecommendResult[]> {
  const kakaoRestKey = process.env.KAKAO_REST_API_KEY;
  const kakaoAdminKey = process.env.KAKAO_ADMIN_KEY;
  if (!kakaoRestKey && !kakaoAdminKey) return [];

  const authHeader = kakaoRestKey ? `KakaoAK ${kakaoRestKey}` : `KakaoAK ${kakaoAdminKey}`;

  const fetchAllPages = async (cLat: number, cLng: number, r: number) => {
    const fetchPage = async (p: number) => {
      const url = `https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&x=${cLng}&y=${cLat}&radius=${r}&sort=distance&size=15&page=${p}`;
      const response = await fetch(url, { headers: { Authorization: authHeader } });
      if (!response.ok) return [];
      const data = await response.json();
      return data.documents || [];
    };

    const first = await fetchPage(1);
    const docs = [...first];
    // Fetch pages 2-3 if there are more
    if (first.length >= 15) {
      const [p2, p3] = await Promise.all([fetchPage(2), fetchPage(3)]);
      docs.push(...p2, ...p3);
    }
    return docs;
  };

  // Grid subdivision for larger radius
  const subRadius = radiusM <= 500 ? radiusM : Math.ceil(radiusM * 0.65);
  const offset = radiusM <= 500 ? 0 : radiusM * 0.45;
  const offLat = offset / 111000;
  const offLng = offset / 89000;
  const jitter = () => (Math.random() - 0.5) * 0.001;

  const centers = radiusM <= 500
    ? [{ lat, lng }]
    : [
        { lat: lat + offLat + jitter(), lng: lng + offLng + jitter() },
        { lat: lat + offLat + jitter(), lng: lng - offLng + jitter() },
        { lat: lat - offLat + jitter(), lng: lng + offLng + jitter() },
        { lat: lat - offLat + jitter(), lng: lng - offLng + jitter() },
      ];

  const allGridResults = await Promise.all(
    centers.map((c) => fetchAllPages(c.lat, c.lng, subRadius))
  );

  const seen = new Set<string>();
  const allDocs: any[] = [];
  for (const docs of allGridResults) {
    for (const doc of docs) {
      if (!seen.has(doc.id)) {
        seen.add(doc.id);
        allDocs.push(doc);
      }
    }
  }

  return allDocs
    .filter((item: any) => {
      const name = item.place_name || '';
      const cat = item.category_name || '';
      if (EXCLUDE_NAMES.some((kw) => name.includes(kw))) return false;
      if (EXCLUDE_CATEGORIES.some((ec) => cat.includes(ec))) return false;
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
        distance: Math.round(haversineM(lat, lng, pLat, pLng)),
        source: 'kakao' as const,
      };
    })
    .filter((r) => r.distance <= radiusM)
    .sort((a, b) => a.distance - b.distance);
}

// ──────────────────────────────────────────────
// Thumbnail enrichment (Kakao og:image + Naver GraphQL)
// ──────────────────────────────────────────────
async function enrichWithThumbnails(results: RecommendResult[]): Promise<RecommendResult[]> {
  // Only enrich first 30 to keep response time reasonable
  const toEnrich = results.slice(0, 30);
  const rest = results.slice(30);

  const enriched = await Promise.all(
    toEnrich.map(async (r) => {
      const imageUrl = (r.source === 'kakao' ? await fetchKakaoOgImage(r.id) : null)
        || await fetchNaverImageUrl(r);
      return imageUrl ? { ...r, imageUrl } : r;
    })
  );

  return [...enriched, ...rest];
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
    const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    if (match?.[1] && !match[1].includes('kakaomapapi')) return match[1];
  } catch { /* ignore */ }
  return null;
}

async function fetchNaverImageUrl(r: RecommendResult): Promise<string | null> {
  try {
    const dongMatch = r.address.match(/(\S+동)\b/);
    const query = dongMatch ? `${r.name} ${dongMatch[1]}` : r.name;

    const body = {
      operationName: 'getRestaurants',
      variables: { input: { query, display: 1, start: 1, deviceType: 'pcmap' } },
      query: `query getRestaurants($input: RestaurantListInput) {
        restaurantList(input: $input) { items { id name imageUrl } }
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
