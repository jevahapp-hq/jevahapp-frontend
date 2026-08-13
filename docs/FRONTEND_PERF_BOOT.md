# Frontend boot performance

How cold start is supposed to feel (TikTok/IG-class), what we measure, and how to smoke-test a **release** build.

## Boot sequence (current)

1. `expo-router/entry` → [`app/_layout.tsx`](../app/_layout.tsx)
2. Lean `Sentry.init` (no replay/feedback/profiling at boot)
3. `hydrateFeedQueryCache(queryClient)` — sync MMKV → React Query first page
4. Mount provider shell immediately (fonts no longer block the tree)
5. Native splash hides on fonts ready **or** first rAF; **1.0s fail-open**
6. [`app/index.tsx`](../app/index.tsx) — returning users redirect when **backend session** exists (`TokenUtils` / `hasBackendSession`). Clerk `isSignedIn` alone does **not** grant Home.
7. Home → `AllContentTikTok` paints from seeded RQ/MMKV; network refreshes in background
8. After interactions: downloads/library hydrate, `/health` warmup, feed prefetch in parallel (heavy work deferred ~600ms)
9. `CommentModalV2` mounts sync (no lazy race); other overlays via `DeferredRootOverlays` (~400ms fail-open)

## Session model (single source of truth)

| Concern | Owner |
|---------|--------|
| API / sockets / feed auth | **Backend JWT** via [`TokenUtils`](../app/utils/tokenUtils.ts) / [`sessionAuth`](../app/utils/sessionAuth.ts) |
| OAuth identity (Google/Apple) | Clerk → exchange at `/api/auth/clerk-login` → store backend JWT |
| Email/password | Backend login only (no Clerk session required) |
| Logout | `clearBackendSession()` / `clearLocalSessionState()` **then** Clerk `signOut()` if present |

See [`docs/AUTH_SESSION.md`](./AUTH_SESSION.md).

## Multithreading note

React Native does **not** multithread the React tree. Elite feel comes from:

- Hermes + New Architecture (`newArchEnabled: true`)
- Reanimated worklets on the UI thread
- Native video decode (`expo-video`)
- Sync MMKV hydrate
- Active±1 player mount + prefetch budgets

## Perf marks

| Mark | Meaning |
|------|---------|
| `app.cold_start` | Module boot (`PERF.APP_START`) |
| `app.splash_hide` | Splash dismissed vs cold start |
| `feed.mmkv_seed` | MMKV → RQ hydrate completed |
| `feed.first_paint` | First feed paint (when instrumented) |
| `video.ttff` | Time to first video frame |

In `__DEV__`, dump summaries:

```js
globalThis.__jevahDumpPerf?.()
```

## Targets (release / mid Android)

| Metric | Target |
|--------|--------|
| Splash → first Home frame (returning, warm cache) | ~1.0–1.5s |
| Splash → first video ready (warm) | ~2s |
| Cold network | Cached shell immediate; silent refresh |
| Players | Only focused ±1 mount decode |

## Aggressive caching

- Zustand content cache → **MMKV** ([`useContentCacheStore`](../app/store/useContentCacheStore.ts))
- Write-through [`feedMmkv`](../src/shared/cache/feedMmkv.ts) on first-page set
- RQ infinite seed via [`hydrateFeedQueryCache`](../src/shared/cache/hydrateFeedQueryCache.ts)
- Media prefetch budget: **≤2 videos** (network-aware ahead); comments prefetch idle-only, focused item
- Comment open: memory → disk → silent network; known-zero from feed stats skips skeleton

## Feed render isolation (Phase 3)

- FlashList owns **all** feed rows (Most Recent + firstFour + rest + live promo) — no permanently-mounted ListHeader cards
- `drawDistance={480}`; active±1 `shouldRenderPlayer`
- Feed root does **not** subscribe to full `contentStats` / `progresses` / `comments` maps
- Per-card `useContentStats(contentId)` + `ContentItemRenderer` / `VideoCard` custom memos
- Stats helpers read `getState()` so like/save handlers stay stable
- Production logs gated: `SocketManager`, `allMediaAPI`, `videoUrlManager` (`__DEV__` only)

## Smoke checklist (preview / production-like)

1. Kill Metro; start with `npm run run-prod-bundle` or EAS preview install (not `__DEV__` Metro).
2. Cold launch signed-in user with prior feed: Home should show last session cards before spinner.
3. Open comments within ~1s of Home (deferred overlays fail-open at 400ms); cache should paint instantly when warm.
4. Scroll feed: only active±1 should keep heavy players; no multi-decode jank.
5. Switch MUSIC / HYMNS / LIVE once: Suspense flash OK; not loaded on ALL boot.
6. Header badge + Notifications screen: **one** notification socket (no dual `forceNew`).
7. Toggle Wi‑Fi: feed still paints from MMKV; reconnect refreshes.
8. Like one card: other visible cards should not re-render from stats churn.
9. Email/password login → Home without Clerk; OAuth → Clerk exchange → backend JWT → Home; logout clears all slots.

## Phase 3 status

| Item | Status |
|------|--------|
| Splash fail-open + early hide | Done |
| Returning-user boot on backend session (not Clerk-only) | Done |
| Prefetch / player window hygiene | Done |
| FlashList header virtualization | Done |
| Store selector isolation | Done |
| Log gating (socket / API / URL mgr) | Done |
| Comment open cache-first | Done |
| Unified session (TokenUtils / sessionAuth) | Done |
| Dead entry cleanup (`index.js`, FlatList helpers, instant-on) | Done |
| Backend accepts Clerk JWT directly (drop backend JWT) | Future — requires API change |
