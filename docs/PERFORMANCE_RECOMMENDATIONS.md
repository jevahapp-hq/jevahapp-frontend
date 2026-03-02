# Performance & Loading Time Recommendations

Assessment of the Jevahapp Expo/React Native codebase with concrete changes to boost performance and improve loading times.

---

## Implemented (best practices)

| Item | Status |
|------|--------|
| Virtualize main feed (FlatList in AllContentTikTok) | Done |
| Memoize ContentItemRenderer with item-specific comparison (fixes VirtualizedList "slow to update") | Done |
| expo-image in SafeImage + optimize=true by default for remote URIs | Done |
| Defer non-critical init in `_layout.tsx` (critical path = persisted media only) | Done |
| Lazy-load HomeTabContent (and all tabs) in HomeScreen | Done |
| Splash: `preventAutoHideAsync` + `hideAsync` when fonts + critical init ready | Done |

---

## Executive Summary

| Area | Current state | Impact if improved |
|------|----------------|---------------------|
| **Main feed list** | `ScrollView` + `.map()` — all items rendered at once | **High** — Virtualize with FlatList |
| **Images** | Mostly RN `Image`; SafeImage has `optimize` off by default | **High** — Use expo-image + enable optimization |
| **Lazy loading** | Only 4 tabs use lazy screens; HomeTabContent and others eager | **Medium** — Extend lazy imports |
| **Initial load** | Fonts + 4 store hydrations + preload + warmup r 
| **React Query** | Good (15min stale, refetchOnMount: false) | Already solid |
| **Content cache** | Welcome screen warms cache; useMedia uses React Query | Already solid |

---

## 1. Virtualize the main content feed (high impact)

**File:** `src/features/media/AllContentTikTok.tsx`

**Issue:** The feed uses a `ScrollView` and renders every item with `firstFour.map()`, `nextFour.map()`, and `rest.map()`. With 50 items from the API, all cards (video, music, ebook) mount at once, which:

- Increases initial render time
- Uses more memory
- Can cause jank when scrolling

**Recommendation:** Replace the main list with a single **FlatList** (or a structure that uses FlatList for the “rest” section). You already have `VirtualizedContentList` and `ContentList` in the codebase — reuse or adapt that pattern so only visible items (plus a small buffer) are rendered.

**Expected gain:** Faster time-to-interactive on the home feed, smoother scrolling, lower memory.

---

## 2. Use expo-image and enable image optimization (high impact)

**Current:** Many components use `Image` from `react-native`. Only a few use `expo-image`. `SafeImage` has an `optimize` prop that defaults to `false`.

**Recommendation:**

- Use **expo-image** (`expo-image`) for remote images: it provides disk/memory caching and better loading behavior.
- In **SafeImage**, set `optimize={true}` by default for remote URLs (or introduce a size prop and enable when container size is known).
- Where you control the list (e.g. cards), pass `containerWidth`/`containerHeight` so `optimizeImageUrl` can request appropriately sized images (you already have `imageOptimizer.ts`).

**Expected gain:** Faster image load, less data, fewer reflows.

---

## 3. Expand lazy loading for screens (medium impact)

**Current:** `app/utils/lazyImports.tsx` lazy-loads Library, AllLibrary, VideoComponent, Upload, Reels, Community, Bible. Only **HomeScreen** and **LibraryScreen** use these; other routes likely import screens directly.

**Recommendation:**

- Lazy-load **HomeTabContent** (or the heavy sub-routes it uses) so the initial JS bundle doesn’t pull in AllContentTikTok, Music, Hymns, LiveComponent, etc. until the user opens Home.
- Add lazy wrappers for other heavy screens (e.g. Profile, Downloads, Search, GoLive, Reader/PdfViewer) and use them in the router or tab navigator.
- Ensure **Reelsviewscroll** and **PdfViewer** are only loaded when their routes are opened (dynamic import).

**Expected gain:** Smaller initial bundle and faster first paint.

---

## 4. Defer non-critical startup work (medium impact)

**File:** `app/_layout.tsx`

**Current:** After fonts load, the app runs in sequence: `loadPersistedMedia()` → `loadDownloadedItems()` → `loadSavedItems()` → `PerformanceOptimizer.preloadCriticalData()` → `warmupBackend()`. The UI waits for all of this before rendering.

**Recommendation:**

- Show the app shell (e.g. Slot) as soon as fonts are loaded; mark “isInitialized” true after the first one or two critical steps (e.g. loadPersistedMedia for current playback).
- Run the rest (downloads, library, preload, warmup) in the background with `InteractionManager.runAfterInteractions()` or after a short timeout so the user can see content sooner.
- Keep **warmupBackend** non-blocking (already fire-and-forget); consider starting it earlier (e.g. in parallel with font loading) so the backend is warm by the time the user hits an API.

**Expected gain:** Faster perceived load; user sees content while the rest hydrates.

---

## 5. Metro and bundle (lower impact, still useful)

**File:** `metro.config.js`

**Recommendation:**

- Ensure **minify** is enabled for production (Expo default).
- If you have very large dependencies (e.g. moment, lodash), replace with lighter alternatives (date-fns, lodash-es or single imports) to reduce bundle size and parse time.

---

## 6. Splash screen (UX win)

**Recommendation:** Use **expo-splash-screen** to keep the native splash visible until:

- Fonts are loaded, and
- Either the first screen has rendered or the content cache/React Query has provided initial data (e.g. home feed).

Then call `SplashScreen.hideAsync()`. This avoids a blank or loading screen and makes the app feel faster.

---

## 7. React Query and cache (already in good shape)

- **staleTime: 15–30 min** and **refetchOnMount: false** are good for “instant” tab switches and fewer requests.
- Welcome screen **warm cache** (getAllContentPublic + getDefaultContent) is good; home can show cached data immediately.
- **useMedia** enrichment has a 10s timeout and fallback — keep it to avoid blocking the feed.

---

## Implementation priority

1. **Virtualize main feed** (FlatList for AllContentTikTok) — biggest win for feed load and scroll.
2. **expo-image + SafeImage optimize default** — faster, lighter images across the app.
3. **Defer non-critical init** in `_layout.tsx` — faster time to first content.
4. **Extend lazy loading** for Home tab and other heavy screens — smaller initial bundle.
5. **Splash screen** until first content — better perceived performance.

If you want, we can implement (1) and (2) first and then iterate on (3)–(5).
