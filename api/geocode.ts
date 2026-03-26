import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  // Use Naver Search API (Local) instead of NCP Geocoding API
  // NCP Geocoding requires a paid subscription; Search API is free (25k/day)
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Naver Search API credentials not configured' });
  }

  try {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=1&sort=comment`;

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

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const first = data.items[0];
    const { lat, lng } = naverCoordToWgs84(Number(first.mapx), Number(first.mapy));

    return res.status(200).json({
      lat,
      lng,
      roadAddress: first.roadAddress || '',
      jibunAddress: first.address || '',
    });
  } catch (error: any) {
    console.error('Geocoding API error:', error.message);
    return res.status(500).json({ error: 'Failed to geocode address', message: error.message });
  }
}

/**
 * Convert Naver Search API mapx/mapy to WGS84 (lat/lng).
 * Values are WGS84 coordinates scaled by a power of 10.
 * Korea ranges: lat 33-43, lng 124-132
 */
function naverCoordToWgs84(mapx: number, mapy: number): { lat: number; lng: number } {
  let lng = mapx;
  let lat = mapy;

  while (lng > 200) lng /= 10;
  while (lat > 100) lat /= 10;

  return { lat, lng };
}
