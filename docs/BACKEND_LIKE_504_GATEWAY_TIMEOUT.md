# Backend handoff: Like POST 504 Gateway Time-out

**Audience:** Jevah backend / infra  
**Date:** 2026-08-12  
**Priority:** P0 — likes time out in production; heart cannot persist  
**Frontend:** `jevahapp-frontend`  
**API:** `https://api.jevahapp.com` (Contabo, nginx/1.24.0)  
**Related:** [`BACKEND_LIKE_500_FIX_AND_IG_TIKTOK_BUSINESS_LOGIC.md`](./BACKEND_LIKE_500_FIX_AND_IG_TIKTOK_BUSINESS_LOGIC.md) · [`LIKE_SYSTEM_BACKEND_BUSINESS_LOGIC_SPEC.md`](./LIKE_SYSTEM_BACKEND_BUSINESS_LOGIC_SPEC.md)

This is **not** “frontend needs a local backend.” The app already calls production. Nginx is up. Other routes on the same content succeed. **Only the like write hangs until nginx kills it.**

---

## 1. What we observed (2026-08-12)

```text
POST https://api.jevahapp.com/api/content/media/6929da46d4ec2df1331c8b6e/like
Authorization: Bearer <valid JWT>
Idempotency-Key: c03106c1-ffad-48d4-8e30-e2c9f5ea00b2
Content-Type: application/json
Body: (empty)

Status: 504
Body (HTML from nginx, not JSON):

<html>
<head><title>504 Gateway Time-out</title></head>
<body>
<center><h1>504 Gateway Time-out</h1></center>
<hr><center>nginx/1.24.0 (Ubuntu)</center>
</body>
</html>
```

Same session, same `contentId`:

| Call | Result |
|------|--------|
| `GET .../comments?page=1&limit=12` | **200** — `Comments OK (0/0)` |
| Socket `view` | **OK** — `viewCount: 418` |
| `POST .../like` | **504** — nginx gateway timeout |

A second content id (`694a46734f636937dbd71ce5`) failed the same way in the same session.

**Metro `InternalBytecode.js ENOENT` in Expo logs is noise.** Ignore it. The real failure is HTTP 504 from nginx.

---

## 2. Reproduce

```bash
TOKEN="<valid user JWT>"
CONTENT_ID="6929da46d4ec2df1331c8b6e"
KEY="$(uuidgen)"

time curl -i -X POST \
  "https://api.jevahapp.com/api/content/media/${CONTENT_ID}/like" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ${KEY}" \
  -d '{}'
```

Use:

```text
https://api.jevahapp.com/api/content/media/<contentId>/like
```

**Healthy:** `200` in **&lt; 1s** (p95 &lt; 300ms) with JSON:

```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 419
  }
}
```

`data.liked` = **this user’s** post-toggle state. `data.likeCount` = **global** count.

**Broken:** HTML 504 after nginx `proxy_read_timeout` (often 30–60s). Node never returned a response in time — or never returned at all.

---

## 3. What this 504 means

```
Phone → api.jevahapp.com (nginx) → Node like handler → Mongo / Redis
                                      ↑
                         this hop is too slow or stuck
```

- nginx **is running**
- the like **upstream did not finish** before nginx’s read timeout
- the like **may still commit after** nginx already sent 504 to the client (classic double-write risk)

That is why the client sends **`Idempotency-Key` (UUID per tap)** and will retry the **same key** on 502/504.

---

## 4. What frontend does today

| Step | Behavior |
|------|----------|
| Tap heart | Optimistic fill + count ±1 (IG/TikTok) |
| POST | URL/headers above, empty body, `Idempotency-Key` |
| `200` | Reconcile UI to `data.liked` / `data.likeCount` |
| `401` | Prompt login; do not keep a fake like |
| `429` | Rollback + cooldown |
| `500` / `LIKE_OPERATION_FAILED` | Rollback — do **not** queue (retries would loop) |
| **`502` / `504`** | **Keep heart.** Enqueue durable retry with the **same** `Idempotency-Key` |
| Offline / transport error | Same durable queue |

Frontend cannot fix a hung like write. If nginx times out, the user experience is already wrong (multi-second wait). **The write path must return fast.**

---

## 5. Required contract (unchanged, still not met under load)

```http
POST /api/content/:contentType/:contentId/like
Authorization: Bearer <JWT>
Idempotency-Key: <uuid>
Content-Type: application/json
```

`contentType` for feed videos/music/gifs: **`media`**.

| Rule | Detail |
|------|--------|
| Auth | 401 if missing/expired JWT — do not 504 |
| Toggle | One POST flips like ↔ unlike for that user |
| Idempotency | Same key + same user + same content → **same result**, no second toggle |
| Latency | p50 &lt; 100ms, p95 &lt; 300ms, hard cap **&lt; 2s** so nginx never 504s |
| Response | JSON only. Never HTML. |
| `liked` | Boolean for **this user after this toggle** |
| `likeCount` | Integer global count after this toggle |
| Feed / metadata | `hasLiked` / `userInteractions.liked` must match the write |

Do **not** wait on Redis if Redis is down. Like must still persist in Mongo and return 200. (503 + retry-without-key is already handled for idempotency-store outages.)

---

## 6. Likely root causes (check in this order)

1. **Mongo lock / missing index** on `(contentId, userId)` for likes / `MediaInteraction`. Toggle does a find + update that scans.
2. **Synchronous fan-out** inside the request: notifications, sockets, feed rank, analytics. Those must be **after** `res.json`.
3. **Redis hang** with no timeout on idempotency GET/SET. If Redis blocks, nginx 504s. Set a 50–100ms Redis timeout; fall back to Mongo.
4. **nginx `proxy_read_timeout`** shorter than a slow handler. Raising timeout **hides** the bug. Fix the handler; keep timeout ~10–15s max.
5. **Event-loop stall** on Contabo (GC, sync fs, one hot Node process). Check CPU / event-loop delay while reproducing the curl.
6. Same family as **`LIKE_OPERATION_FAILED` 500** — uncaught error in the write; some paths may hang instead of 500.

### Suggested write path

```
1. Authn (fail fast)
2. Idempotency lookup (Redis, 50ms timeout) → if hit, return stored 200
3. Mongo findOneAndUpdate like row (indexed)
4. Increment/decrement likeCount on content (atomic)
5. res.json({ success, data: { liked, likeCount } })   // ← return HERE
6. After response: Redis set idempotency, socket emit, notifications
```

---

## 7. Acceptance tests

- [ ] `time curl` like toggle on a real media id returns **200 JSON in &lt; 1s**, twice (like then unlike).
- [ ] Repeat the **same** `Idempotency-Key` → same `liked` / `likeCount`, no extra toggle.
- [ ] New key after a like → unlike (or vice versa).
- [ ] Kill Redis → like still **200** (not 504).
- [ ] nginx access log shows like `POST` `200`, not `504`.
- [ ] Feed or metadata for that user shows `hasLiked` matching the last successful toggle.
- [ ] Comments / views on the same id still 200 (already true; must stay true).

---

## 8. What we need back

1. Confirm nginx `proxy_read_timeout` / `proxy_connect_timeout` for `/api/content/*/like`.
2. Trace one 504: did Node receive the request? How long until handler return? Where did it block (Mongo vs Redis vs other)?
3. Indexes on the like collection + explain plan for the toggle query.
4. ETA for p95 like write &lt; 300ms in production.

Until that ships, the app will keep the heart on 504 and retry. Users will still wait on the original hung POST. **Fix the write.**
