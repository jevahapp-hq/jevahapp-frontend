# Jevah Performance Update — Media Speed, Startup & Path to TikTok / Instagram Standards

**Document type:** Stakeholder / leadership update  
**Product:** Jevah mobile app (Expo / React Native)  
**Date:** July 20, 2026  
**Audience:** Product, engineering, and partners who need a clear view of how fast the app feels today, what has improved, and when we reach TikTok / Instagram-class responsiveness  
**Related docs:** `PERFORMANCE_RECOMMENDATIONS.md`, `LAZY_LOADING_IMPLEMENTATION.md`, `ALL_CONTENT_TIKTOK_VIDEO_LOADING.md`, `BACKEND_ENGAGEMENT_TIKTOK_IG_ALIGNMENT.md`, `STARTUP_429_AND_STACK_FIXES.md`

---

## 1. Executive summary

Jevah has moved from an early “load everything at once” architecture to a **feed-first, virtualized, deferred-startup** model. The largest user-facing gains so far are:

- Faster **app shell** visibility (splash no longer waits on downloads / library / API warmup).
- Faster **home feed** interaction through FlashList virtualization, memoized cards, and image optimization.
- Smarter **media startup** — videos, music, and ebooks no longer all compete for the same cold-start budget.
- Cleaner **startup networking** so rate limits (HTTP 429) do not cascade into stalled feeds.

We are **not yet at TikTok / Instagram parity** on every metric. Those products set the bar for sub-second feed readiness, near-instant vertical transitions, and CDN-backed first-frame media. This document defines:

1. What we measure  
2. Where we are today vs that bar  
3. What already shipped  
4. A phased timeline to close the gap  

**Bottom line:** Frontend performance foundations are largely in place. The remaining path to TikTok / IG feel is a mix of **measured instrumentation**, **CDN / adaptive media delivery**, and **backend feed + cache latency** — not another wholesale UI rewrite.

---

## 2. What “TikTok / Instagram standard” means for Jevah

We use external-class products as a **feel target**, not as a claim that we already match them. For our media product, that standard means:

| Experience | TikTok / IG-class feel | Why it matters for Jevah |
|---|---|---|
| Cold start → usable home | Splash → content in ~1.5–3s on mid-range devices | First impression; retention |
| Feed list ready | First cards visible < 1s after shell (cache or warm API) | Users scroll before they wait |
| Video first playable frame | ≤ ~1s on Wi‑Fi; ≤ ~2s on typical 4G for the active card | “Does it play?” is the product |
| Vertical swipe / card change | ≤ ~100–200ms UI transition; next video already preparing | Reels / For You habit loop |
| Music / audio start | Audible within ~500ms–1.5s after tap | Sermons, hymns, copyright-free |
| Ebook open | First page readable within ~1–2s for cached / CDN PDFs | Reader trust |
| Scroll FPS | Sustained ~60fps on mid-range phones | Premium feel |
| Tab / screen change | Instant for already-visited tabs; ≤ ~300–500ms first open with lazy load | App navigation |

These are **product targets**. Actual TikTok / IG numbers vary by device, region, and CDN. We treat them as the north-star band for Jevah’s roadmap.

---

## 3. Metrics we measure (canonical KPI set)

Use this table as the shared language for every performance update.

### 3.1 App startup

| KPI | Definition | How to measure |
|---|---|---|
| **Cold start → splash dismiss** | Process launch until native splash hides | Device stopwatch + Metro / Sentry marks; splash fallback is 1.8s max |
| **Cold start → first interactive shell** | Splash dismiss until tabs / home shell respond to touch | Manual + `performance.now` marks in `_layout.tsx` |
| **Cold start → first feed content** | Shell until first video / music / ebook card is painted | Stopwatch on device; React Query cache hit vs miss |
| **Warm start** | App resume from background to interactive | Same markers after backgrounding ≥ 30s |

### 3.2 Page / screen load

