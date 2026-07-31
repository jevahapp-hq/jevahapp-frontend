# Jevah Mobile — Progress Report (So Far)

**Document type:** Engineering + product status (shareable)  
**Product:** Jevah mobile (`jevahapp-frontend`, Expo / React Native)  
**Date:** 31 July 2026  
**Scope:** What we shipped, what we tightened, performance before → after, and what the next build should look like  

**Companion docs:**
- `PERFORMANCE_UPDATE_AND_TIKTOK_IG_TIMELINE.md` — KPI definitions + TikTok/IG timeline  
- `FRONTEND_CREATORS_GOSPEL_SPOTIFY.md` — Creators / Music architecture  
- `BACKEND_CREATORS_POLISH_GAPS.md` — Remaining creator API gaps  
- `FRONTEND_VIDEO_DURATION_SEEK_HANDOFF.md` / `BACKEND_VIDEO_DURATION_SEEK_HANDOFF.md` — Seek + duration contract  
- `FRONTEND_LIKES_INSTAGRAM_TIKTOK.md` — Like UX contract  

---

## 1. Executive summary

Over this cycle we moved Jevah from “feature fragments that almost work” to **product surfaces that behave like modern social + music apps**, with clear backend contracts where the client cannot invent truth.

**Three pillars shipped or hardened:**

| Pillar | Outcome |
|--------|---------|
| **Creators — Spotify for Gospel** | Apply → studio → upload → Artists shelf; Copyright-free never mixes with artist uploads |
| **Feed UX polish** | Content Actions swipe-dismiss, comments empty state, IG/TikTok-style likes path |
| **Video scrubber intelligence** | Duration discovery + absolute seek without snap-to-start; progressive MP4 preference; FE/BE handoffs |

**Performance:** Foundations (FlashList, deferred startup, lazy tabs, concurrent video caps) are in place and **materially better than the early ScrollView / blocking-startup architecture**. We are **not yet at TikTok/IG parity** on first-frame video and CDN delivery — that is the next-build focus, not another UI rewrite.

**Bottom line for leadership:** Mobile FE did its job on product architecture and resilience. The next build wins are mostly **media delivery + measured SLOs + closing remaining BE polish endpoints**.

---

## 2. What we have been able to achieve

### 2.1 Creators / Music (Spotify for Gospel)

**Product rule (locked):** Artist uploads never mix with Copyright-free. Music is two lanes, not a TikTok dump.

| Surface | What works |
|---------|------------|
| Profile → Apply → Pending → Hub | Creator lifecycle on mobile |
| Music → **Copyright-free** | Only `/api/audio/copyright-free*` |
| Music → **Artists** | Only `/api/music/tracks?lane=artist` |
| Artist profile | Play + `POST …/play`, deep links `jevah://` + `jevahapp://artists/:slug` |
| Studio | List, publish/delete, edit track metadata + cover UI, edit public profile UI |
| Upload | Intent → PUT → finalize; processing state until playable |
| Pagination | Artists infinite scroll |

**Key FE modules:** `app/services/creators/`, `app/services/music-catalog/`, `app/creators/*`, `app/artists/*`, `MusicLaneTabs.tsx`.

### 2.2 Engagement & feed chrome

| Area | Achievement |
|------|-------------|
| **Likes** | Optimistic heart, 429 rollback + Retry-After, offline queue flush, guest auth gate, count-only socket hygiene documented + wired |
| **Comments** | Empty state: “Be the first to comment…” instead of infinite skeleton; hang timeout so empty never looks “loading forever” |
| **Content Actions** | Swipe-down to dismiss; sheet gesture settles only on gesture end (no mid-drag snap) |
| **Feed architecture** | FlashList virtualization, memoized cards, expo-image covers, React Query caching |

### 2.3 Video duration + seek (TikTok-class scrub model)

This was the hardest reliability problem of the cycle. We iterated until the model matched how serious players behave:

| Principle | Implementation |
|-----------|----------------|
| Duration sources | Player → **session cache by media id** → backend `duration` (seconds) → local probe at pick |
| URL strategy | Prefer progressive `fileUrl` / `playbackUrl` (MP4) over incomplete HLS |
| Scrubber UX | Knob **always moves**; absolute seek only when duration ≥ ~500ms |
| Loop safety | Auto-loop **only** on `playToEnd` — never treat buffer window as “end” (that snapped seek to `0:00`) |
| Upload path | Probe duration on pick; poll/heal until `processingStatus === ready` + `duration > 0` when BE supports it |

