# Backend Handoff — Creators / Gospel Artists (Mobile FE shipped)

**Date:** 24 Jul 2026 (updated with mobile implementation)  
**Audience:** Backend  
**Branch (FE):** `feature/feed-playback-engagement`  
**Goal:** Corroborate contracts so Music → **Copyright-free | Artists** and Creator studio work end-to-end. Mobile UI + clients are wired; gaps below must be closed on API/storage.

---

## Product rules (do not regress)

| Shelf | Source of truth | Must never include |
|-------|-----------------|--------------------|
| Music → Copyright-free | `GET /api/audio/copyright-free` (curated) | Creator / `lane=artist` uploads |
| Music → Artists | `GET /api/music/tracks?lane=artist` | Curated / copyright-free beds |
| AllContentTikTok MUSIC chip | Mounts Music screen (lanes above) | Dumping artist tracks into TikTok video feed |

Creator uploads **always** land on **Artists** (`lane=artist`), never on Copyright-free.

Mobile **never** calls `/api/admin/*`.

---

## What mobile already implemented

### Creator session
- `GET /api/creators/me` → hub UI from `capabilities.nextStep`
- `POST /api/creators/apply`
- Screens: `/creators`, `/creators/apply`, `/creators/upload`
- Profile → Creator status banner → hub

### Studio upload pipeline
1. `POST /api/creators/tracks/upload-intent`
2. Client `PUT` audio (and optional cover) to returned presigned URLs
3. `POST /api/creators/tracks/:trackId/finalize` with `{ publish: boolean }`
4. Studio list: `GET /api/creators/me/tracks`
5. `PATCH` / `DELETE` `/api/creators/tracks/:trackId`

Limits enforced on client: audio ≤ 100MB, cover ≤ 5MB.

### Catalog / profile
- Artists lane: `GET /api/music/tracks?lane=artist`
- Artist profile: `GET /api/artists/:slug` + `GET /api/artists/:slug/tracks`
- Shared floating player uses `playbackUrl || fileUrl || audioUrl`

---

## Required response shapes (FE normalizers)

### `GET /api/creators/me`

```json
{
  "artist": {
    "id": "...",
    "displayName": "...",
    "slug": "still-waters",
    "status": "active"
  },
  "capabilities": {
    "canApply": false,
    "canEditProfile": true,
    "canUploadTracks": true,
    "canPublishTracks": true,
    "showPendingBanner": false,
    "showCreatorHub": true,
    "showPublicProfile": true,
    "publicProfilePath": "/artists/still-waters",
    "nextStep": "manage_catalog",
    "statusMessage": "Your studio is ready."
  },
  "status": "active",
  "canUpload": true
}
```

`nextStep` enum FE expects: `apply` | `wait_review` | `upload_first_track` | `manage_catalog` | `contact_support`.

### `POST /api/creators/tracks/upload-intent`

Request (mobile sends):

```json
{
  "title": "Still Waters",
  "artistName": "Optional",
  "genre": "gospel",
  "category": "worship",
  "language": "en",
  "contentType": "audio/mpeg",
  "fileName": "track.mp3",
  "fileSizeBytes": 1234567,
  "coverContentType": "image/jpeg",
  "coverFileName": "cover.jpg",
  "coverFileSizeBytes": 80000
}
```

Response **must** include:

```json
{
  "trackId": "...",
  "uploadUrl": "https://...presigned...",
  "uploadHeaders": { "Content-Type": "audio/mpeg" },
  "coverUploadUrl": "https://...",
  "coverUploadHeaders": { "Content-Type": "image/jpeg" },
  "expiresInSec": 900
}
```

Aliases FE also accepts: `id`/`_id` for trackId; `audioUploadUrl`/`putUrl` for uploadUrl; `requiredHeaders` for uploadHeaders.

### Finalize

`POST /api/creators/tracks/:trackId/finalize` body `{ "publish": true }`

Returned track must resolve to a TrackCard with:
- `id`, `title`, `artistName` (or `artist`)
- `lane: "artist"` (required)
- `playbackUrl` **or** `fileUrl` **or** `audioUrl` when ready
- `thumbnailUrl` / `coverUrl` optional
- `visibility`: `draft` | `public` | …
- `processingStatus` when async
- `artistSlug` when available (for profile deep link)

### Catalog TrackCard

