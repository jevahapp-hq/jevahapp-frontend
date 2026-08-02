# Jevah Frontend Optimization & Performance Report (Combined)

**Date:** 1 August 2026  
**Audience:** Stakeholders, product, engineering  
**Scope:** Mobile FE achievements, what we enforce, before/after speed (especially video), and the optimization lifecycle  
**Product:** Jevah mobile (`jevahapp-frontend`, Expo / React Native)  
**Status:** Client performance foundations largely shipped; device-lab p50/p95 and TikTok/IG first-frame parity still to be filled from production/device runs

This document **combines** the Optimization Lifecycle (Phases 1–6), Technical Audit, Performance Baseline, Progress Report (31 Jul), and TikTok/IG timeline into one place for the frontend — parallel to the backend combined report.

---

## 1. Executive summary

Jevah’s mobile app moved from an early **“load everything at once”** model (ScrollView-heavy feed, blocking startup, media competing for the cold-start budget, scrubber that lied or snapped to `0:00`) to a **feed-first, virtualized, contract-driven** client:

| Then | Now |
|------|-----|
| Mount many cards via ScrollView | **FlashList** window + memoized cards |
| Splash waits on downloads / library / API | **Shell first**; heavy work deferred; splash ≤ **1.8s** safety |
| Heavy tabs in the initial path | **Lazy** Library / Community / Bible |
| RN `Image`, weak caching | **expo-image** + optimize-by-default |
| Scrub invents duration from buffer → snap-to-start | **Confirmed duration** + MP4 preference + poll until seekable |
| Likes feel lost under 429 / offline | **Optimistic** heart + rollback + queue + auth gate |
| Music feels like one mixed dump | **Hard lanes**: Copyright-free ≠ Artists |
| Creators upload unclear | Artists: **intent → PUT R2 → finalize**; general media still multipart |

**Headline feel:** App shell and feed scroll are **materially faster** than the baseline architecture. Likes and comments feel **instant** on the happy path. Video **scrub** is fixed at the client contract once `duration > 0` and MP4 is preferred. Video **time-to-first-frame** and swipe parity with TikTok/IG are **not yet claimed as measured** — they depend on CDN/ABR delivery plus a filled device lab.

**Bottom line for leadership:** Mobile FE did its job on product architecture, resilience, and playback contracts. The next build wins are **measure on devices → close media delivery with backend → finish general-upload migration to R2** — not another wholesale UI rewrite.

---

## 2. The optimization lifecycle (where we are)

| Phase | Name | Goal | Our status |
|-------|------|------|------------|
| **1** | Audit & Discovery | Know screens, players, risks | **Done** (see §3–4) |
| **2** | Performance Analysis | Measure baselines | **Partial** — KPI definitions + scorecards done; device p50/p95 tables open (§8) |
| **3** | Architecture Improvement | Feed-first, deferred startup, contracts | **Largely done** (§5, §7) |
| **4** | Code Optimization | Hot-path tighten | Ongoing (prefetch, player mount gating, comment list, infinite query) |
| **5** | Testing & Validation | Prove on mid Android + iPhone | Lab checklist exists; numbers open (`DEVICE_LAB_AND_LIKES_QA.md`) |
| **6** | Production Monitoring | Marks → Sentry / product metrics | `__DEV__` perf marks + Sentry present; formal FE APM open |

```text
Audit → Measure → Architecture → Code → Validate → Monitor → (repeat)
```

**Companion to backend lifecycle:** Backend owns Contabo p50/p95, R2/faststart/duration, Redis. Frontend owns device TTFF, feed TTI, scrub UX, and adoption of those contracts.

---

## 3. What we already have (platform inventory)

| Component | What it does |
|-----------|----------------|
| **Expo 54 / RN 0.81 / React 19** | Mobile runtime; New Architecture enabled |
| **Expo Router** | File-based navigation (`app/`) |
| **Zustand** | Media, likes, downloads, library, upload, reels, playback |
| **TanStack React Query v5** | Feed fetch + stale cache (≈15–30 min) |
| **Axios `ApiClient` / `MediaApi`** | Authenticated API; `fetch` for some uploads/comments |
| **expo-video** | Primary feed / reels player |
| **expo-av** | Audio paths |
| **expo-image** | Covers / thumbnails via `SafeImage` |
| **FlashList** | Home All Content TikTok feed virtualization |
| **Socket.IO client** | Live like counts, comments presence/typing |
| **Clerk** | Auth (`@clerk/clerk-expo`) + JWT in SecureStore |
| **Sentry** | Crash / error reporting |
| **EAS** | Native builds + OTA update scripts |
| **AsyncStorage / SecureStore** | Persist caches / JWT; MMKV only in instant-on experiment |