**Why this matters:** Without a known duration, `% × duration` seek is impossible. Faking duration from buffer made the bar *look* alive but **reset playback to the start** — worse than `--:--`.

### 2.4 Documentation & contracts

We stopped shipping “hope the API matches” and wrote explicit handoffs:

- Creators corroboration + polish gaps  
- Video duration / seek (FE + BE)  
- Likes IG/TikTok frontend contract  
- Performance update + TikTok/IG timeline  

That is operational maturity: backend and mobile can work in parallel without thrash.

---

## 3. What we have been able to tighten

“Tighten” = fewer failure modes, clearer ownership, less accidental UX debt.

### 3.1 Architecture tightenings

| Before | After |
|--------|--------|
| Music could feel like one mixed feed | **Strict CF \| Artists** shelves + defensive FE filters |
| Duration sometimes invented from buffer | **Confirmed duration only** for seek math; buffer never drives loop |
| Scrub gated entirely when duration unknown | **Optimistic UI scrub** + deferred absolute seek |
| Seek snap-to-start near “end” | Loop suppress during scrub; headroom before end; `playToEnd` only |
| Content Actions fight parent gestures | Sheet owns pan; settle on END only |
| Empty comments = perpetual skeleton | Known-zero + hang timeout → real empty CTA |
| Likes blocked / flaky under 429 | Typed rate-limit error, rollback, cooldown, queue flush |
| Guest taps mutate heart then fail | Auth gate before optimistic mutate |

### 3.2 Code / module tightenings

- Video card seek stack modularized: `useVideoProgressTracker`, `useVideoCardSeek`, `expoVideoAdapter`, `durationCache`, `normalizeDuration`, heal/poll helpers  
- Creators clients isolated from admin APIs (`Never call /api/admin/*`)  
- Upload success path carries `duration` / `durationSec` into optimistic feed items  
- Deep-link scheme coverage for artist profiles  

### 3.3 Contract tightenings (FE ↔ BE)

| Contract | Tightened rule |
|----------|----------------|
| Music lanes | CF path never receives `lane=artist`; Artists never curated beds |
| Media duration | Seconds on ready media; feed always includes when ready |
| Playback URLs | Faststart MP4 preferred; VOD HLS only when complete |
| Likes | Optimistic UI; sockets update **counts**, not authoritative `liked` for other users |
| Creator profile/cover | Explicit PATCH + upload-intent endpoints (still partially outstanding on BE) |

---

## 4. Performance analysis — comprehensive

### 4.1 How to read this section

- **Baseline** = early architecture (ScrollView-heavy feed, blocking startup, limited lazy load, media competing at cold start).  
- **Current** = post FlashList / deferred startup / engagement + seek hardenings.  
- Numbers marked **estimated / directional** until Phase 0 device lab fills p50/p95. Do **not** publish aspirational script percentages as measured facts.

Canonical KPI definitions live in `PERFORMANCE_UPDATE_AND_TIKTOK_IG_TIMELINE.md` §3.

### 4.2 Scorecard — before → after → north star

| Area | Before | After (current) | TikTok / IG target | Verdict |
|------|--------|-----------------|--------------------|---------|
| Cold start → splash dismiss | Often blocked on hydration + warmup | Fonts + **1.8s splash safety**; heavy work deferred | ≤ 1.5–2.0s | **Improved** |
| Cold start → interactive shell | Waited on downloads / library / API | Shell first; `InteractionManager` defers rest | ≤ 2.0–2.5s mid-range | **Improved** |
| Home feed first content | Many cards mounted via ScrollView | **FlashList** + React Query cache | ≤ 1s cached / ≤ 2s warm net | **Improved** |
| Feed scroll FPS | Jank with large lists | Virtualized window + memoized renderer | ~60fps sustained | **Improved** |
| Images / covers | RN Image, weak caching | **expo-image** + optimize default | ≤ 500–800ms typical Wi‑Fi | **Improved** |
| Startup API storms | Parallel warmup → **HTTP 429** | Staggered warmup + smaller stats batches | No startup 429 | **Improved** |
| Video first playable frame | Variable; signed URL rot stuck on thumb | expo-video, retry-with-fresh-URL, concurrent cap | ≤ ~1s Wi‑Fi active card | **In progress** |
| Video scrub / seek | Broken / `0:00` / snap-to-start / `--:--` | Duration pipeline + optimistic scrub | Instant absolute seek once duration known | **Improved (FE); BE duration still critical** |
| Music / Artists load | Competing with full feed mount | Dedicated lanes + audio hooks; CF vs Artists isolated | ≤ 0.5–1.5s audible | **In progress** |
| Tab first open | Heavy tabs in initial path | Lazy Library / Community / Bible | ≤ 300–500ms first open | **Improved** |
| Sheet / modal feel | Abrupt closes; gesture fights | Timed close ~240ms; swipe-down Content Actions | ≤ 300ms perceived | **Improved** |
| Ebook open | Remote PDF path uneven | PdfViewer + Android local path | ≤ 1–2s first page | **Needs measurement** |