| KPI | Definition | Surfaces |
|---|---|---|
| **Home feed TTI** | Time until FlashList shows first meaningful cards | AllContentTikTok |
| **Library load** | Time until saved items list paints | Library / AllLibrary |
| **Reels open** | Route open → first reel player ready | Reelsviewscroll |
| **Profile / search / upload first paint** | Route open → usable UI | Respective screens |
| **Tab switch (warm)** | Already-mounted or cached tab becomes interactive | Home ↔ Library ↔ Community ↔ Bible |

### 3.3 Screen transition speed

| KPI | Definition | Target band |
|---|---|---|
| **Navigator transition** | Push / pop / tab animation duration | Prefer ≤ 300ms; native driver where possible |
| **Bottom sheet open / close** | Content action sheet spring / timed close | Open spring; close ~240ms |
| **Modal first paint** | Action / comment / share sheet usable | ≤ 300ms after gesture |

### 3.4 Media load times

| KPI | Definition | Media type |
|---|---|---|
| **Video load time** | Request → player reports loaded / first frame | Feed video, reels |
| **Video buffer stalls** | Count / duration of buffering after start | Feed + reels |
| **Music load time** | Tap play → audible playback | Music cards, copyright-free, sermons |
| **Ebook open time** | Tap read → first PDF page visible | PdfViewer |
| **Ebook download / cache** | Remote PDF → local file ready | Android local download path |
| **Thumbnail / cover load** | Image URI → displayed | All cards |

### 3.5 Internal warning thresholds (already in code)

From `src/shared/config/performance.ts` and `usePerformanceMonitoring`:

| Signal | Threshold | Meaning |
|---|---|---|
| Render frame budget | **16ms** | Keep 60fps |
| Image load warn | **2,000ms** | Slow cover / thumbnail |
| Network slow warn | **3,000ms** | Slow API call |
| Memory warning | **90%** JS heap usage | Risk of jank / eviction |
| Video concurrent players | Max **3** | Avoid over-decoding |
| Video preload distance | **2** items ahead | Balance readiness vs memory |
| Scroll throttle | **16ms** | 60fps scroll updates |

These are **engineering tripwires**, not yet a full production analytics dashboard.

---

## 4. Scorecard — baseline → current → TikTok / IG target

### How to read this table

- **Baseline:** Pre-optimization / early architecture (ScrollView feed, blocking startup, limited lazy load).  
- **Current (estimated / observed direction):** Based on shipped work and documented estimates. Replace with lab numbers from the measurement protocol in §10 before publishing external claims as “measured.”  
- **Target:** TikTok / IG-class feel for Jevah.

| Area | Baseline (before major work) | Current state | TikTok / IG target | Status |
|---|---|---|---|---|
| Cold start → splash dismiss | Often blocked on multi-store hydration + warmup | Fonts ready → hide; **1.8s hard fallback** so splash cannot trap users | ≤ 1.5–2.0s | **Improved** |
| Cold start → interactive shell | Waited for downloads, library, preload, warmup | Shell after fonts; heavy work deferred via `InteractionManager` | ≤ 2.0–2.5s mid-range | **Improved** |
| Home feed first content | All cards mounted via ScrollView + map | **FlashList** virtualization; React Query cache + welcome warmup | ≤ 1.0s cached; ≤ 2.0s warm network | **Improved** |
| Feed scroll | Jank with many mounted cards | Virtualized window; memoized `ContentItemRenderer` | Sustained ~60fps | **Improved** |
| Image / cover load | RN `Image`, optimize often off | **expo-image** + SafeImage optimize default | ≤ 500–800ms typical Wi‑Fi | **Improved** |
| Video first playable frame | Variable; thumbnail-only failures common when URLs weak | expo-video path, retry-with-fresh-URL, optimization hooks | ≤ 1.0s Wi‑Fi active card | **In progress** |
| Music start | Competing with full feed mount | Dedicated audio hook; still sequential decode cost | ≤ 0.5–1.5s | **In progress** |
| Ebook open | Full remote PDF via WebView / download | PdfViewer with Android local download path | ≤ 1–2s first page (CDN / cached) | **Needs measurement** |
| Tab first open | Heavy tabs in initial bundle | Lazy Library / Community / Bible (~**200–400ms** faster startup est.) | ≤ 300–500ms first open | **Improved** |
| Tab warm switch | Mixed | Instant for already loaded | Instant | **Improved** |
| Startup API storms | Parallel warmup + prefetch → **429** | Staggered warmup → delay → prefetch; smaller batch stats | No startup 429 under normal load | **Improved** |
| Screen transitions | Mixed; some sheets closed abruptly | Content action sheet timed close (~240ms) + backdrop fade | ≤ 300ms perceived | **Improved** |

