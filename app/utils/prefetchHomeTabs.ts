/**
 * Warm Home destinations after first paint so Community / Library / Live /
 * Hymns / Music / Bible compile off the ALL-feed critical path.
 */

let modulesWarmed = false;

const TAB_MODULE_LOADERS = [
  () => import("../screens/CommunityScreen"),
  () => import("../screens/library/LibraryScreen"),
  () => import("../screens/library/AllLibrary"),
  () => import("../screens/BibleScreen"),
  () => import("../categories/music"),
  () => import("../categories/hymns"),
  () => import("../categories/LiveComponent"),
] as const;

export function homeTabModuleLoaderCount(): number {
  return TAB_MODULE_LOADERS.length;
}

/** Fire-and-forget: compile tab graphs after Home has painted. */
export function prefetchHomeTabModules(): void {
  if (modulesWarmed) return;
  modulesWarmed = true;
  for (const load of TAB_MODULE_LOADERS) {
    void load().catch(() => {
      modulesWarmed = false;
    });
  }
}

export function prefetchHomeTabModulesPromise(): Promise<void> {
  prefetchHomeTabModules();
  return Promise.all(TAB_MODULE_LOADERS.map((load) => load().catch(() => {})))
    .then(() => undefined);
}

export function resetPrefetchHomeTabsForTests(): void {
  modulesWarmed = false;
}
