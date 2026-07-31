# Backend Handoff — Creators polish gaps (post-corroboration)

**Date:** 30 Jul 2026  
**Context:** BE corroborated Music CF|Artists contracts. Mobile shipped pagination, edit UIs, processing polish, and deep links. Confirm these remaining endpoints.

## Shelf isolation (confirmed — do not regress)

| Shelf | Path | Rule |
|-------|------|------|
| Copyright-free | `GET /api/audio/copyright-free*` | **Never** `lane=artist` |
| Artists | `GET /api/music/tracks?lane=artist` | **Never** curated/CF beds |

Mobile FE also filters defensively on both shelves. Creator uploads always `lane=artist`.

## Already corroborated (no action)

- `/api/creators/me` + `capabilities.nextStep`
- Upload intent → PUT → finalize (`lane: artist`, `artistSlug`, `playbackUrl`)
- PATCH track `{ publish }` / `{ visibility }` (DB `published`)
- `{ tracks, total }` / `items` alias
- Artist profile `{ artist }` + `{ tracks }`
- `POST /api/music/tracks/:id/play`

## Needed for new mobile UI

### 1. Public profile edit — **required**

Mobile calls:

```http
PATCH /api/creators/me
Authorization: Bearer …
Content-Type: application/json

{
  "displayName": "Grace Collective",
  "bio": "…",
  "genres": ["gospel"],
  "avatarUrl": "https://… optional if avatar intent returns URL",
  "socials": { "instagram": "…", "youtube": "…", "spotify": "…" }
}
```

Response: same shape as `GET /api/creators/me` (normalized `capabilities` + `artist`).

Gate with `capabilities.canEditProfile === true` when active.

### 2. Avatar upload intent — **required for avatar change**

```http
POST /api/creators/me/avatar-upload-intent
{ "contentType": "image/jpeg", "fileName": "avatar.jpg", "fileSizeBytes": 12345 }
```

Response:

```json
{
  "uploadUrl": "https://…presigned…",
  "uploadHeaders": { "Content-Type": "image/jpeg" },
  "avatarUrl": "https://…public… optional",
  "expiresInSec": 900
}
```

Flow: intent → client PUT → `PATCH /api/creators/me` with `avatarUrl` if not auto-applied.

### 3. Cover replace on existing track — **required for edit-cover**

```http
POST /api/creators/tracks/:trackId/cover-upload-intent
{ "contentType": "image/jpeg", "fileName": "cover.jpg", "fileSizeBytes": 12345 }
```

Response: `{ coverUploadUrl, coverUploadHeaders, expiresInSec }`  
Then client PUT, then:

```http
PATCH /api/creators/tracks/:trackId
{ "coverUploaded": true }
```

(or auto-bind cover on PUT complete — tell FE which).

### 4. Track metadata PATCH — **confirm fields**

Mobile already sends:

```json
{
  "title": "…",
  "genre": "…",
  "category": "…",
  "visibility": "public" | "draft",
  "publish": true
}
```

Confirm `title` / `genre` / `category` are accepted (not only publish/visibility).

### 5. Processing status — **confirm values**

FE treats as processing when `processingStatus` is queued/pending/processing/uploading **or** playback URL missing. Ready when `ready|completed|done|success|published` **and** `playbackUrl|fileUrl|audioUrl` present.

### 6. Deep links (app-side done)

Schemes: `jevah://` and `jevahapp://`  
Path: `artists/:slug` → `/artists/[slug]`

No backend change required; optional universal links / AASA later.

## Smoke extras

```bash
# Profile edit
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$BASE/api/creators/me" -d '{"bio":"Smoke bio"}' | jq '.data.artist.bio'

# Avatar intent
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$BASE/api/creators/me/avatar-upload-intent" \
  -d '{"contentType":"image/jpeg","fileName":"a.jpg","fileSizeBytes":1000}' | jq '.data'

# Cover intent
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$BASE/api/creators/tracks/<id>/cover-upload-intent" \
  -d '{"contentType":"image/jpeg","fileName":"c.jpg","fileSizeBytes":1000}' | jq '.data'

# Metadata
curl -s -X PATCH -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  "$BASE/api/creators/tracks/<id>" -d '{"title":"Renamed","genre":"gospel"}' | jq '.data'
```

## FE map

| Feature | Path |
|---------|------|
| Artists pagination | `app/categories/music.tsx` |
| Edit track | `app/creators/edit-track.tsx` |
| Edit profile | `app/creators/edit-profile.tsx` |
| Deep links | `app/hooks/useArtistDeepLinks.ts`, `app.config.js` schemes |
| Artist route | `app/artists/[slug].tsx` |
