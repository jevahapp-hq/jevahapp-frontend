# Frontend — Jevah Lite (2GB Android / data saver)

**Date:** 2026-08-10  
**Audience:** Mobile Expo (`jevahapp-frontend`)  
**Backend:** Contabo-safe `profile=lite` compact feeds (shipped)

Lite is **not** a second Contabo stack. Same API, leaner client + compact payloads.

| Layer | Owner | Status |
|-------|--------|--------|
| Client RAM, decode, cache, lists | Frontend (~85%) | Implemented in this app |
| Smaller JSON + playback hints | Backend (~15%) | Shipped — `?profile=lite` / `X-Jevah-Client: lite` |

Related: `FRONTEND_FOR_YOU_MUSIC_HANDOFF.md` · `FRONTEND_PERF_BOOT.md` · `AUTH_SESSION.md`

---

## Detection + Settings

Source: `src/shared/lite/liteProfile.ts`

| Mode | Behavior |
|------|----------|
| `auto` (default) | Android low-end heuristic (`expo-device` totalMemory &lt; 2.5GB when present, else API ≤28 / small screen) |
| `on` | Always Lite |
| `off` | Always full |

- Hydrated at boot: `hydrateLiteProfile()` in `app/_layout.tsx`
- Toggle: **Account → Edit profile → Lite mode / Data saver** (`EditProfileSlideOver`)
- Storage key: `jevah_lite_mode_v1`

---

## API wiring

When Lite is active:

```http
GET /api/feed/for-you?profile=lite&limit=8
GET /api/feed/music-for-you?profile=lite&lane=artist&limit=8
X-Jevah-Client: lite
```

| Call site | Behavior |
|-----------|----------|
| `feedRanker` `fetchForYou` / `fetchMusicForYou` | `getLiteRequestMeta()` → header + `profile` + limit 8 |
| `BaseApiClient.getAuthHeaders` | Adds `X-Jevah-Client: lite` |
| `getFeedPageSize()` / all-content RQ | Page size **8**, query key includes `lite\|full` |
| Artists catalog | `getLiteFeedLimit(20)` → **8** |

Chronological fallback still uses `all-content` with the Lite page size.

Per-item hints (when present):

```ts
item.lite?: { preferHls, maxVideoHeight, prefetchCount, imageMaxEdge }
```

---

## Client discipline (what we enforce)

| Area | Lite behavior |
|------|----------------|
| Video URL | Prefer `hlsUrl` / HLS `playbackUrl` when Lite or `lite.preferHls` (`videoUrlManager`) |
| Prefetch | Ahead **1**; skip PDF/audio warm; max **1** next video |
| Players | Lite: current + next only (`shouldMountLitePlayer`); full: ±1 |
| FlashList | Smaller `drawDistance` / `estimatedItemSize` via `getLiteListWindow()` |
| all-content | `profile=lite` query + `X-Jevah-Client: lite` (MediaApi + ApiClient) |
| **Disk cache** | **Aggressive**: MMKV first ~24 items, **24h** fresh / **7d** stale-while-revalidate, comments disk **7d**, posters + video heads on device |
| **RAM** | Cap RQ `maxPages` **3**, shorter RQ `gcTime` **4h**, image decode edge **≤720**, `cachePolicy=disk` |
| Events | Soft-fail queue unchanged |

**Deferred / later:** separate Lite APK flavor, hard expo-image 32–48MB native disk cap, gate live rooms / heavy editor by route.

---

## Checklist

- [x] Device heuristic + Settings toggle → `X-Jevah-Client: lite`
- [x] For You + music-for-you with `profile=lite&limit=8`
- [x] HLS preferred on Lite; unload/prefetch budget tightened
- [x] FlashList window smaller on Lite
- [x] Aggressive disk cache on Lite (MMKV 24h/7d, 24 items, posters + video heads, comments 7d)
- [x] RAM caps on Lite (`maxPages=3`, image edge ≤720, prefetch=1)
- [x] Event queue soft-fail (existing)
- [ ] Smoke on a real **2GB** Android (not only 4GB+ emulators)
- [ ] Optional: hard expo-image native disk/memory byte cap (32–48MB)
- [ ] Optional: `com.jevahapp.lite` flavor that always defaults Lite

---

## Smoke

1. Settings → turn **Lite mode** on → pull For You; network tab shows `profile=lite`, `limit=8`, header `X-Jevah-Client: lite`.
2. Response `data.profile === "lite"` when backend applies compact shaping.
3. Scroll feed: only current (±1) video surfaces; no multi-video preload storm.
4. Artists lane: pages of 8 when personalized.
5. Toggle off → full limits resume; RQ `all-content` refreshes.
