/**
 * Warm Home destinations so Community / Library / Live / Hymns / Music
 * paint on tap. Expo Go compiles lazy chunks on first import — start that
 * work during ALL, not on click.
 */

let modulesWarmed = false;

const TAB_MODULE_LOADERS = [
  () => import("../screens/CommunityScreen"),
  () => import("../screens/library/LibraryScreen"),
  () => import("../screens/library/AllLibrary"),
  () => import("../categories/music"),
  () => import("../categories/hymns"),
  () => import("../categories/LiveComponent"),
  () => import("../../assets/hymns.json"),
] as const;

export function homeTabModuleLoaderCount(): number {
  return TAB_MODULE_LOADERS.length;
}

/** Fire-and-forget: compile tab graphs as soon as the shell is up. */
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
