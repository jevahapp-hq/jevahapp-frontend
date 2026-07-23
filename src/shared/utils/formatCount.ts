/**
 * Instagram / TikTok style compact counts.
 * 999 → "999", 1500 → "1.5K", 12000 → "12K", 1_200_000 → "1.2M"
 */
export function formatCount(n: number | null | undefined): string {
  const value = Math.max(0, Math.floor(Number(n) || 0));
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const thousands = value / 1000;
    return `${thousands.toFixed(value < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  }
  const millions = value / 1_000_000;
  return `${millions.toFixed(1).replace(/\.0$/, "")}M`;
}