### 4.3 Qualitative performance wins (user-felt)

1. **App feels awake sooner** — splash cannot trap; shell paints before secondary stores.  
2. **Scrolling the For You feed costs less** — fewer mounted players/cards.  
3. **Likes feel instant** — optimistic UI; failures rollback instead of silent desync.  
4. **Seek no longer lies** — we trade fake progress for honest duration, then restore motion without the snap-to-0 bug.  
5. **Music product is navigable** — two clear shelves reduce cognitive + fetch waste.

### 4.4 What still burns time (honest bottlenecks)

| Bottleneck | Owner | Why it hurts |
|------------|-------|--------------|
| Missing / late `duration` on fresh uploads | **BE** (ffprobe + feed field) | Absolute seek cannot run; end label stays `--:--` until player/cache learns length |
| Incomplete HLS preferred before MP4 ready | **BE** processing + **FE** URL picker | Player duration = 0; scrub dead |
| CDN / ABR ladder not universal | **Infra / BE** | First-frame and mid-scroll stalls vs TikTok |
| Local LAN API IP drift | **Dev ops** | Timeouts misdiagnosed as “seek broken” |
| No filled p50/p95 lab table yet | **Mobile + QA** | External claims stay “directional” |

### 4.5 Engineering tripwires already in code

From `src/shared/config/performance.ts` (and related hooks):

| Signal | Threshold |
|--------|-----------|
| Frame budget | 16ms (60fps) |
| Image load warn | 2,000ms |
| Network slow warn | 3,000ms |
| Max concurrent video players | 3 |
| Preload distance | 2 items |
| Scroll throttle | 16ms |

These are **tripwires**, not a full analytics dashboard. Next build should promote a subset to Sentry / product metrics.

---

## 5. Before / after comparison (product narratives)

### 5.1 Music

| | Before | After |
|---|--------|-------|
| Mental model | “Music tab = more TikTok” | **Copyright-free \| Artists** |
| Creator path | Unclear / partial | Apply → hub → upload → manage |
| Mixing risk | High | Architecturally forbidden + FE filters |

### 5.2 Video scrubbing

| | Before | After |
|---|--------|-------|
| End time | Often `0:00` or wrong | Real length when API/player/cache knows it |
| Fake duration from buffer | Yes (looked OK, broke loop) | **Removed** as loop source |
| Snap seek to start | Common near “end” | Guarded; loop only on `playToEnd` |
| Bar frozen at `--:--` | After over-strict fix | Optimistic scrub restored; seek when duration ≥ 500ms |

### 5.3 Engagement chrome

| | Before | After |
|---|--------|-------|
| Content Actions dismiss | Awkward / incomplete gesture | Swipe-down, settle on end |
| Empty comments | Infinite skeleton | “Be the first to comment…” |
| Likes under pressure | 429 / desync / guest flicker | Rollback, queue, auth gate |

### 5.4 Startup & feed

| | Before | After |
|---|--------|-------|
| Startup work | Everything at once | Critical path only; rest deferred |
| Feed mount | Dense ScrollView | FlashList window |
| 429 at launch | Common under parallel warmup | Staggered / batched |

---

## 6. What the next build should look like

Think of the next build as **“Delivery + Truth + Measure”** — not “another mega UI rewrite.”

### 6.1 Theme

**Make media and creators feel finished on real devices**, with numbers we can defend.

### 6.2 Build goals (ordered)

#### P0 — Must ship (blocks “world-class” feel)

1. **BE duration always on ready media**  
   - Persist seconds at finalize; return on feed/detail.  
   - Faststart MP4 + VOD HLS.  
   - Mobile already consumes this; heal/poll is mitigation, not the product.