```json
{
  "id": "...",
  "title": "...",
  "artistName": "...",
  "artistSlug": "still-waters",
  "lane": "artist",
  "playbackUrl": "https://...",
  "thumbnailUrl": "https://...",
  "durationSec": 214,
  "playCount": 12,
  "visibility": "public",
  "processingStatus": "ready",
  "genre": "gospel",
  "category": "worship"
}
```

### Artist profile

`GET /api/artists/:slug` → `{ artist: { id, displayName, slug, bio, avatarUrl, genres, isVerified } }`  
`GET /api/artists/:slug/tracks` → `{ tracks: [TrackCard...] }` with `lane=artist` only.

### Studio list

`GET /api/creators/me/tracks` → `{ tracks: [...], total }` including drafts.

### Patch publish

`PATCH /api/creators/tracks/:id` accepting `{ "visibility": "public" | "draft" }` and/or `{ "publish": true|false }`.

---

## Backend gaps to close (priority)

### P0 — Shelf integrity
1. **Hard filter:** `GET /api/audio/copyright-free*` must never return `lane=artist` or creator-owned originals.
2. **Hard filter:** `GET /api/music/tracks?lane=artist` must never return curated/copyright-free beds.
3. On creator finalize with `publish: true`, set `lane=artist` and exclude from CF indexes.

### P0 — Upload contract
4. Confirm intent → PUT → finalize works on staging with CORS / RN `fetch` PUT to R2 (headers match signed headers exactly).
5. If cover is omitted, omit `coverUploadUrl` (FE skips cover PUT).
6. If processing is async, return `processingStatus` and either withhold `playbackUrl` until ready **or** return a temporary URL; FE skips play when URL missing.

### P1 — Catalog completeness
7. `artistSlug` on every public artist track (required for Music → profile navigation).
8. Stable `playbackUrl` after finalize (CDN/HLS or direct).
9. Pagination: `page`, `limit`, `total` on music + me/tracks.
10. Search/genre filters on `GET /api/music/tracks?lane=artist&search=&genre=`.

### P1 — Creator lifecycle
11. Approval flips `nextStep` from `wait_review` → `upload_first_track` / `manage_catalog` and `canUploadTracks: true`.
12. Suspended → `nextStep: contact_support`, uploads locked.
13. Delete track removes from Artists shelf immediately.

### P2 — Nice to have
14. Play-count increments for artist tracks (FE shows `playCount`).
15. Verified badge flag on artist profile.
16. Webhook/push when processing completes so studio can refresh.

---

## Smoke curls (staging)

```bash
export BASE=https://YOUR_API
export TOKEN=...

# Session
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/creators/me" | jq .

# Catalog separation
curl -s "$BASE/api/audio/copyright-free?limit=5" | jq .
curl -s "$BASE/api/music/tracks?lane=artist&limit=5" | jq .

# Artist
curl -s "$BASE/api/artists/<slug>" | jq .
curl -s "$BASE/api/artists/<slug>/tracks" | jq .

# Upload
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$BASE/api/creators/tracks/upload-intent" \
  -d '{"title":"Smoke Test","contentType":"audio/mpeg","fileName":"x.mp3","fileSizeBytes":1000,"genre":"gospel"}' | jq .

# Then PUT file bytes to uploadUrl, then:
# curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
#   "$BASE/api/creators/tracks/<trackId>/finalize" -d '{"publish":true}' | jq .
```

**Pass criteria:** CF list has zero artist-lane items; artist list has zero curated beds; published finalize appears only under Artists; `/creators/me` capabilities drive apply/pending/upload/manage.

---

## FE file map (for pairing)

| Area | Path |
|------|------|
| Creators API | `app/services/creators/` |
| Upload pipeline | `app/services/creators/uploadPipeline.ts` |
| Music catalog API | `app/services/music-catalog/` |
| Music lanes UI | `app/categories/music.tsx`, `MusicLaneTabs.tsx` |
| Artist profile | `app/artists/ArtistProfile.tsx` |
| Creator hub / upload | `app/creators/index.tsx`, `upload.tsx`, `apply.tsx` |
| TikTok MUSIC mount | `app/categories/AllContentTikTok.tsx` → `<Music />` |

---

## Out of scope for this handoff

- Admin moderation consoles (`/api/admin/*`)
- Mixing artist audio into AllContentTikTok vertical video feed
- Putting creator uploads into Copyright-free
