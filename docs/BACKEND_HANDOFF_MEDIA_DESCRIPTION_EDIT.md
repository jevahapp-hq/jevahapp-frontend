# Backend Handoff — Editing a Media Description (owner-only, realtime)

The mobile client now lets the uploader edit a video's description from Reels.
The UI is shipped and optimistic; it needs the two endpoints and one socket
event below to become durable and to propagate to other viewers.

Client files, for reference:

- `app/utils/mediaEdit/updateMediaDescription.ts` — the HTTP call
- `app/reels/hooks/useReelsDescriptionEdit.ts` — optimistic apply + rollback
- `src/shared/utils/applyMediaDescriptionToCaches.ts` — cache fan-out
- `app/hooks/useEngagementSocket.ts` — listens for `media-updated`

---

## 1. `PATCH /api/media/:mediaId`

Partial update of a media document. For now only `description` is sent, but
please design it as a partial-update endpoint so `title` and tags can follow
without a new route.

### Request

```
PATCH /api/media/507f1f77bcf86cd799439011
Authorization: Bearer <jwt>
Content-Type: application/json

{ "description": "Sunday service, part two." }
```

### Response — 200

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "description": "Sunday service, part two.",
    "updatedAt": "2026-08-27T09:14:22.031Z"
  }
}
```

`data.description` must be the **stored** value after any server-side
normalisation. The client adopts it verbatim, so if you trim, collapse
whitespace, or strip markup, return the result rather than the input — otherwise
the author sees their text change on the next refetch.

`data.updatedAt` is required; see the conflict rule in §3.

### Validation and rules

| Rule | Behaviour |
|---|---|
| Caller is not the uploader | `403` — client shows "You can only edit your own posts." |
| Caller is an admin/moderator | Allow, and record it in the moderation audit log |
| `description` longer than 1500 chars | `400`. The client enforces the same cap (`DESCRIPTION_MAX_LENGTH`); please confirm 1500 matches your column limit |
| `description` empty string | Allow — clearing a description is legitimate |
| `description` missing from body | Treat as "no change", not as "clear" |
| Media is deleted or not found | `404` |
| Expired / invalid token | `401` |

Sanitise the text server-side: strip HTML/script, normalise unicode, and run it
through the same profanity/moderation filter the upload flow uses. The client
does not sanitise, and this text renders on other users' screens.

Rate limit to something like 10 edits per media per hour per user to stop
description-swapping abuse (uploading benign content, then editing the copy).

### Legacy path

The client tries `PATCH /api/media/:id` first and falls back to
`PATCH /api/content/media/:id` on a `404`/`405`. Implement whichever fits your
routing; only one needs to exist. Please tell us which, and we will drop the
fallback.

---

## 2. Include the field in every read path

The edited description must come back from every endpoint that returns media,
otherwise the client's optimistic value gets overwritten by a stale one on the
next fetch:

- `GET /api/media` (the feed, all filters and pagination)
- `GET /api/media/:id`
- `GET /api/media/:id/metadata`
- the "for you" / discovery feeds
- bookmarks / library listings
- anything backing Reels

Also return `updatedAt` on media objects in these payloads.

---

## 3. Realtime — `media-updated`

Emit to the content room the client already joins
(`joinContentRoom(contentId, "media")` in `app/services/SocketManager.ts`),
immediately after the write commits.

```json
{
  "contentId": "507f1f77bcf86cd799439011",
  "description": "Sunday service, part two.",
  "updatedAt": "2026-08-27T09:14:22.031Z"
}
```

Notes:

- Event name: `media-updated`. The client also accepts `content-updated` as an
  alias, so either is fine — please pick one and tell us.
- Emit to the author's other sessions too, so a phone and a tablet stay in sync.
- Send only the changed fields plus `contentId` and `updatedAt`. The client
  merges by field and ignores keys it doesn't recognise.
- The client currently subscribes only to the **focused** content room in Reels.
  A viewer scrolled elsewhere picks the edit up on their next fetch, which is
  acceptable. If you would rather push edits to a user-level room, say so and we
  will subscribe to it.

### Conflict resolution

Last write wins, ordered by server `updatedAt` — the client never invents a
timestamp. If you would prefer optimistic concurrency, we can send an
`If-Unmodified-Since` / `expectedUpdatedAt` and handle a `409`; tell us and we
will add it. Until then, please ignore an incoming write whose payload is older
than the stored `updatedAt` rather than applying it.

---

## 4. Audit trail

Please keep an edit history row per change: `mediaId`, `userId`, `field`,
`oldValue`, `newValue`, `createdAt`, and the request IP. Two reasons: moderation
needs to see what a post said when it was reported, and we will likely want to
show "edited" on the client later.

If you expose it, this shape works for us:

```
GET /api/media/:mediaId/history  →  { success, data: [{ field, oldValue, newValue, createdAt }] }
```

Not required for launch.

---

## 5. What the client already handles

So you don't need to defend against these:

- The pencil only renders when the client believes the viewer is the uploader.
  **This is a UI affordance, not a security boundary** — the `403` check on your
  side is the real one.
- Optimistic update with rollback: if you return non-2xx, the old text is
  restored and the error message from `message` / `error` is shown to the user.
- 20s timeout, then a "Request timed out" message.
- Client-side length cap and trim before sending.

## 6. Open questions for you

1. Is the description column limit 1500 characters? If not, what?
2. Which route do you want canonical: `/api/media/:id` or
   `/api/content/media/:id`?
3. Which socket event name: `media-updated` or `content-updated`?
4. Should admins/moderators be allowed to edit others' descriptions?
5. Do you want optimistic concurrency (`409` on stale write), or is last-write-wins fine?