**Important:** Pointing the phone at a flaky WAN API (or a stale LAN IP) makes seek/upload look “broken.” Measure SLOs against **production Contabo HTTPS** or a correct **LAN `:4000`** — same discipline as “don’t demo prod UX over Upstash laptop” on the backend.

### 3.1 Who this client is (and is not)

| Surface | In this repo? | Notes |
|---------|---------------|-------|
| **Jevah mobile (Expo)** | **Yes — primary** | Feed, upload, likes, comments, creators, music, library, bible, community |
| **Web via Expo** | Same codebase (`web` script) | Not a separate marketing site |
| **Web admin dashboard** | **No** | Separate product; mobile must **never** call `/api/admin/*` |
| **Marketing / sermons web** | **Not here** | Consumes public API elsewhere |

### 3.2 External vendors & endpoints (FE-facing)

Secrets stay in `.env` — never commit them. Names only:

| Vendor / product | Role for mobile | Env keys (names only) |
|------------------|-----------------|------------------------|
| **Jevah API (Contabo)** | Feed, likes, comments, upload, creators | `EXPO_PUBLIC_API_ENV`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_URL_LOCAL`, `EXPO_PUBLIC_API_URL_PRODUCTION` |
| **Cloudflare R2 / CDN** | Bytes for video/audio/images (PUT from Artists upload; GET playback) | Via API presign + public URLs (no R2 secrets on device) |
| **Clerk** | Sign-in / session | `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` |
| **Sentry** | Crash / performance breadcrumbs | `EXPO_PUBLIC_SENTRY_DSN` (+ build-time auth token for source maps) |
| **Expo / EAS** | Builds, OTA | EAS project config |
| **Google Gemini (optional)** | Device-side TTS helper only if enabled | `EXPO_PUBLIC_GEMINI_API_KEY` |
| **Prefetch kill switches** | Disable Range/audio/PDF warmup in field | `EXPO_PUBLIC_ENABLE_VIDEO_PREFETCH`, `…_AUDIO_…`, `…_PDF_…` |

**Cost / risk notes for stakeholders**

| Dependency | Scales with | Risk if down / misconfigured |
|------------|-------------|------------------------------|
| Contabo API | Every screen | App shell may paint; content empty / timeouts |
| R2 / CDN | Watch & upload bytes | Thumbnail-only cards; scrub dead; upload stalls |
| Clerk | Auth flows | Cannot like/comment/upload as user |
| Signed media URLs | TTL | FE retries via `getMediaById`; CDN stability is the real fix |
| Wrong `API_URL_LOCAL` | Dev only | “Duration missing” / timeouts misdiagnosed as product bugs |

### 3.3 Data flow (who talks to whom)

```text
  [User gestures]
        │
        ▼
  Expo shell (Router + Zustand + React Query)
        │
        ├──► Jevah API ──► Mongo / Redis / R2 (server-side)
        ├──► Socket.IO ──► live counts / comment events
        ├──► Clerk ──────► identity
        ├──► R2 (Artists) ► direct PUT with presigned URL
        └──► expo-video / expo-image / FileSystem
                 ▲
                 └── CDN URLs from API (MP4 preferred; HLS fallback)
```

**Upload lanes (important asymmetry):**

```text
GENERAL MEDIA (home upload)     CREATORS / ARTISTS
  Phone ──FormData──► API         Phone ──presign──► R2
  (can take minutes on big files) Phone ──finalize──► API (~seconds)
  then poll until seekable        then poll until playable