2. **Creators polish endpoints** (see `BACKEND_CREATORS_POLISH_GAPS.md`)  
   - `PATCH /api/creators/me`  
   - Avatar upload intent  
   - Track cover replace intent  
   - Confirm publish/visibility edge cases on device

3. **Phase 0 performance lab**  
   - Fill p50/p95 for: cold start, feed TTI, video first frame, music start, ebook open, tab switch.  
   - 2 mid-range Android + 1 iPhone, Wi‑Fi + 4G.  
   - Replace “estimated” cells in the scorecard with measured ones.

#### P1 — Next product quality

4. **CDN / ABR path for feed video**  
   - Edge hit rates, ladder, signed URL refresh already partially handled on FE.  
   - Target: active-card first frame ≤ 1s Wi‑Fi p50.

5. **Seek QA matrix**  
   - Fresh upload (processing → ready)  
   - Older curated with duration  
   - Offline/poor network  
   - Scrub during play / pause / near end  

6. **Likes / comments socket focus hygiene**  
   - Always join/leave content rooms on For You; count-only updates verified in production.

#### P2 — Scale & polish

7. Promote Instant-on / MMKV experiments only if lab shows clear cold-start win over current `_layout` path.  
8. Ebook open SLO + PDF CDN caching.  
9. Creators discovery (charts, related artists) — only after studio edit APIs are solid.  
10. Analytics dashboard for the tripwire metrics (not more console logs).

### 6.3 Definition of Done for next build

| Check | Pass |
|-------|------|
| Ready video in feed has `duration > 0` | Always |
| Scrub mid-clip on fresh upload after ready | Works on mid-range Android |
| CF and Artists shelves never cross-contaminate | Automated or scripted check |
| Creator can edit profile + cover without admin API | End-to-end |
| Scorecard p50 filled for startup + video first frame | Lab sheet attached |
| No startup 429 under normal warm API | Reproduced in lab |

### 6.4 What next build should *not* do

- Rewrite the feed UI from scratch  
- Reintroduce buffer-as-duration for looping  
- Mix CF music into Artists (or vice versa)  
- Claim TikTok parity without device-lab numbers  
- Expand creator social features before edit/upload reliability is boring

---

## 7. Risk register (carry into next build)

| Risk | Impact | Mitigation |
|------|--------|------------|
| BE duration still omitted on some ready rows | Seek dead / `--:--` | Handoff + heal; block release if smoke fails |
| HLS incomplete for new uploads | Duration 0 | Prefer MP4; processingStatus gate |
| Local API IP wrong in `.env` | False “everything broken” | Document current LAN IP in FE handoff |
| Over-eager FE caching of bad duration | Wrong end time | Prefer longer confirmed; never shrink aggressively from noise |
| Unmeasured perf claims in partner decks | Credibility | Phase 0 lab first |

---

## 8. One-paragraph update (paste-ready)

> Jevah mobile has completed a major reliability and product-architecture cycle: **Creators (Spotify-for-Gospel)** with strict Copyright-free vs Artists lanes; **IG/TikTok-style engagement** (optimistic likes with 429/offline handling, comments empty state, swipe-dismiss Content Actions); and a **world-class video scrub model** (confirmed duration + session cache, progressive MP4 preference, no buffer-fake loops). Performance foundations—FlashList, deferred startup, lazy tabs, concurrent player caps—are **materially better than the early architecture**, though first-frame video and CDN still trail TikTok/IG. The next build should close **backend duration + creator polish APIs**, run a **device lab for p50/p95**, and push **CDN/ABR**—not rewrite the UI.

---

## 9. Appendix — primary file map (this cycle)

| Domain | Paths |
|--------|-------|
| Creators UI | `app/creators/*`, `app/artists/*`, `app/categories/music.tsx`, `MusicLaneTabs.tsx` |
| Creators API | `app/services/creators/*`, `app/services/music-catalog/*` |
| Video seek | `VideoCard/hooks/useVideoProgressTracker.ts`, `useVideoCardSeek.ts`, `player/durationCache.ts`, `expoVideoAdapter.ts` |
| URL / duration seed | `videoUrlManager.ts`, `probeVideoDuration.ts`, upload success / poll helpers |
| Scrubber UI | `TikTokProgressBar.tsx` |
| Perf / startup | `app/_layout.tsx`, `src/shared/config/performance.ts`, FlashList feed |
| Docs | This file + handoffs listed in the header |

---

*End of progress report.*
