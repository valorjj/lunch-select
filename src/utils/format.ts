export function formatPrice(price: number | null): string {
  if (price === null) return '-';
  return new Intl.NumberFormat('ko-KR').format(price) + '원';
}