```

---

## 4. What we have done (achievements)

### 4.1 Startup & navigation

- Splash hides on fonts with **1.8s hard fallback** (never traps the user).
- Critical path = fonts + shell; downloads / library / warmup run **after** first interactions.
- Staggered API warmup to reduce cold-start **HTTP 429**.
- Lazy-loaded heavy tabs (Library, Community, Bible, and related routes).
- Prefetch first feed page into React Query on welcome path.

### 4.2 Feed (All Content / For You)

- **FlashList** virtualization on home media feed.
- Memoized `ContentItemRenderer` + engagement sync into interaction store.
- React Query + Zustand content cache (≈15 min TTL) for warm revisits.
- Adjacent video + comments prefetch (kill-switchable).
- Socket hygiene for content rooms on focus.
- Client For You re-rank of chronological list (dedicated ranked feed API still Phase 3 on backend).

### 4.3 Video playback (scrubber + first play)

- **expo-video** adapter for feed/reels.
- URL picker prefers progressive **`fileUrl` / `playbackUrl` (MP4)**; HLS only if no MP4; block incomplete HLS when duration unknown.
- Absolute seek only when duration ≥ ~**500ms**.
- Session **duration cache** by media id; one-shot heal via media detail.
- Loop **only** on true `playToEnd` (never treat buffer window as end).
- Post-upload **poll until** `processingStatus === "ready"` and `duration > 0`.
- Optional local **probe at pick** to seed optimistic duration.
- CDN Range warmup + concurrent player caps in performance config.
- Retry with **fresh URL** via `getMediaById` when signed URLs expire.

### 4.4 Engagement

- **Likes:** optimistic UI; Mongo-durable backend; 429 rollback + Retry-After; offline queue; guest auth gate; sockets update **counts**, not authoritative `liked` for other users.
- **Comments:** sheet opens first; memory cache paint; network merge; empty state CTA instead of infinite skeleton; hang timeout; rich composer handoffs (images/mentions).
- **Views / saves / shares:** contracts documented and wired per backend handoffs.
- Double-tap video = **play/pause** (not like) — IG/TikTok habit.

### 4.5 Gospel product surfaces (mobile)

- **Copyright-free** vs **Artists** lanes with defensive FE filters.
- Creator apply → studio → upload (R2 intent path) → manage.
- Artist profiles, play counts, deep links (`jevah://` / `jevahapp://artists/:slug`).
- Never call `/api/admin/*` from mobile.

### 4.6 Correctness / modularization

- Upload, Reels, video seek stack, comments, likes modularized for safer iteration.
- Content Actions sheet: swipe-dismiss; settle on gesture end.
- Downloads via `fileDownloadManager` + progress into library offline paths.
- Explicit FE↔BE handoff docs so teams can ship in parallel.

---

## 5. What we enforce (rules the frontend now holds)

| Rule | Why |
|------|-----|
| **Prefer MP4 over incomplete HLS for on-demand posts** | Seekable scrub; avoid `duration = 0` |
| **Absolute seek only when duration known (≥ ~500ms)** | Knob can move; seek math must not invent length |
| **Loop only on `playToEnd`** | Stops snap-to-`0:00` near buffer end |
| **Poll after upload until ready + `duration > 0`** | New posts become scrubbable without guessing |
| **Optimistic likes; sockets = counts only** | Instant UX without stealing another user’s heart state |
| **Guest: browse comments; auth before mutate** | No flicker hearts / fake writes |
| **CF shelf ≠ Artists ≠ All Content dump** | Clean Gospel product story |
| **Mobile never calls `/api/admin/*`** | Security boundary |
| **Do not publish aspirational `% faster` from scripts** | Partner claims need device lab p50/p95 |
| **Kill switches for prefetch** | Field rollback without a full OTA rewrite |

---

## 6. How much faster we are now

Numbers below are **engineering baselines / directional observations** from shipped architecture. Formal **device-lab p50/p95** = next measurement step (same honesty rule as Contabo backend tables).

### 6.1 Headline table

| What users feel | Before | Now | What changed |
|-----------------|--------|-----|--------------|
| **Cold start → splash dismiss** | Often blocked on hydration + warmup | Fonts + **≤1.8s** safety; shell first | Deferred startup |
| **Cold start → interactive shell** | Waited on downloads / library / API | Shell after fonts; rest via `InteractionManager` | Critical-path cut |
| **Home feed first cards** | Dense ScrollView mount | **FlashList** + RQ cache | Virtualization + warm cache |
| **Feed scroll** | Jank with many cards | Virtualized window + memo cards | Fewer mounts |
| **Like / unlike** | Felt lost under 429 / offline | Instant optimistic; rollback / queue | IG/TikTok engagement path |
| **Comment sheet open** | Wait on network / skeleton forever | Sheet first + memory cache; empty CTA | Cache-first UX |
| **Video scrub** | `--:--`, fake buffer duration, snap-to-start | Duration pipeline + MP4 preference | FE handoff complete |
| **Video first frame** | Variable; thumbnail stuck on bad URLs | Retry + prefetch ready; still CDN-bound | **In progress** |
| **Tab first open (heavy)** | In initial path | Lazy load (~200–400ms est. win) | Code split |
| **Startup 429 storms** | Parallel warmup | Staggered / batched | Healthier first fetch |

### 6.2 Video specifically — slower / broken before, better now

Video was the worst offender for both **waiting** and **playback trust**.

