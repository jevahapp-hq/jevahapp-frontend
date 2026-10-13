# Backend Handoff — Seed `moderationStatus` on Existing Media

**Audience:** Backend / data / moderation  
**Date:** 2026-09-06  
**Frontend:** `jevahapp-frontend` (`feature/feed-playback-engagement`)  
**Priority:** High — feed looks empty / “cut” for most users  
**Related FE:** `src/shared/media/moderationVisibility.ts`

---

## Verdict

**Yes — this is possible and recommended.**  
Existing media documents that omit `moderationStatus` (or leave it `null` / `pending`) are treated by the app as **unapproved**. The home feed only shows those items to the **uploader**. Everyone else sees a sparse feed even when `/api/.../all-content` returns dozens of items.

Seeding `moderationStatus: "approved"` on already-public, already-serving media fixes visibility without a frontend workaround.

---

## Why the FE cuts the list

FE visibility rule (intentional):

| `moderationStatus` | Who can see it |
|--------------------|----------------|
| `"approved"` | Everyone |
| `"under_review"` / `"pending"` / `"rejected"` / **missing** / `null` | **Uploader only** |

Observed all-content payload (2026-09-06): many ready videos with `fileUrl` / `thumbnailUrl` / `processingStatus: "ready"` but **no** `moderationStatus` field. Those items disappear for non-owners after `filterVisibleMedia`.

---

## Ask (backend)

### 1. One-time backfill (seed)

Run a controlled migration against the Media collection (name may vary — use your schema).

**Safe default for already-live content:**

```js
// Pseudocode — adapt to your ORM / Mongo shell
db.media.updateMany(
  {
    // Missing or empty status
    $or: [
      { moderationStatus: { $exists: false } },
      { moderationStatus: null },
      { moderationStatus: "" },
    ],
    // Optional safety: only items that are already playable / public-ish
    // processingStatus: { $in: ["ready", "completed"] },
    // deletedAt: null,
  },
  {
    $set: {
      moderationStatus: "approved",
      moderationUpdatedAt: new Date(),
      // optional audit
      // moderationSeededAt: new Date(),
      // moderationSeedReason: "backfill_missing_status_2026_09",
    },
  }
);
```

**Do not** blindly approve known rejects:

```js
// Leave these alone
{ moderationStatus: { $in: ["rejected", "under_review"] } }
```

### 2. Suggested decision matrix for the seed

| Condition | Set to |
|-----------|--------|
| Status missing / null / `""`, and content has playable `fileUrl`, not soft-deleted | `"approved"` |
| Explicit `"under_review"` or `"pending"` awaiting human/AI review | leave as-is |
| Explicit `"rejected"` | leave as-is |
| Editorial / HQ seed catalog meant for public feed | `"approved"` |
| User uploads still waiting AI/moderation | `"under_review"` or `"pending"` (do not auto-approve if policy requires review) |

If product policy is “legacy media that already shipped publicly is trusted,” prefer **approve missing**.  
If policy is “unknown = under review,” missing fields will keep starving the feed until reviewed — then FE will stay sparse.

### 3. Always return the field on feed APIs

After seed, ensure list endpoints include `moderationStatus` on every media object:

- Chronological all-content  
- Default content  
- For You / recommendations sections  
- Single-media detail  

Example item shape FE expects:

```json
{
  "_id": "6a954dfc56946d33b772d51a",
  "title": "Christ",
  "contentType": "videos",
  "fileUrl": "https://…/playback.mp4",
  "thumbnailUrl": "https://…/poster.jpg",
  "processingStatus": "ready",
  "moderationStatus": "approved",
  "uploadedBy": { "_id": "693c13f8b12bea6d54766b30", "…" }
}
```

Allowed values FE understands (lowercase):

- `approved`
- `under_review`
- `pending` (treated as unapproved / owner-only)
- `rejected`

### 4. Going forward (prevent recurrence)

On create/upload:

1. Set an explicit initial status (`pending` / `under_review` / `approved` per policy).  
2. Never omit the field.  
3. When AI/human approves, set `"approved"` and keep list caches / For You indexes consistent.

### 5. Optional admin / ops escape hatch

Useful for support:

```http
PATCH /api/admin/media/:id/moderation
{ "moderationStatus": "approved" }
```

Or bulk:

```http
POST /api/admin/media/moderation/backfill
{
  "filter": "missing_or_empty",
  "setTo": "approved",
  "dryRun": true
}
```

Support `dryRun: true` that returns counts before writing.

---

## Acceptance criteria

1. Count before/after:
   - `missingStatus` → near 0 for public catalog items  
   - `approved` count rises by that delta  
2. Logged-out or non-owner home feed shows the full public catalog (not only the viewer’s own uploads).  
3. Sample all-content / For You JSON includes `"moderationStatus": "approved"` on public items.  
4. Items intentionally `under_review` / `rejected` remain owner-only (or hidden) as before.  
5. No change required on FE once the field is present and correct.

---

## FE verification (after BE deploy)

1. Pull latest FE on `feature/feed-playback-engagement`.  
2. Log in as a user who did **not** upload the JOSEPH / Ibrahim videos.  
3. Open Home → confirm more than “a couple” videos appear.  
4. Network: all-content (or For You) items include `moderationStatus: "approved"`.  
5. Upload a new item that goes `under_review` → only the uploader still sees it (regression check).

---

## Out of scope for FE alone

Changing visibility for missing status to “treat as approved” would paper over bad data and hide real under-review items. **Correct fix is backend seed + always emit the field.**

---

## Quick answers

| Question | Answer |
|----------|--------|
| Can we seed moderation on already-had media? | **Yes** — `updateMany` / migration |
| Is it safe? | Yes if you only backfill **missing/empty**, and skip explicit `rejected` / active `under_review` |
| Will FE then show the full feed? | **Yes**, for `approved` items (subject to For You ranking still choosing order) |
