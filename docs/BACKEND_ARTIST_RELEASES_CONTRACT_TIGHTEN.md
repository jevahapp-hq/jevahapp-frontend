# Backend — Artist releases contract tighten (block FE second pass)

**Date:** 2026-08-04  
**Audience:** Backend / creators  
**Frontend:** Will build studio + public surfaces against this contract  
**Related:** Artist releases handoff (albums / EPs / mixtapes / singles)

Confirm or implement the items below **before** calling studio FE “done.” FE will code to these shapes now; soft-fail if a route is still 404.

---

## P0 — Must ship with studio

### 1. Detach / unlink track from release

```http
DELETE /api/creators/releases/:releaseId/tracks/:trackId
```

| Behavior | Spec |
|----------|------|
| Auth | Bearer + active creator, owns release |
| Effect | Remove track from release tracklist; renumber remaining `trackNumber` |
| Track doc | Keep audio file; clear `releaseId` / `trackNumber` (or set null) — **do not** hard-delete the song unless query `?deleteTrack=true` |
| Draft only? | Prefer allow on `draft` + `scheduled`; on `published` either 400 or auto-unpublish + require re-publish |

**Optional replace audio (same track id):**

```http
POST /api/creators/tracks/:trackId/replace-upload-intent
```

Same R2 PUT + existing finalize (or `…/replace/finalize`). Must not create a new track id or drop release membership.

### 2. Publish response (no re-GET)

`POST /api/creators/releases/:id/publish` → **200** body:

```json
{
  "success": true,
  "data": {
    "release": {
      "id": "...",
      "slug": "...",
      "title": "...",
      "type": "ep",
      "status": "published",
      "coverUrl": "https://...",
      "description": "...",
      "label": null,
      "upc": null,
      "releaseDate": "2026-08-01",
      "publishedAt": "2026-08-04T21:00:00.000Z",
      "scheduledAt": null,
      "trackCount": 4,
      "tracks": [ /* ordered TrackCard[] */ ]
    }
  }
}
```

If `scheduledAt` future → `status: "scheduled"` + `scheduledAt` set, `publishedAt` null until job runs.

Publish **errors** (not 500):

```json
{
  "success": false,
  "code": "TRACKS_NOT_READY",
  "message": "…",
  "data": { "blockingTrackIds": ["…"], "reasons": ["pending moderation"] }
}
```

### 3. Nested `release` on track payloads (listener + studio)

Every **artist-lane** track card (list, detail, finalize, artist tracks, release tracks) should include:

```json
"release": {
  "id": "...",
  "title": "Kingdom EP",
  "coverUrl": "https://...",
  "type": "ep",
  "slug": "kingdom-ep"
}
```

Plus flat fields already planned: `releaseId`, `albumId`, `trackNumber`, `discNumber`.

FE mini-player shows: `Playing from {release.title}` with **zero** extra GET.

---

## P1 — Contract clarity

### 4. Cover inheritance (singles)

| Case | Behavior |
|------|----------|
| Release has `coverUrl` | Use it on release page + inherit onto tracks that lack cover |
| Release cover missing, type `single`, track has cover | **Public GET** resolves `coverUrl` = first track cover (computed or stored on publish) |
| Studio | Still allow uploading release cover; show hint “Single can use track art” |

Document in OpenAPI: `coverUrl` on release may be resolved.

### 5. Slug rules

| Rule | Spec |
|------|------|
| Generate | From title on create/publish (slugify + short unique suffix if clash) |
| Uniqueness | Global among releases (or per-artist — **pick one**; FE assumes **global**) |
| FE edit | `PATCH /api/creators/releases/:id` accepts optional `slug` (validate `[a-z0-9]+(?:-[a-z0-9]+)*`, 3–80 chars) |
| Public | `GET /api/music/releases/:idOrSlug` accepts ObjectId **or** slug |

### 6. Type hints on publish

When counts don’t match type and `skipTypeHints` omitted/false → **400** with:

```json
{
  "code": "TYPE_HINT_MISMATCH",
  "message": "EP usually has 2–6 tracks (you have 1)",
  "data": { "expected": { "min": 2, "max": 6 }, "actual": 1, "type": "ep" }
}
```

FE shows confirm → retry with `skipTypeHints: true`.

---

## P2 — Admin (lowest FE priority)

```http
GET /api/admin/releases?status=&search=&page=&limit=
```

Already listed. Nice-to-have columns: `creatorId`, `artistSlug`, `artistDisplayName`, `trackCount`, `status`, `updatedAt`.

---

## FE assumptions (coding now)

1. Studio calls unlink + publish as specified; soft-warns if 404 until BE lands.  
2. Track normalizer reads `release` nest for player context.  
3. Never put release tracks on Copyright-free shelves.  
4. Admin table is last.

## BE checklist

- [ ] `DELETE …/releases/:id/tracks/:trackId` (unlink)
- [ ] Publish returns full release + tracks + timestamps
- [ ] `release: { id, title, coverUrl, type, slug? }` on track cards
- [ ] Single cover inherit documented + implemented on public GET
- [ ] Slug generate + optional PATCH + `idOrSlug` GET
- [ ] `TYPE_HINT_MISMATCH` + `TRACKS_NOT_READY` error codes