**Honest label for external sharing:**  
Use “**materially improved vs prior architecture**” for shipped items. Use “**on track / not yet at target**” for video first-frame, music start, and ebook open until §10 lab numbers are filled.

**Do not cite** percentage claims from `scripts/performance-test.js` (e.g. “80–95% faster”) in partner updates — those are aspirational script outputs, not device-lab measurements. Prefer the Phase 0 p50/p95 table instead.

**Related backend SLO:** engagement specs target like-toggle **&lt;100ms p95** on the Redis path. Client media speed still depends more on CDN / feed latency than on that interaction SLO alone.

---

## 5. What already shipped (performance improvements)

### 5.1 App startup

**Files:** `app/_layout.tsx`, `app/utils/apiWarmup.ts`, `docs/STARTUP_429_AND_STACK_FIXES.md`

| Change | Effect |
|---|---|
| Splash `preventAutoHideAsync` + hide on fonts | Predictable first paint; no blank flash |
| **1.8s splash safety timeout** | Users are never trapped on splash if fonts / native init stall |
| Critical path = fonts + shell; **persisted media non-blocking** | Faster perceived launch |
| Downloads, library, preload, warmup run **after first interactions** | Startup CPU / network budget reserved for UI |
| Backend warmup then **800ms stagger** then feed prefetch | Fewer cold-start 429s; healthier first feed fetch |
| Prefetch first page (`all-content`, page size 12) into React Query | Home can hit cache when user lands |

**Estimated impact:** Hundreds of ms to multi-second improvement in *perceived* readiness on slower devices and cold backends (exact delta depends on device + Render cold start).

### 5.2 Feed / page load (All Content TikTok)

**Files:** `src/features/media/AllContentTikTok/index.tsx`, FlashList list, `ContentItemRenderer`, `useMedia`, content cache store

| Change | Effect |
|---|---|
| Replaced “render all cards” pattern with **FlashList** | Only nearby items mount → lower TTI and memory |
| Memoized item renderer | Fixes VirtualizedList “slow to update” class of jank |
| React Query stale times (15–30 min) + welcome cache warm | Instant-ish revisit / warm navigations |
| Batch stats load reduced / delayed (16 items, 400ms delay; no 32-item cascade) | Less startup contention with media decode |
| For You ranking + session seed | Product feel closer to IG/TikTok; not a raw load-time win but improves perceived quality |

**Estimated impact (from prior docs):**  
Virtualization + memoization = largest feed responsiveness win. Lazy tabs alone were estimated at **~200–400KB** smaller initial surface and **~200–400ms** faster load on slower devices.

### 5.3 Images

| Change | Effect |
|---|---|
| `expo-image` via SafeImage / OptimizedImage | Disk + memory caching |
| Optimize remote URIs by default | Smaller downloads, fewer layout thrash events |
| Image load monitoring threshold (2s) | Engineering visibility into slow covers |

### 5.4 Video

| Change | Effect |
|---|---|
| Feed / card path on **expo-video** | Modern player path for reels-like UX |
| **Visibility player gating** (`shouldRenderPlayer` / Reels ±1) | Players mount only when needed — lower decode cost off-screen |
| `useOptimizedVideo` + `videoOptimization` | Network-aware config, retries, buffer awareness, load-time logging |
| Max concurrent videos / preload distance config | Prevents decode storms |
| Retry with **fresh URL** via `getMediaById` | Recovers expired signed URLs instead of sticking on thumbnail |
| CDN + Redis guidance documented | Correct split: Redis for feed JSON; CDN for bytes |

