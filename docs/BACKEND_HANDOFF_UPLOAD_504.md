# Backend Handoff — Upload 504s and Idempotency

## What happened

A user uploaded a long-form gospel video. The client showed
`Unexpected response (504).` and a "check your internet connection" hint. The
same file uploaded fine minutes later with no changes.

The connection was never the problem. A `504` is the reverse proxy in front of
the API reporting that **the API did not answer within the proxy's timeout**. It
says nothing about whether the work completed. The client just had no branch for
it, so it fell through to a generic "unexpected response" message.

It worked on retry because the condition is transient: the API was busy or the
synchronous post-upload work took longer than the proxy would wait.

## Why this matters more than a bad error message

**A 504 on a `POST` is ambiguous, and we were treating it as failure.** If the
API finished the upload after the proxy hung up, the user is told it failed, they
re-upload, and now there are two copies of the same sermon. We have no evidence
this has happened yet, but the path is open.

---

## What we changed on the client (already shipped)

1. `502 / 503 / 504 / 408` are no longer reported as failures. The client calls
   `GET /api/media/upload/:uploadId/status` with the same `X-Upload-ID` it sent
   on the `POST`, polls for up to 45s, and then reports one of: completed (shown
   as success), still processing (explicitly tells the user **not** to
   re-upload), failed (safe to retry), or unconfirmed.
2. A client-side abort no longer says "try again" — it says the upload may still
   be processing and to check first.
3. No automatic retry. Retrying a `POST` that may have succeeded is exactly how
   duplicates get created. See §3 — with a server-side idempotency guarantee we
   would happily add automatic retry.

Files: `app/categories/upload/hooks/uploadFlow/reconcileUploadOutcome.ts`,
`uploadErrorHandlers.ts`, `useUploadFlow.ts`.

This makes the symptom honest. It does not fix the cause.

---

## What we need from the backend

### 1. Don't do slow work inside the upload request

This is the root cause. If `POST /api/media/upload` synchronously does storage
upload + transcode + AI moderation, its duration scales with file size and it
will keep crossing the proxy timeout for large sermons.

Please return as soon as the bytes are durably stored and the media row is
created, with a status of `processing`, and continue the rest on a queue. The
client already has the progress infrastructure to handle this: it listens on the
upload socket room and polls
`GET /api/media/upload/:uploadId/status`. We can show "processing" in the feed.

Target: `POST` responds in under 10s regardless of file size.

### 2. Raise the proxy timeouts as a stopgap

Until §1 lands, on the nginx/Caddy layer in front of the API, for the upload
route only:

```nginx
location /api/media/upload {
    proxy_read_timeout    600s;
    proxy_send_timeout    600s;
    proxy_request_buffering off;   # stream to the app, don't buffer to disk first
    client_max_body_size  <match the app's limit>;
}
```

`proxy_request_buffering off` matters: with buffering on, nginx receives the
whole multipart body before the app sees a byte, so the app's own clock hasn't
started while the proxy's has. Please confirm which values are currently set —
if `proxy_read_timeout` is still the 60s default, that alone explains the 504.

Please also confirm `client_max_body_size` matches the app's limit. A mismatch
surfaces as a confusing `413` at a different threshold than the app enforces.

### 3. Make the upload idempotent on `X-Upload-ID`

We already send `X-Upload-ID: <uuid>` on every attempt, unique per user action
and **stable across retries of the same attempt**.

Please treat it as an idempotency key:

- First request with a given id → process normally, store the id on the media row.
- Repeat request with the same id, still processing → `409` with
  `{ uploadId, status: "processing", mediaId }`, do not start a second job.
- Repeat request with the same id, already completed → `200` with the original
  result, do not create a second row.
- Retain ids for at least 24h.

Once this exists, tell us and we will add automatic retry with backoff on 5xx,
which removes the manual-retry experience entirely.

### 4. Harden `GET /api/media/upload/:uploadId/status`

The client now depends on this for reconciliation, so:

- It must return a terminal state (`completed` / `failed`) and keep returning it
  for at least 24h after the upload finishes — not 404 once the job leaves the
  queue. A 404 is indistinguishable from "never existed" and forces us to give
  the user a vague answer.
- `stage` should be a stable enum. We currently substring-match on
  `complete|success|done` and `fail|error|reject`. Please give us the actual
  list so we can match exactly.
- Include `mediaId` as soon as the row exists, even while processing. Its
  presence is our strongest signal that the write committed.
- Return JSON on error paths for this route, not an HTML error page.

### 5. Return JSON from the proxy for 5xx

Right now a 504 returns nginx's HTML page, so `res.json()` fails and we can only
report the raw status. A JSON error body from the proxy
(`{ "error": "gateway_timeout" }`) would let every client render something
sensible.

---

## Open questions

1. What is `proxy_read_timeout` on the upload route today, and is
   `proxy_request_buffering` on or off?
2. Is storage upload / transcode / moderation currently inside the request, or
   already queued?
3. What are the exact `stage` values from the status endpoint?
4. How long is upload status retained after completion?
5. Can you honour `X-Upload-ID` as an idempotency key, and by when? This is the
   one that unblocks automatic retry.
6. What is the server-side max upload size, and does the proxy agree with it?

## How to reproduce

Upload a video large enough that server-side processing exceeds the proxy read
timeout — the reported case was long-form sermon content. It's load-dependent,
so it reproduces intermittently, which is itself a sign it's a timeout race
rather than a validation failure.
