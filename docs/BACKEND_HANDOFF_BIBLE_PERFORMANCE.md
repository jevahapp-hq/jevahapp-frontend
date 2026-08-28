# Backend Handoff — Bible Performance

Goal: Bible reading should feel like YouVersion — chapter opens in well under
100 ms, and works fully offline after first use.

The client has been optimised (caching with TTL, request coalescing, removal of
redundant round trips). The remaining wins require backend changes. This
document is the complete ask.

---

## 1. The single most important change: ship whole books, not chapters

**Today** the client must issue one request per chapter:

```
GET /api/bible/books/John/chapters/3/verses?translation=web
```

John has 21 chapters, so reading through John is 21 sequential round trips. At
150 ms each that is over 3 seconds of pure network for one short book, and
every chapter change is a visible wait.

**Request:** add a bulk endpoint that returns an entire book in one response.

```
GET /api/bible/books/:bookName/verses?translation=web
```

```jsonc
{
  "success": true,
  "data": {
    "bookName": "John",
    "translation": "web",
    "chapters": [
      { "chapterNumber": 1, "verses": [ { "verseNumber": 1, "text": "..." } ] },
      { "chapterNumber": 2, "verses": [ /* ... */ ] }
    ]
  }
}
```

Whole-book payloads are small once gzipped (most books are well under 300 KB
uncompressed, and Psalms — the largest — is roughly 1.5 MB uncompressed but
compresses to a few hundred KB). One request per book instead of per chapter
removes the chapter-change wait entirely, because the next chapter is already
in memory.

---

## 2. Make responses cacheable — they are immutable

Scripture text for a fixed translation **never changes**. It should be treated
as immutable content, but today responses carry no cache headers, so every
client and every CDN edge has to re-ask the origin.

**Request:** on all `/api/bible/**` read endpoints, return:

```
Cache-Control: public, max-age=31536000, immutable
ETag: "<translation>-<book>-<contentHash>"
```

And honour `If-None-Match` with a `304 Not Modified`. This lets us put a CDN in
front of the Bible endpoints and serve almost every request from the edge
rather than from the application server or the database.

---

## 3. Ensure gzip/brotli is on

Verse payloads are highly compressible text and typically shrink by 70–80%.
Please confirm `Content-Encoding: gzip` (ideally `br`) is applied to Bible
responses. If compression is currently disabled or bypassed for this route,
enabling it is the cheapest single improvement available.

---

## 4. Latency: we are on a single VPS with no edge

We host on **Contabo**, a VPS. There is no scale-to-zero and therefore no
cold-start problem — but that removes only one cause of latency and leaves a
more important one in place.

A VPS serves from **one region**. Every request from a user in Lagos to a
Contabo box in Europe pays roughly 150–300 ms round-trip *before* the server
does any work. That cost is paid **per request**, which is what makes the
per-chapter request pattern in section 1 so expensive: 21 chapters of John is
21 × RTT of pure waiting, regardless of how fast the queries are.

This means the two highest-leverage items are:

1. **Put a CDN in front of `/api/bible/**`** (Cloudflare is sufficient and the
   free tier is fine). Combined with the immutable cache headers in section 2,
   scripture is then served from an edge node near the user instead of crossing
   a continent. This is the single biggest win available and requires no
   application code change.
2. **Reduce request count** via the whole-book endpoint in section 1, so the
   RTT is paid once per book rather than once per chapter.

Please also confirm on the VPS itself:

- **Nginx `gzip on`** for JSON responses (see section 3).
- **HTTP/2 (or HTTP/3) enabled** — avoids per-request connection overhead.
- **Keep-alive enabled** between Nginx and the Node process.
- **Database indexes** on the Bible collection covering
  `(translation, bookName, chapterNumber)`. An unindexed collection scan per
  chapter would be invisible in testing with a warm cache but slow in
  production.

### On the 30 s client timeout

The client uses a 30 s timeout with no retry on GETs. That value dates from an
earlier host where instances slept and could take 90 s to wake. On a VPS that
never sleeps, a request taking 30 s indicates a real server-side problem, so
this is worth shortening with a single retry — a long timeout currently hides
backend issues behind a spinner rather than surfacing them.

---

## 5. Offline translation packs

There is an existing pack mechanism on the client (`app/services/biblePack.ts`)
that downloads a gzipped JSON Bible and reads it locally. This is the path to
true YouVersion-grade behaviour, and it needs backend support to be usable:

```
GET /api/bible/packs?translation=web
```

```jsonc
{
  "success": true,
  "data": {
    "translation": "web",
    "version": "2024.1",
    "url": "https://cdn.example.com/bible/web-2024.1.json.gz",
    "sizeBytes": 4812345,
    "sha256": "<hex digest of the UNCOMPRESSED json>",
    "license": "Public Domain"
  }
}
```

Requirements:
- Host the pack on a CDN, not the app server.
- `sha256` must be over the **uncompressed** JSON — that is what the client
  verifies against.
- Bump `version` whenever content changes so clients can detect staleness.
- Confirm the licensing allows redistribution for each translation offered.

---

## 6. Smaller items

- **Drop `GET /api/bible/books/:book/chapters/:n`.** The client no longer calls
  it — it was only ever used to read a verse count that is derivable from the
  verses array. No action needed beyond knowing traffic will disappear.
- **Return `chapterCount` on every book** in `/api/bible/books` so the client
  can render chapter grids without a second request. Please confirm this is
  always populated.
- **Search pagination:** `/api/bible/search` should return a stable
  `total`/`hasMore` so results can page rather than loading everything.

---

## Priority

| # | Change | Impact | Effort |
|---|---|---|---|
| 1 | CDN in front of `/api/bible/**` | Very high | Low |
| 2 | Cache headers + ETag (enables #1) | Very high | Low |
| 3 | Confirm gzip/brotli + HTTP/2 | High | Very low |
| 4 | DB index on `(translation, bookName, chapterNumber)` | Medium–high | Very low |
| 5 | Whole-book endpoint | Very high | Medium |
| 6 | Pack manifest on CDN | High (true offline) | Medium |

Items 1–4 are configuration-level, need no application logic changes, and
should be done first — on a single-region VPS they address the dominant cost,
which is round-trip latency rather than server compute. Items 5–6 are what
close the remaining gap to YouVersion.