**Note:** An `instant-on` feature module also exists as a parallel architecture experiment (BootSplash until first video, MMKV sync hydrate). The live Expo Router shell remains `app/_layout.tsx`; treat Instant-on as optional acceleration work, not the sole production path unless product promotes it.

**Remaining gap to IG/TikTok:** Adaptive bitrate / HLS ladder, edge CDN hit rates, and consistent first-frame SLOs still depend heavily on **media delivery infrastructure**, not only the client.

### 5.5 Music / audio

| Change | Effect |
|---|---|
| Dedicated feed audio hook (`useAllContentTikTokAudio`) | Sound lifecycle isolated from video players |
| Copyright-free player flows with progress controls | Separate product surface; counts hydration documented |
| Virtualized feed means fewer audio cards mount at once | Less hidden decode / memory pressure |

**Remaining gap:** Pre-buffer next audio, shared audio session policy with video, and measured start latency on 3G/4G/Wi‑Fi.

### 5.6 Ebooks

| Change | Effect |
|---|---|
| PdfViewer route for read-now | Dedicated reader instead of in-card PDF |
| Disk PDF cache (`FileSystem` pdf-cache) + local open path | More reliable open vs flaky remote-only view |
| **~15s** download / extraction timeout with viewer fallback | Avoids indefinite hangs on bad PDFs |
| Library lists use FlatList windows (`initialNumToRender` / `windowSize`) | Faster library browsing of ebook rows |

**Remaining gap:** First-page timing instrumentation, PDF streaming / progressive open, and CDN caching for large files.

### 5.7 Screen transitions & sheets

| Change | Effect |
|---|---|
| Modular `ContentActionModal` + `useSheetTransition` | Reliable open/close; backdrop fade; timed unmount (~240ms) |
| Instant-on navigator notes (`detachPreviousScreen: false`) | Smoother navigation where used |
| Default animation duration config **300ms** + native driver flag | Consistent motion budget |

### 5.8 Architecture that enables further speed

| Foundation | Why it matters next |
|---|---|
| Modular media feature folders | Safer to optimize video / music / ebook independently |
| Unified performance utils | One place for future telemetry |
| Lazy imports for heavy tabs | Bundle can keep shrinking |
| Backend engagement / feed specs | Faster APIs = faster client without more client hacks |

---

## 6. Media deep dive — current behavior vs next leap

### 6.1 Video (feed + reels)

**Today**

```text
Feed API / cache → FlashList mounts nearby cards → active card creates player
  → URL from fileUrl / playbackUrl / hlsUrl
  → on error: refresh media by ID once → retry
  → load time can be logged via videoOptimization.recordVideoMetrics
```

**Improvements already felt**

- Fewer cards competing for decoders  
- Better recovery from bad / expired URLs  
- Clearer separation of thumbnail vs playback failure  

**To reach TikTok / IG video feel**

1. Stable **CDN** URLs (or long-lived signed URLs) in feed cache  
2. **HLS / ABR** where possible so first segments are tiny  
3. Prefetch **next 1–2** video manifests / first segments only for likely next cards  
4. Publish p50 / p95 **time-to-first-frame** from real devices  
5. Kill thumbnail-only mode except as true fallback  

### 6.2 Music / audio

**Today**

```text
User focuses music card → Audio.Sound.createAsync → shouldPlay
  → unload when leaving / replacing
```

**Improvements already felt**

- Audio not fighting a fully mounted 50-card tree  
- Clearer ownership in the audio hook  

**To reach Instagram / music-app feel**

1. Measure tap → audible ms on Wi‑Fi and 4G  
2. Preload metadata + first audio buffer for the focused + next item  
3. Avoid tearing down sound on tiny scroll jitters  
4. Ensure copyright-free and sermon audio share one session policy with video mute rules  

### 6.3 Ebooks

