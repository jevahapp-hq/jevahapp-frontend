# Bug: Like toggle returns inconsistent post-toggle state

**Priority:** High — frontend heart UI and engagement sync depend on this.  
**Client workaround:** Optimistic `liked` is kept when the API `liked` boolean disagrees (see Metro `LIKE MISMATCH`). Count still comes from the API. This is a stopgap; the backend must return the correct post-toggle state.

---

## Endpoint

```http
POST /api/content/media/:contentId/like
Authorization: Bearer <JWT>
```

(Same pattern for other content types mapped as `media` / etc.)

---

## Expected contract

On **success**, `data` must reflect the **state after** this toggle for the **authenticated JWT user**:

| Action user intended (from UI) | `data.liked` | `data.likeCount` |
|---|---|---|
| Like (was not liked) | `true` | previous + 1 |
| Unlike (was liked) | `false` | previous − 1 (min 0) |

Also:

1. `data.liked` must be the **post-toggle** boolean — not pre-toggle, not inverted, not “has anyone liked”.
2. `data.likeCount` must match that mutation (no orphan counts).
3. Feed / metadata endpoints must return the same truth for this user via `hasLiked` / `userInteractions.liked` after the toggle.
4. Like documents must key off the same `userId` as the JWT (no auth/user mismatch).

Example **expected** after a successful **like**:

```json
{
  "success": true,
  "message": "Like toggled successfully",
  "data": {
    "contentId": "6910d31bf05cc0f6287bb7a6",
    "liked": true,
    "likeCount": 3
  }
}
```

---

## Actual (observed from production API)

### Example A

```http
POST https://api.jevahapp.com/api/content/media/69abf4886aef561f683a1a32/like
```

```json
{
  "success": true,
  "message": "Like toggled successfully",
  "data": {
    "contentId": "69abf4886aef561f683a1a32",
    "liked": false,
    "likeCount": 1
  }
}
```

### Example B (confirmed again after FE mismatch guard)

```http
POST https://api.jevahapp.com/api/content/media/6910d31bf05cc0f6287bb7a6/like
```

```json
{
  "success": true,
  "message": "Like toggled successfully",
  "data": {
    "contentId": "6910d31bf05cc0f6287bb7a6",
    "liked": false,
    "likeCount": 3
  }
}
```

**Client logs (paraphrased):**

- `TOGGLE LIKE: Response status: 200`
- `LIKE RESPONSE LOOKS INCONSISTENT … liked=false but likeCount=3`
- `LIKE MISMATCH … optimistic=true server=false count=3. Keeping optimistic liked.`

So: user taps to **like** (UI was unliked → optimistic `liked: true`), API returns **200** with `liked: false` while `likeCount` stays non-zero. Heart would flash red then go gray if the client trusted `data.liked`.

---

## Repro steps

1. Sign in with a valid JWT (Clerk / app auth).
2. Open the feed (All Content / For You).
3. On a post that shows an **unliked** heart, tap **Like** once.
4. Inspect `POST /api/content/media/:contentId/like` response.

**Actual:** `success: true`, `liked: false`, `likeCount` often `≥ 1`.  
**Expected:** `liked: true` and `likeCount` incremented if this user was not already liking.

Optional second tap (unlike): expect `liked: false` and count decremented.

---

## Likely backend causes to check

1. **`liked` is pre-toggle or inverted** in the response mapper.
2. **Double toggle** (e.g. HTTP handler + socket `content-reaction` / duplicate write) ending as unliked while count is wrong or sticky.
3. **userId mismatch** — like row written under a different id than JWT subject; count changes (or stays) but `hasLiked` for this user is false.
4. **Race** — response built from stale read before write commits.
5. **Idempotent / already-liked path** incorrectly returning `liked: false` while count remains.
6. Feed metadata still advertising stale `hasLiked: false` after a successful like (breaks cold start / hydrate).

---

## Related frontend notes (for context only)

- Single HTTP toggle path — client no longer emits socket like before HTTP (was causing double-toggle).
- Optimistic UI + local cache; on `liked` mismatch we **keep optimistic** and still apply `likeCount` from the API.
- Please fix the API so client can trust `data.liked` again and remove the mismatch workaround.

---

## Ask / acceptance criteria

- [ ] `POST .../like` returns post-toggle `liked` for the JWT user every time.
- [ ] `likeCount` moves ±1 in lockstep with that boolean for a single-user like/unlike.
- [ ] No `liked: false` + `likeCount > 0` right after a first-like when this user is the only new liker (and count should be consistent if others already liked).
- [ ] `GET` feed / content metadata `hasLiked` matches the last successful toggle for that user.
- [ ] Confirm auth middleware attaches the same user id used when inserting/removing the like document.

---

## Contact payloads already captured

| contentId | liked (API) | likeCount | HTTP |
|---|---|---|---|
| `69abf4886aef561f683a1a32` | `false` | `1` | 200 |
| `6910d31bf05cc0f6287bb7a6` | `false` | `3` | 200 |

Date observed: **2026-07-14** (client against `https://api.jevahapp.com`).
