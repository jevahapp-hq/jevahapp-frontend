# Device lab + likes QA checklist

Use this after shipping performance / engagement changes. Fill numbers from `__DEV__` console (`⏱ … p50/p95`) or `globalThis.__jevahDumpPerf()` after a session.

## Devices

| Device | OS | Network | Tester | Date |
|---|---|---|---|---|
| | Android mid | Wi‑Fi | | |
| | Android mid | 4G | | |
| | Android low | Wi‑Fi | | |
| | iPhone | Wi‑Fi | | |
| | iPhone | 4G | | |

## Perf scorecard (paste p50 / p95 ms)

| Metric | Wi‑Fi p50 | Wi‑Fi p95 | 4G p50 | 4G p95 | Notes |
|---|---|---|---|---|---|
| `app.splash_hide` | | | | | |
| `feed.first_paint` | | | | | |
| `video.ttff` | | | | | Home feed |
| `video.ttff` (Reels swipe) | | | | | |
| `video.prefetch` | | | | | CDN warm |
| `music.start` | | | | | Prefer warm/prefetched |
| `ebook.first_page` | | | | | Cold + cached reopen |

Protocol: cold start app → open Home → scroll 10 cards → open Reels → swipe 5 → play music → open ebook → reopen same ebook → dump perf.

Kill switches (set env to `0` to disable):

- `EXPO_PUBLIC_ENABLE_VIDEO_PREFETCH`
- `EXPO_PUBLIC_ENABLE_AUDIO_PREFETCH`
- `EXPO_PUBLIC_ENABLE_PDF_PREFETCH`

## Likes / engagement QA

| Case | Pass? | Notes |
|---|---|---|
| Like → heart + count optimistic, survives reload | | |
| Unlike → rolls back correctly | | |
| Rapid double-tap heart does not double-count | | |
| 429 → “Slow down” / cooldown, then recovers | | |
| Offline like → queues; flush on reconnect | | |
| Offline like then unlike before flush → cancels (no server hit) | | |
| Guest like → login prompt, no optimistic flip | | |
| Guest save → login prompt | | |
| Guest comment: can **browse** thread; composer tap → login | | |
| Guest share analytics silent (no crash) | | |
| Socket count update does **not** flip local `liked` | | |
| Feed + Reels both join/leave content rooms on focus | | |
| Idempotency: retry same gesture does not double like | | |

## Media UX QA

| Case | Pass? | Notes |
|---|---|---|
| Home: off-screen cards show poster, not native player | | |
| Home: visible / Most Recent mounts player | | |
| Reels: only active ±1 mounts player | | |
| Adjacent video feels faster after warm scroll | | |
| Music second tap (next card) feels faster after prefetch | | |
| Ebook second open uses disk cache (faster) | | |
| Double-tap video = play/pause (not like) | | |

## Sign-off

| Role | Name | Date |
|---|---|---|
| Mobile | | |
| QA | | |
| Product (optional) | | |