**Today**

```text
Tap Read → navigate PdfViewer → resolve URL
  → Android may download to FileSystem then render
  → iOS / WebView path renders remote or local URI
```

**Improvements already felt**

- Dedicated reader route  
- Local file path for reliability on Android  

**To reach consumer-reader feel**

1. Instrument **open → first page paint**  
2. Cache recently opened PDFs on disk with size caps  
3. Show skeleton / cover instantly while bytes load  
4. Prefer CDN-hosted PDFs with long cache headers  
5. Consider progressive page rendering for large books  

---

## 7. Before / after narrative (for the update email or slide)

### Before

- Home feed rendered large batches of cards at once.  
- App launch waited on multiple store hydrations and backend warmup.  
- Heavy tabs inflated the initial experience.  
- Startup request bursts could trigger **429** and stall engagement hydration.  
- Weak or expired video URLs often left users on **thumbnails only**.  
- Performance work was mostly tribal knowledge, not a KPI scorecard.

### After (current)

- Home feed is **virtualized (FlashList)** with memoized rows.  
- Launch shows the shell as soon as fonts are ready; background work is deferred.  
- Library / Community / Bible load **on demand**.  
- Startup networking is **staggered**; batch stats are smaller and safer.  
- Video path retries with a fresh URL; optimization + monitoring hooks exist.  
- Content action sheets close with a controlled ~240ms motion.  
- We have an explicit **TikTok / IG performance timeline** (this document).

### Still ahead

- Production telemetry dashboards for the KPI table in §3  
- CDN / ABR-backed first-frame guarantees  
- Music and ebook lab benchmarks published alongside video  
- Algorithmic For You backend latency (product + performance)  

---

## 8. Timeline to TikTok / Instagram performance standard

Dates are relative to **July 20, 2026**. Adjust if resourcing changes; keep the phase goals intact.

### Phase 0 — Measure what we already built *(Week 1–2)*

**Goal:** Replace estimates with device truth.

| Deliverable | Owner | Done when |
|---|---|---|
| KPI instrumentation marks for startup, feed TTI, video TTFF, music start, ebook open | Mobile | **Landed** — `__DEV__` p50/p95 via `perfMarks.ts` (`PERF.*`); splash, feed first paint, video TTFF, music start, ebook first page |
| Adjacent video CDN warmup (next 1–2 cards) | Mobile | **Landed** — `videoPrefetch.ts` + `useAdjacentVideoPrefetch` on home feed (network-aware) |
| Lab matrix: 2 Android + 1 iOS, Wi‑Fi + 4G | Mobile + QA | Scorecard §4 filled with measured p50/p95 from device runs |
| Baseline report shared with leadership | Product | One-pager from this doc + numbers |

**Exit criteria:** No major KPI left as “estimated only” for home, video, music, ebook.

---

### Phase 1 — Close client-side gaps *(Week 2–5)*

**Goal:** Extract remaining easy wins on the client.

| Workstream | Examples | Expected user impact |
|---|---|---|
| Feed readiness | Skeleton shimmer matching IG; stronger cache hit on warm start | Feels instant on revisit |
| Video prep | Prefetch next card first segment; stricter single active player | Faster swipe-to-play — **CDN Range warmup + Reels prefetch + ±1 mount gating shipped**; HLS still open |
| Music prep | Pre-create / buffer focused + next sound | Tap feels immediate — **`audioPrefetch` + take into `useAdvancedAudioPlayer` shipped** |
| Ebook prep | Disk cache last N books; cover-first UI | Reader opens with less blank time — **`pdfCache` last-8 + feed ahead warm shipped** |
| Transitions | Audit all modal / tab timings to ≤ 300ms | App feels tighter |
| Lazy load expansion | Profile, Search, Upload, PdfViewer route chunks | Smaller cold JS cost |

**Exit criteria:** Mid-range device hits **near-target** on warm feed + tab switches; video / music p50 within ~1.5× of target on Wi‑Fi.

---