| Video concern | Before | Now | What we did differently |
|---------------|--------|-----|-------------------------|
| **Time until first playable frame** | Unpredictable; expired URL → thumb forever | expo-video + fresh-URL retry + Range prefetch | Still need CDN/ABR for TikTok-class TTFF |
| **Scrub / seek** | Buffer-as-duration → seek math wrong → reset to start | Confirmed duration SoT; seek ≥ 500ms | Honest UI over fake progress |
| **End label** | `0:00` / `--:--` / wrong | API/player/cache seconds when known | Session cache + heal/poll |
| **New upload scrub** | Guessed ready | Poll until `ready` + `duration > 0` | Matches BE worker pipeline |
| **URL choice** | HLS often incomplete | Prefer faststart MP4 | Align with BE encode |
| **Off-screen cost** | Many players / cards | Caps + Reels ±1 pattern; feed gating still to verify | Decode budget |

**Plain language:**  
- **Scrolling and tapping** feel much lighter than the early app.  
- **Scrubbing** works when length is known and MP4 is used — the client no longer invents a fake timeline.  
- **Encoding** still takes minutes in the background (expected); FE shows processing and polls.  
- **First frame on swipe** is the remaining “world-class” gap — mostly **delivery infrastructure**, with client prefetch already prepared.

### 6.3 Target bands (device healthy, Wi‑Fi mid-range)

| Class | Target (TikTok / IG-class feel for Jevah) |
|-------|-------------------------------------------|
| Cold start → usable home | ~1.5–3s |
| Feed cards (cached) | &lt; 1s |
| Feed cards (warm network) | ≤ ~2s |
| Video TTFF (active card) | ≤ ~1s Wi‑Fi; ≤ ~2s typical 4G |
| Vertical swipe UI | ≤ ~100–200ms; next video preparing |
| Music audible | ~0.5–1.5s |
| Ebook first page | ~1–2s cached/CDN |
| Sheet / modal usable | ≤ ~300ms |
| Scroll | Sustained ~60fps |

Internal tripwires already in code (`src/shared/config/performance.ts`): frame **16ms**, image warn **2s**, network warn **3s**, concurrent video / preload distance caps, scroll throttle **16ms**.

---

## 7. What we did differently (architecture)

```text
BEFORE
  Launch ──hydrate everything──► mount all feed cards ──► many players
  Scrub ──fake duration from buffer──► seek % × wrong length──► snap to 0:00
  Upload ──hope API finishes──► play without known duration

AFTER
  Launch ──shell──► FlashList window──► active card player (+ prefetch)
  Scrub ──duration from API / cache / player ≥ 500ms──► absolute seek
  Upload ──probe + finalize──► poll ready+duration──► enable seek
  Artists ──presign──► R2 PUT──► finalize──► poll playable
```

| Layer | Different approach |
|-------|-------------------|
| **Startup** | Paint shell; defer secondary stores and warmup |
| **Lists** | Virtualize (FlashList on home); memoize renderers |
| **Bytes** | CDN Range prefetch; Artists direct R2; general media still API multipart |
| **Playback** | MP4-first; duration contract; loop only on true end |
| **Truth** | Backend duration / processingStatus; FE cache accelerates, does not invent |
| **Engagement** | Optimistic UI + durable API + count-only sockets |
| **Products** | Explicit Music shelves; no admin APIs on device |

---

## 8. Performance baseline templates (Phase 2)

### 8.1 Frontend — device fill-in (FE owns)

Use `__DEV__` marks / `globalThis.__jevahDumpPerf()` after the protocol in `DEVICE_LAB_AND_LIKES_QA.md`.

| Metric | Mid Android Wi‑Fi | Mid Android 4G | iPhone Wi‑Fi | iPhone 4G | Date |
|--------|-------------------|----------------|--------------|-----------|------|
| Cold start → splash hide | TBD | TBD | TBD | TBD | |
| Cold start → first feed paint | TBD | TBD | TBD | TBD | |
| Feed scroll (qualitative FPS) | TBD | TBD | TBD | TBD | |
| Video TTFF (home) | TBD | TBD | TBD | TBD | |
| Video TTFF (Reels swipe) | TBD | TBD | TBD | TBD | |
| Music start | TBD | TBD | TBD | TBD | |
| Ebook first page | TBD | TBD | TBD | TBD | |
| Comment sheet open | TBD | TBD | TBD | TBD | |
| Like round-trip (felt) | TBD | TBD | TBD | TBD | |

**Protocol:** cold start → Home → scroll 10 cards → Reels swipe 5 → play music → open ebook → reopen ebook → dump perf.

### 8.2 Contract checks (must stay green)

