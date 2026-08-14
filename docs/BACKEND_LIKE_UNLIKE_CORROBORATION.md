# Backend corroboration: like and unlike

**Audience:** Jevah backend / infra  
**Date:** 2026-08-14  
**Priority:** P0  
**Frontend:** `jevahapp-frontend`  
**API:** `https://api.jevahapp.com`

Send this file **together with** [`BACKEND_LIKE_504_GATEWAY_TIMEOUT.md`](./BACKEND_LIKE_504_GATEWAY_TIMEOUT.md) and [`LIKE_UNLIKE_FRONTEND_CONTRACT.md`](./LIKE_UNLIKE_FRONTEND_CONTRACT.md). This note is the unlike addendum. Unlike is **not** a second route.

---

## One write endpoint for both

```
POST /api/content/:contentType/:contentId/like
Authorization: Bearer <JWT>
Idempotency-Key: <uuid>
Body: empty
```

| User action | Expected result | Same request? |
|---|---|---|
| Tap heart (not liked) | `200` `{ liked: true, likeCount }` | Yes |
| Tap heart again (unlike) | `200` `{ liked: false, likeCount }` | **Yes — same POST** |

There is no `DELETE .../like` and no `/unlike`. Production 504 on this POST means **both** like and unlike fail. Comments and views on the same `contentId` still return 200.

---

## What frontend already does

- Optimistic heart + count on tap.
- Reconcile from `data.liked` / `data.likeCount` on 200.
- On **504**, keep the optimistic heart and retry. The write never landed, so reload can show unliked.
- Reads: `POST /api/content/batch-metadata` for `userInteractions.liked` after feed load (feed itself has no `hasLiked`).

Frontend cannot make nginx return 200. Do not ask for a Flutter rewrite or a second unlike API.

---

## What we need back

Same as the 504 doc:

1. nginx `proxy_read_timeout` for `/api/content/*/like`.
2. Trace one hung POST: did Node receive it? Mongo vs Redis vs other.
3. Indexes on the like collection; p95 write **&lt; 300ms**.
4. Confirm unlike is the same toggle handler and is not a slower second query.

Until that ships, hearts will flicker and unlikes will not persist after reload.