### Phase 2 — Media delivery infrastructure *(Week 4–8, parallel with Phase 1)*

**Goal:** Make bytes as fast as the UI.

| Workstream | Examples | Expected user impact |
|---|---|---|
| CDN for video / audio / PDF | Edge cache, stable URLs | Fewer thumbnail-only and timeout cases |
| Adaptive streaming | HLS ladder for video | Faster first frame on 4G |
| Redis feed cache hygiene | Cache metadata; don’t cache dying signed URLs | Consistent playback after scroll |
| Image variants | Size-appropriate covers | Faster paint, less data |
| API latency SLOs | Feed p95, batch-metadata p95 | Predictable TTI |

**Exit criteria:** Video TTFF and ebook open meet Wi‑Fi targets on lab devices; 4G within agreed band.

---

### Phase 3 — TikTok / IG product performance loop *(Week 6–12)*

**Goal:** Match the *product* speed loop, not only raw milliseconds.

Aligned with `BACKEND_ENGAGEMENT_TIKTOK_IG_ALIGNMENT.md` Phase 3:

| Workstream | Performance angle |
|---|---|
| For You feed endpoint | Ranked page returns fast; client stops over-fetching then re-sorting large chron lists |
| Impression + watch-time signals | Prefetch what users actually watch |
| Reels-specific feed | Dedicated payload size / URL quality for vertical watch |
| Follow graph feeds | Smaller, hotter caches for social surfaces |
| Share / OG previews | Faster external open graph (indirect retention) |

**Exit criteria:** Leadership can say: “Jevah’s core watch / listen / read loops meet our published TikTok / IG performance bands on target devices.”

---

### Phase 4 — Continuous performance *(Ongoing after Week 12)*

| Practice | Cadence |
|---|---|
| Perf regression budget in PR review | Every media PR |
| Weekly p95 dashboard review | Eng + product |
| Quarterly device lab (low / mid / high) | QA |
| Kill switches for prefetch aggressiveness | **Landed** — `EXPO_PUBLIC_ENABLE_VIDEO_PREFETCH` / `_AUDIO_` / `_PDF_` (`0` disables) |

---

## 9. Milestone snapshot (copy into slides)

| When | Milestone | User-facing claim you can make |
|---|---|---|
| **Now** | Foundations shipped | “Startup and home feed are materially faster; we virtualize media, defer work, and stop startup request storms.” |
| **+2 weeks** | Measured scorecard | “We publish p50/p95 for startup, video, music, and ebooks on real devices.” |
| **+5 weeks** | Client near-target | “Warm navigation and feed revisits feel instant; swipe-to-play is consistently quick on Wi‑Fi.” |
| **+8 weeks** | Delivery near-target | “CDN / streaming-backed media hits our first-play and ebook-open targets.” |
| **+12 weeks** | TikTok / IG band | “Core Jevah loops meet our published Instagram / TikTok performance standard on target hardware.” |

---

## 10. Measurement protocol (fill before external “ms” claims)

Run on **release or preview builds**, not only Metro debug.

### Devices (minimum)

- Mid-range Android (primary user device class)  
- Low-end Android (worst-case)  
- Current iPhone (upper bound)

### Networks

- Wi‑Fi  
- Throttled 4G (or real cellular)  
- Optional: airplane → reconnect cold API test  

### Script (per device / network)

1. Force-quit app; clear if measuring true cold cache miss.  
2. Launch → record splash dismiss and first feed paint.  
3. Scroll 10 cards → note dropped frames / stalls qualitatively + FPS overlay if available.  
4. Tap play on a video not yet buffered → record TTFF.  
5. Swipe to next video → record transition + TTFF.  
6. Open a music card → record tap → audible.  
7. Open an ebook → record tap → first page.  
8. Switch tabs (Library, Community, Bible) cold then warm.  
9. Background 30s → resume (warm start).  
10. Repeat 5×; report **p50 and p95**.

### Template for results

