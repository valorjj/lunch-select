import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Simple health check — also tests fetching from Naver
  const placeId = typeof req.query.test === 'string' ? req.query.test : null;

  if (!placeId) {
    return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  try {
    const url = `https://pcmap.place.naver.com/restaurant/${placeId}/home`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });
    const html = await response.text();
    const hasApollo = html.includes('__APOLLO_STATE__');
    const hasNextData = html.includes('__NEXT_DATA__');

    return res.status(200).json({
      status: 'ok',
      naverFetch: {
        httpStatus: response.status,
        htmlLength: html.length,
        hasApolloState: hasApollo,
        hasNextData: hasNextData,
        htmlPreview: html.substring(0, 300),
      },
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'error',
      error: err.message,
    });
  }
}
