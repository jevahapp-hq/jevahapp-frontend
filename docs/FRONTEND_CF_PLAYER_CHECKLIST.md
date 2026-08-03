# FE checklist — CF / artist music player (Spotify · YTM style)

**Date:** 2026-08-03  
**Source contract:** Backend handoff (CF player engagement)  
**Related:** [`BACKEND_FEED_AUDIO_SEEK_AND_VIEWS_HANDOFF.md`](./BACKEND_FEED_AUDIO_SEEK_AND_VIEWS_HANDOFF.md)

---

## Wiring status

| Item | Status | Where |
|------|--------|--------|
| Share sheet uses `shareUrl`; `POST …/share` on complete | Done | `useSongModalController.handleShare` |
| Update UI `shareCount` from response / socket | Done | interactions + realtime |
| Library uses `GET /api/audio/library` | Done | `useAllLibraryData` (music/audio/all preferred) |
| Save toggle → `isInLibrary` | Done | `useSongInteractions.handleToggleSave` + options sheet |
| Playlist add with `copyrightFreeSongId` | Already | `usePlaylistActions` |
| Seed seek from `duration`; never wipe with player `0` | Done earlier | `resolveAudioDurationMs` + `mapCopyrightFreeSong` |
| Soft-disable scrub until duration | Done | `PlayerProgress` |
| View only bumps when `counted === true` | Done | view tracking |
| Creator: intent → PUT → finalize → poll ready | Done | `uploadPipeline.pollCreatorTrackUntilReady` |

---

## Shared mapper

`app/services/copyright-free/mapCopyrightFreeSong.ts` normalizes:

`duration` / `durationSec`, `shareUrl`, `shareCount`, `saveCount`, `isInLibrary` / `isSaved`, `artistName`, counts.

Used by list/search/detail + MusicScreen / CF modal transforms.