| KPI | Device | Network | p50 | p95 | Notes |
|---|---|---|---|---|---|
| Cold start → shell | | | | | |
| Feed first content | | | | | |
| Video TTFF | | | | | |
| Next-video swipe TTFF | | | | | |
| Music start | | | | | |
| Ebook first page | | | | | |
| Tab cold open | | | | | |
| Tab warm switch | | | | | |

Paste filled values back into §4 before sending partner-facing absolute claims.

---

## 11. Risks and dependencies

| Risk | Impact | Mitigation |
|---|---|---|
| Backend / Render cold starts (30–90s possible) | Dominates “app feels slow” even if UI is fast | Keep warmup; consider always-on or edge API for feed |
| Short-lived signed media URLs | Thumbnail-only videos | CDN / long-lived URLs + existing refresh retry |
| Over-prefetch | Memory pressure, 429s | Cap concurrent players; stagger requests |
| Unmeasured estimates used externally | Credibility risk | Run Phase 0 before hard ms claims |
| Large PDF ebooks | Multi-second opens | Disk cache + progressive UI |
| Low-end Android variance | Misses “average” story | Always publish mid-range + low-end separately |

---

## 12. Asks / decisions needed

1. **Approve Phase 0 lab time** (1–2 weeks) so the scorecard becomes measured, not estimated.  
2. **Confirm target devices** for “official” TikTok / IG parity claims.  
3. **Prioritize CDN / HLS** work with backend / infra (Phase 2) — this is the largest remaining video gap.  
4. Decide whether ebook performance is **P0** with video/music or a fast-follow.  
5. Agree that external updates will use the language in §4 (**Improved / In progress / Needs measurement**) until Phase 0 completes.

---

## 13. One-paragraph update (paste-ready)

> Jevah’s latest performance work makes the app start and browse media meaningfully faster: the home feed is virtualized with FlashList, heavy tabs load on demand, startup no longer blocks on library/download hydration, and network warmup is staggered to avoid rate-limit storms. Video playback is more resilient (fresh-URL retry, optimized player path), and action-sheet transitions are tighter. We are not yet at TikTok / Instagram first-frame and swipe parity across video, music, and ebooks — that requires a short measurement sprint, then client prefetch polish, then CDN / adaptive delivery and faster feed APIs. Our plan reaches published TikTok / IG performance bands for core watch / listen / read loops within about 12 weeks from July 20, 2026, with measurable checkpoints at weeks 2, 5, and 8.

---

## 14. Appendix — key code & doc map

| Concern | Path |
|---|---|
| Startup / splash / deferred init | `app/_layout.tsx` |
| API warmup | `app/utils/apiWarmup.ts` |
| Lazy screens | `app/utils/lazyImports.tsx` |
| Performance config / thresholds | `src/shared/config/performance.ts` |
| Performance monitoring hook | `src/shared/hooks/usePerformanceMonitoring.ts` |
| Home feed (FlashList) | `src/features/media/AllContentTikTok/index.tsx` |
| Feed data / batch stats | `src/features/media/AllContentTikTok/hooks/useAllContentTikTokFeedData.ts` |
| Feed audio | `src/features/media/AllContentTikTok/hooks/useAllContentTikTokAudio.ts` |
| Video optimization + metrics | `app/utils/videoOptimization.ts`, `app/hooks/useOptimizedVideo.ts` |
| Ebook reader | `app/reader/PdfViewer.tsx` |
| Action sheet transition | `src/shared/components/ContentActionModal/useSheetTransition.ts` |
| Startup 429 fixes | `docs/STARTUP_429_AND_STACK_FIXES.md` |
| Lazy-load impact notes | `docs/LAZY_LOADING_IMPLEMENTATION.md` |
| Video URL / CDN notes | `docs/ALL_CONTENT_TIKTOK_VIDEO_LOADING.md` |
| TikTok / IG product backend phases | `docs/BACKEND_ENGAGEMENT_TIKTOK_IG_ALIGNMENT.md` |

---

**Document owner:** Mobile / performance lead  
**Next update:** After Phase 0 lab numbers are pasted into §4 and §10.
