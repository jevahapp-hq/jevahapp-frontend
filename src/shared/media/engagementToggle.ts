/**
 * Shared like/save reconcile rules.
 *
 * The like API sometimes returns the pre-toggle `liked` boolean (see
 * docs/LIKE_TOGGLE_INCONSISTENT_RESPONSE.md). Display Math.max with stale
 * feed metadata also blocks counts from decreasing. These helpers keep the
 * optimistic UI after a successful HTTP toggle and prefer a local mutation
 * over a higher stale feed number.
 */

export function pickLocalFirstCount(options: {
  cachedCount?: number;
  cacheIsFresh: boolean;
  storeCount?: number | null;
  fallbacks?: Array<number | null | undefined>;
}): number {
  if (
    options.cacheIsFresh &&
    typeof options.cachedCount === "number" &&
    Number.isFinite(options.cachedCount)
  ) {
    return Math.max(0, options.cachedCount);
  }
  if (
    typeof options.storeCount === "number" &&
    Number.isFinite(options.storeCount)
  ) {
    return Math.max(0, options.storeCount);
  }
  let highest = 0;
  for (const fallback of options.fallbacks ?? []) {
    const n = Number(fallback);
    if (Number.isFinite(n) && n > highest) highest = n;
  }
  return highest;
}

export function mergeHydratedCount(options: {
  hasActiveToggle: boolean;
  existing?: number | null;
  cached?: number;
  cacheIsFresh: boolean;
  incoming?: number | null;
}): number {
  if (
    options.hasActiveToggle &&
    typeof options.existing === "number" &&
    Number.isFinite(options.existing)
  ) {
    return Math.max(0, options.existing);
  }
  if (
    options.cacheIsFresh &&
    typeof options.cached === "number" &&
    Number.isFinite(options.cached)
  ) {
    return Math.max(0, options.cached);
  }
  if (
    typeof options.incoming === "number" &&
    Number.isFinite(options.incoming)
  ) {
    return Math.max(0, options.incoming);
  }
  const existing = Number(options.existing);
  return Number.isFinite(existing) ? Math.max(0, existing) : 0;
}

export function reconcileToggleFlag(options: {
  optimistic: boolean;
  server?: boolean | null;
}): boolean {
  if (typeof options.server !== "boolean") return options.optimistic;
  if (options.server !== options.optimistic) return options.optimistic;
  return options.server;
}

export function reconcileToggleCount(options: {
  optimisticCount: number;
  serverCount?: number | null;
  flagMismatch: boolean;
}): number {
  const optimistic = Math.max(0, Number(options.optimisticCount) || 0);
  if (options.flagMismatch) return optimistic;
  const server = Number(options.serverCount);
  if (!Number.isFinite(server)) return optimistic;
  return Math.max(0, server);
}

/** Prefer the UI seed when present so hydrate `false` cannot invert a tap. */
export function baselineToggleFlag(
  seeded: boolean | undefined,
  stored: boolean | undefined
): boolean {
  if (typeof seeded === "boolean") return seeded;
  return Boolean(stored);
}

export function baselineToggleCount(
  seeded: number | undefined,
  stored: number | undefined
): number {
  if (typeof seeded === "number" && Number.isFinite(seeded)) {
    return Math.max(0, seeded);
  }
  const n = Number(stored);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
