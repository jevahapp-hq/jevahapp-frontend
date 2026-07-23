# Media delivery — CDN / HLS readiness (client + backend)

Client work (prefetch, player gating, disk PDF cache) cannot alone hit TikTok/IG first-frame bands. This is the delivery contract needed next.

## Goals

| Surface | Target |
|---|---|
| Video TTFF (Wi‑Fi, active card) | ≤ 1.0s p50 |
| Next-swipe TTFF | ≤ 0.6–0.8s p50 after warm |
| Music start (warm) | ≤ 0.5–1.0s |
| Ebook first page (cached) | ≤ 1–2s |

## Backend / CDN requirements

1. **HLS (or DASH) ladder** for long-form and Reels masters  
   - At least 360p / 540p / 720p variants  
   - Init segment + short GOPs for fast start  
   - `hlsUrl` (or equivalent) returned on content payloads alongside `fileUrl`

2. **Edge CDN** in front of origin object storage  
   - High hit rate for first ~256KB–2MB (matches client Range warmup)  
   - Correct `Accept-Ranges` / `Content-Range`  
   - Long cache TTL for immutable object keys; short TTL or signed URLs for private media

3. **Signed URL strategy**  
   - Stable path + query expiry that does not defeat CDN caching of the object key  
   - Client already prefers `playbackUrl` → `hlsUrl` → `fileUrl` via `getVideoUrlFromMedia`

4. **Feed payload**  
   - Include `thumbnailUrl` / cover for poster-only cards  
   - Include duration; avoid forcing client HEAD probes on cold start

5. **Ebook PDFs**  
   - CDN + `Cache-Control` for PDF objects  
   - Optional byte-range for progressive open (future); today client caches full file (last 8)

## Client already ready

| Capability | Location |
|---|---|
| URL preference order | `videoUrlManager.getVideoUrlFromMedia` |
| CDN Range warmup | `videoPrefetch.prefetchVideoUrls` |
| Network-aware ahead | `useAdjacentVideoPrefetch`, `useReelsAdjacentPrefetch` |
| Kill switches | `PERFORMANCE_FEATURES` + `EXPO_PUBLIC_ENABLE_*_PREFETCH` |
| Player mount gating | Home `shouldRenderPlayer`; Reels active ±1 |
| Audio Sound warm | `audioPrefetch` + `takePreloadedSound` |
| PDF disk cache | `app/utils/pdfCache.ts` |

## Out of scope for client alone

- Transcoding pipelines  
- Multi-region PoPs  
- DRM  

## Suggested rollout

1. Enable CDN on progressive MP4 (quick win for Range warmup)  
2. Add HLS field to API + smoke on Reels  
3. Point lab scorecard (`docs/DEVICE_LAB_AND_LIKES_QA.md`) at HLS vs MP4  
4. Tune ladder after p95 TTFF known  
