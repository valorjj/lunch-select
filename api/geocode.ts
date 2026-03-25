import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter' });
  }

  const clientId = process.env.NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Naver API credentials not configured' });
  }

  try {
    const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        'x-ncp-apigw-api-key-id': clientId,
        'x-ncp-apigw-api-key': clientSecret,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Geocoding API error ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (!data.addresses || data.addresses.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    const first = data.addresses[0];
    return res.status(200).json({
      lat: parseFloat(first.y),
      lng: parseFloat(first.x),
      roadAddress: first.roadAddress || '',
      jibunAddress: first.jibunAddress || '',
    });
  } catch (error: any) {
    console.error('Geocoding API error:', error.message);
    return res.status(500).json({ error: 'Failed to geocode address', message: error.message });
  }
}
