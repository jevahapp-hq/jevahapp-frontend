export const MAX_PERSISTED_INTERACTIONS = 400;

export function trimInteractionMap<T extends { updatedAt?: number }>(
  map: Record<string, T>,
  max = MAX_PERSISTED_INTERACTIONS
): Record<string, T> {
  const keys = Object.keys(map);
  if (keys.length <= max) return map;
  const entries = Object.entries(map).sort(
    (a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0)
  );
  return Object.fromEntries(entries.slice(0, max));
}
