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
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Naver Search API credentials not configured' });
  }

  try {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=comment`;

    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Naver Search API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const items: NaverSearchItem[] = data.items || [];

    const results: SearchResult[] = items.map((item) => {
      const placeId = extractPlaceId(item.link);
      const { lat, lng } = katecToWgs84(Number(item.mapx), Number(item.mapy));
      // Use place ID if available, otherwise generate ID from coordinates
      const id = placeId || `${item.mapx}_${item.mapy}`;

      return {
        id,
        name: stripHtml(item.title),
        category: item.category,
        address: item.address,
        roadAddress: item.roadAddress,
        lat,
        lng,
        phone: item.telephone,
        naverMapUrl: placeId
          ? `https://map.naver.com/p/entry/place/${placeId}`
          : `https://map.naver.com/p/search/${encodeURIComponent(stripHtml(item.title))}`,
      };
    });

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Search API error:', error.message);
    return res.status(500).json({ error: 'Failed to search places', message: error.message });
  }
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}

function extractPlaceId(link: string): string | null {
  // Naver search link format: https://pcmap.place.naver.com/restaurant/1234567890
  const match = link.match(/(?:place|restaurant)\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Convert Katec coordinates to WGS84 (lat/lng).
 * Naver Search API returns mapx/mapy as Katec (TM128) coordinates.
 */
function katecToWgs84(x: number, y: number): { lat: number; lng: number } {
  // TM128 (Katec) projection parameters
  const SR_A = 6378137.0;
  const SR_Ee = 0.00669437999019758;
  const SR_E = Math.sqrt(SR_Ee);
  const SR_Ep = SR_Ee / (1 - SR_Ee);
  const SR_X0 = 500000.0;
  const SR_Y0 = 200000.0;
  const SR_K0 = 0.9996;
  const SR_LonO = 2.21661859489671; // 127.0028902777778 degrees in radians
  const SR_LatO = 0.663225115757845; // 38.0 degrees in radians

  const dx = x - SR_X0;
  const dy = y - SR_Y0;

  const m0 = meridianArc(SR_LatO, SR_A, SR_Ee);
  const m1 = m0 + dy / SR_K0;
  const mu = m1 / (SR_A * (1 - SR_Ee / 4 - 3 * SR_Ee * SR_Ee / 64 - 5 * SR_Ee * SR_Ee * SR_Ee / 256));

  const e1 = (1 - Math.sqrt(1 - SR_Ee)) / (1 + Math.sqrt(1 - SR_Ee));
  const phi1 =
    mu +
    (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu) +
    (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu) +
    (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu) +
    (1097 * e1 * e1 * e1 * e1 / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);

  const n1 = SR_A / Math.sqrt(1 - SR_Ee * sinPhi1 * sinPhi1);
  const t1 = tanPhi1 * tanPhi1;
  const c1 = SR_Ep * cosPhi1 * cosPhi1;
  const r1 = SR_A * (1 - SR_Ee) / Math.pow(1 - SR_Ee * sinPhi1 * sinPhi1, 1.5);
  const d = dx / (n1 * SR_K0);

  const lat =
    phi1 -
    (n1 * tanPhi1 / r1) *
      (d * d / 2 -
        (5 + 3 * t1 + 10 * c1 - 4 * c1 * c1 - 9 * SR_Ep) * (d * d * d * d) / 24 +
        (61 + 90 * t1 + 298 * c1 + 45 * t1 * t1 - 252 * SR_Ep - 3 * c1 * c1) *
          (d * d * d * d * d * d) / 720);

  const lng =
    SR_LonO +
    (d -
      (1 + 2 * t1 + c1) * (d * d * d) / 6 +
      (5 - 2 * c1 + 28 * t1 - 3 * c1 * c1 + 8 * SR_Ep + 24 * t1 * t1) *
        (d * d * d * d * d) / 120) /
      cosPhi1;

  return {
    lat: (lat * 180) / Math.PI,
    lng: (lng * 180) / Math.PI,
  };
}

function meridianArc(phi: number, a: number, ee: number): number {
  return (
    a *
    ((1 - ee / 4 - 3 * ee * ee / 64 - 5 * ee * ee * ee / 256) * phi -
      (3 * ee / 8 + 3 * ee * ee / 32 + 45 * ee * ee * ee / 1024) * Math.sin(2 * phi) +
      (15 * ee * ee / 256 + 45 * ee * ee * ee / 1024) * Math.sin(4 * phi) -
      (35 * ee * ee * ee / 3072) * Math.sin(6 * phi))
  );
}
