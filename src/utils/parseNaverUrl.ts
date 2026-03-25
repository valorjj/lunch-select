export function extractPlaceId(url: string): string | null {
  const trimmed = url.trim();

  // Pattern: /place/1234567890
  const placeMatch = trimmed.match(/place\/(\d+)/);
  if (placeMatch) {
    return placeMatch[1];
  }

  // Pattern: /restaurant/1234567890
  const restaurantMatch = trimmed.match(/restaurant\/(\d+)/);
  if (restaurantMatch) {
    return restaurantMatch[1];
  }

  return null;
}

export function isNaverMapUrl(url: string): boolean {
  const trimmed = url.trim();
  return (
    trimmed.includes('map.naver.com') ||
    trimmed.includes('naver.me') ||
    trimmed.includes('pcmap.place.naver.com')
  );
}