| Check | Pass criteria |
|-------|----------------|
| Ready card | `duration > 0` bound to scrubber |
| Mid-clip seek | Jumps; does not reset to start |
| New upload | Poll → ready + duration → seek enabled |
| Processing | Processing UI; not treated as seekable VOD |
| Like 429 | Rollback + cooldown; recovers |
| Guest like | Login prompt; no optimistic flip |

---

## 9. Gaps & next build

| Gap | Owner |
|-----|--------|
| Device-lab p50/p95 filled (replace “directional”) | Mobile + QA |
| Video TTFF ≤1s Wi‑Fi p50 (CDN + ABR ladder) | Infra / backend + FE tune |
| Migrate **general** upload fully off API multipart → R2 staged | Mobile (+ BE already supports pattern) |
| Verify / restore player mount gating on home (`shouldMountMediaPlayer` currently always true) | Mobile |
| Comments list FlashList (feed already FlashList) | Mobile |
| `useMedia` infinite query (TODO still in hook) | Mobile |
| Dedicated ranked For You API (vs client re-rank) | Backend Phase 3 |
| Refuse / re-probe `ready` without duration | Backend |
| Formal FE dashboards (promote marks to Sentry metrics) | Mobile / Ops (Phase 6) |
| OS push notifications (not in stack today) | Product + Mobile |
| Don’t demo seek/upload against wrong LAN IP or flaky API | Everyone |

**Next build theme:** **Delivery + Truth + Measure** — prove device numbers → close playback loop with CDN → finish client R2 migration for all large uploads → monitor — not rewrite the UI architecture.

---

## 10. Overall assessment

- **Foundation:** Production-oriented mobile architecture for a Gospel social + music product (virtualized feed, deferred startup, contract-driven media).  
- **Speed:** Order-of-magnitude *feel* win on shell/feed/scroll vs early ScrollView/blocking startup; interactive likes designed instant; video seek fixed when duration + MP4 are present.  
- **Enforcement:** MP4 preference, duration gating, lane separation, optimistic engagement, no admin APIs on device.  
- **Remaining:** Measure devices, hit TTFF targets with delivery, finish multipart→R2 for general upload, polish edge cases and monitoring.

---

## 11. Related deep-dives (optional)

| Topic | Doc |
|-------|-----|
| TikTok / IG KPI timeline | [PERFORMANCE_UPDATE_AND_TIKTOK_IG_TIMELINE.md](./PERFORMANCE_UPDATE_AND_TIKTOK_IG_TIMELINE.md) |
| Progress narrative (31 Jul) | [PROGRESS_REPORT_SO_FAR_JUL31.md](./PROGRESS_REPORT_SO_FAR_JUL31.md) |
| Video scrub FE contract | [FRONTEND_VIDEO_DURATION_SEEK_HANDOFF.md](./FRONTEND_VIDEO_DURATION_SEEK_HANDOFF.md) |
| Video scrub BE contract | [BACKEND_VIDEO_DURATION_SEEK_HANDOFF.md](./BACKEND_VIDEO_DURATION_SEEK_HANDOFF.md) |
| Media CDN / HLS | [MEDIA_DELIVERY_CDN_HLS.md](./MEDIA_DELIVERY_CDN_HLS.md) |
| Video loading notes | [ALL_CONTENT_TIKTOK_VIDEO_LOADING.md](./ALL_CONTENT_TIKTOK_VIDEO_LOADING.md) |
| Comments TikTok standard | [FRONTEND_COMMENTS_TIKTOK_STANDARD.md](./FRONTEND_COMMENTS_TIKTOK_STANDARD.md) |
| Likes IG/TikTok | [FRONTEND_LIKES_INSTAGRAM_TIKTOK.md](./FRONTEND_LIKES_INSTAGRAM_TIKTOK.md) |
| Creators / Gospel music | [FRONTEND_CREATORS_GOSPEL_SPOTIFY.md](./FRONTEND_CREATORS_GOSPEL_SPOTIFY.md) |
| Device lab + likes QA | [DEVICE_LAB_AND_LIKES_QA.md](./DEVICE_LAB_AND_LIKES_QA.md) |
| Startup 429 fixes | [STARTUP_429_AND_STACK_FIXES.md](./STARTUP_429_AND_STACK_FIXES.md) |
| Lazy loading | [LAZY_LOADING_IMPLEMENTATION.md](./LAZY_LOADING_IMPLEMENTATION.md) |
| Repo structure | [STRUCTURE.md](./STRUCTURE.md) |

---

*End of combined frontend report.*
