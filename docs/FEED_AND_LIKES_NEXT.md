# What’s next: For You feed + durable likes

## Why the heart disappeared after ~an hour

Not because likes “expire” on the server from our UI timer alone.

1. Frontend kept a local like flag in AsyncStorage.
2. That flag was only treated as **fresh for 10 minutes** (`INTERACTION_CACHE_TTL_MS`).
3. After that window, feed/metadata `hasLiked: false` (known backend bug) won again → heart went gray.
4. Optimistic mismatch guard kept red **during the session**; cold start after TTL relied on bad API truth.

**Fix shipped:** liked/saved booleans are now **sticky for 30 days** (`INTERACTION_FLAG_TTL_MS`) until the user toggles. Counts still use the short TTL. Backend must still return correct `hasLiked` (see `docs/LIKE_TOGGLE_INCONSISTENT_RESPONSE.md`).

---

## Feed “don’t show me the same video next login”

### Already on device (strengthened)

| Piece | Role |
|--------|------|
| `feedImpressionStore` | Remembers IDs seen ~14d; “seen today” demoted hard |
| `getOrCreateSessionSeed` | New jitter each cold start so top order rotates |
| `rankFeedForYou` | Engagement + recency + affinity + diversity |
| `feedAffinityStore` | On-device preference from likes (family / speaker / tags) |

This is **rules + light personalization**, not neural ML. Enough to make relaunch feel different without a Python runtime inside Expo.

### What real ML needs (backend — recommended)

Do **not** ship a Python model inside the React Native app. Run ranking on the API:

```http
GET /api/feed/for-you?page=1&limit=20
Authorization: Bearer <JWT>
```

Suggested response: ordered `contentId`s (or full media cards) personalized per user.

Minimal backend pipeline (Python or Node):

1. Events: `view`, `like`, `watch_time`, `skip`, `impression`
2. Features: content embeddings (title/tags/type), user affinity vector
3. Ranker: logistic / LightGBM / two-tower (later)
4. Exploration: ε-greedy or bandit so the feed doesn’t collapse to one niche
5. Dedup: filter IDs impressed in last N hours

Example skeleton (backend repo, not this app):

```python
# pseudo — train offline, serve ranked ids
def score(user_vec, item_vec, recency, exploration):
    return cosine(user_vec, item_vec) * 0.6 + recency * 0.3 + exploration * 0.1
```

Until that ships, the client ranker + impressions remain the source of truth for rotation.

---

## Suggested priority order

1. **Backend like contract** — `POST .../like` post-toggle `liked` + feed `hasLiked` (paste `LIKE_TOGGLE_INCONSISTENT_RESPONSE.md`)
2. **Backend `/feed/for-you`** — real personalization + impression history server-side
3. **Watch-time signals** — record affinity on ≥3s / 50% watch (client already records on like)
4. **Seek polish** — smoke-test scrub on Android + iOS after last playback modularization
5. **Comment sheet** — pagination / nested reply threads if API supports it

---

## How to verify today

- Like a video → force-quit → reopen after >10 minutes → heart should stay red (sticky flag).
- Open All Content feed → note top IDs → force-quit → reopen → top cards should shift (session seed + seen-today demotion).
- Like sermons vs music over a few sessions → similar families should rank higher via affinity.
