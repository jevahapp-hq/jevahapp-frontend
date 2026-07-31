# Frontend Creators — Spotify for Gospel (Mobile)

**Status:** Mobile UI + clients shipped. BE contracts corroborated for shelves/upload; polish endpoints in `docs/BACKEND_CREATORS_POLISH_GAPS.md`.

## Architecture (confirmed with BE)

**Artist uploads never mix with Copyright-free. No separate AllContentTikTok tab.**

| Surface | Behavior |
|---------|----------|
| AllContentTikTok → MUSIC | Mounts `music.tsx` |
| Music → Copyright-free | `/api/audio/copyright-free` only |
| Music → Artists | `/api/music/tracks?lane=artist` only |
| Creator hub | Apply → wait → upload → manage / edit |

## Mobile DoD

- [x] Profile entry + Apply + Pending + Hub
- [x] Music tabs CF \| Artists (strict filters)
- [x] Artist profile + play + `POST …/play`
- [x] Upload intent → PUT → finalize
- [x] Studio list + publish/delete
- [x] Artists infinite scroll / pagination
- [x] Edit track metadata + cover replace UI
- [x] Edit public profile UI
- [x] Processing… until playable
- [x] Deep links `jevah://artists/:slug` + `jevahapp://artists/:slug`
- [x] Never call `/api/admin/*`

## Files

- `app/services/creators/` · `app/services/music-catalog/`
- `app/creators/*` (hub, apply, upload, edit-track, edit-profile)
- `app/artists/[slug].tsx` · `ArtistProfile.tsx`
- `app/categories/music.tsx` · `MusicLaneTabs.tsx`
- `app/hooks/useArtistDeepLinks.ts`
