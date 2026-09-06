export function hasForYouItems(page: {
  media?: unknown[];
  items?: unknown[];
} | null): boolean {
  if (!page) return false;
  return Boolean(page.media?.length || page.items?.length);
}

/**
 * Prefer server For You when it has items; otherwise chronological.
 * Chronological is never chosen first while For You is enabled.
 */
export function chooseAllContentPage<
  T extends { media?: unknown[]; items?: unknown[] },
>(
  tryForYou: boolean,
  forYou: T | null,
  chronological: T | null
): T | null {
  if (tryForYou && hasForYouItems(forYou)) return forYou;
  return chronological ?? (tryForYou ? forYou : null);
}
