import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { start, goal, option } = req.query;

  if (!start || !goal || typeof start !== 'string' || typeof goal !== 'string') {
    return res.status(400).json({ error: 'Missing start or goal parameter. Format: lng,lat' });
  }

  const clientId = process.env.NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'Naver API credentials not configured' });
  }

  try {
    const routeOption = typeof option === 'string' ? option : 'traoptimal';
    const url = `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${encodeURIComponent(start)}&goal=${encodeURIComponent(goal)}&option=${routeOption}`;

    const response = await fetch(url, {
      headers: {
        'x-ncp-apigw-api-key-id': clientId,
        'x-ncp-apigw-api-key': clientSecret,
        'Referer': 'https://lunch-select-two.vercel.app',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Directions API error ${response.status}: ${text}`);
    }

    const data = await response.json();

    // Extract the optimal route
    const route = data.route?.traoptimal?.[0] || data.route?.[routeOption]?.[0];

    if (!route) {
      return res.status(404).json({ error: 'No route found' });
    }

    return res.status(200).json({
      path: route.path,
      summary: {
        distance: route.summary.distance,
        duration: route.summary.duration,
        tollFare: route.summary.tollFare || 0,
        taxiFare: route.summary.taxiFare || 0,
        fuelPrice: route.summary.fuelPrice || 0,
      },
    });
  } catch (error: any) {
    console.error('Directions API error:', error.message);
    return res.status(500).json({ error: 'Failed to fetch directions', message: error.message });
  }
}
