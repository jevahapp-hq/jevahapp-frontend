# Backend Handoff: Offline Bible Translations

**Purpose:** Contract for YouVersion-style offline scripture. Frontend and backend should implement against this doc together. Existing `/api/bible/*` chapter/verse routes stay; this adds **translation identity**, **versioned packs**, and **license-safe downloads**.

**Status:** Phase 1 is live (`defaultId` **`web`**). Phase 2 pack **download path is implemented** on mobile. Catalog `offline: false` until Contabo runs `npm run bible:pack`; then the same picker shows Download.

**Related FE:** `app/services/bibleApiService.ts`, `app/services/bibleCache.ts`, `app/services/bibleTranslations.ts`, `app/components/bible/BibleTranslationPicker.tsx`, `app/components/bible/BibleReaderScreen.tsx`

---

## Summary

| Today | Target |
|-------|--------|
| Every chapter hits `GET /api/bible/books/:name/chapters/:n/verses` | First open of a translation downloads **one pack**; after that, reader is local |
| Cache keys ignore translation | All scripture keyed by `translationId` (e.g. `web`, `kjv`) |
| No translation picker | Catalog + selected translation + download state |
| Search always online | Pack includes verse text so later we can FTS locally; Phase 1 search can stay online |
| 2GB Lite OOMs on big media | **One pack at a time on Lite**; public-domain first (WEB/KJV), licensed NIV later |

YouVersion does this with a local SQLite (or similar) per translation, last-read restore, and prefetch. We do the same idea with a **gzip JSON pack on CDN** so Expo Go / Lite devices do not need a native SQLite rebuild.

---

## Phase 1 (ship first — both sides)

1. Add `?translation={id}` to existing verse/chapter/book routes (default current corpus).
2. Ship `GET /api/bible/translations` catalog.
3. FE keys cache + last-read by `translationId`.
4. FE translation picker. If catalog 404s, hide picker and keep today’s default corpus.

## Phase 2 (offline pack)

5. `GET /api/bible/translations/:id/manifest`
6. `GET /api/bible/translations/:id/pack` → CDN gzip JSON (see pack schema).
7. FE downloads pack once, reads chapters from disk, still SWR-refresh if online.

## Phase 3 (later)

8. Local search over the pack.
9. Licensed translations (NIV etc.) behind entitlement.
10. Optional delta packs (`fromVersion` → `toVersion`).

---

## 1. Translation catalog

`GET /api/bible/translations`  
Public. No auth.

```json
{
  "success": true,
  "data": {
    "defaultId": "web",
    "translations": [
      {
        "id": "web",
        "abbreviation": "WEB",
        "name": "World English Bible",
        "language": "en",
        "languageName": "English",
        "license": "public-domain",
        "offline": true,
        "packBytes": 4200000,
        "verseCount": 31102,
        "isDefault": true
      },
      {
        "id": "kjv",
        "abbreviation": "KJV",
        "name": "King James Version",
        "language": "en",
        "languageName": "English",
        "license": "public-domain",
        "offline": true,
        "packBytes": 4500000,
        "verseCount": 31102,
        "isDefault": false
      }
    ]
  }
}
```

| Field | Rules |
|-------|--------|
| `id` | Stable slug, lowercase, URL-safe. Never change. |
| `abbreviation` | Short chip label (WEB, KJV, NIV). |
| `license` | `public-domain` \| `permissive` \| `licensed`. Lite / anonymous may only auto-download `public-domain`. |
| `offline` | `true` only if a pack exists for Phase 2. |
| `packBytes` | Exact or ceiling. FE shows “~4.2 MB” before download. |
| `isDefault` | Exactly one `true`. Must match today’s live corpus so old clients don’t jump translation. |

**Confirm with BE:** `defaultId` is **`web`** (Mongo `WEB` — today’s live corpus).

---

## 2. Existing scripture routes (compat)

Keep current paths. Add optional query:

`?translation=web`

Apply to:

- `GET /api/bible/books`
- `GET /api/bible/books/:bookName`
- `GET /api/bible/books/:bookName/chapters`
- `GET /api/bible/books/:bookName/chapters/:n`
- `GET /api/bible/books/:bookName/chapters/:n/verses`
- `GET /api/bible/books/:bookName/chapters/:n/verses/:v`
- `GET /api/bible/search`
- `GET /api/bible/verses/daily`
- `GET /api/bible/verses/random`

If `translation` omitted → default corpus (today’s data).  
If unknown id → `404` `{ "success": false, "error": "Unknown translation" }`.

**FE behavior:** `?translation=` is sent **only after** `GET /api/bible/translations` returns 200 with a non-empty list. Catalog 404 → picker hidden, no query param, today’s corpus unchanged. Do not 400 on unknown query keys while rolling this out.

Each verse object **must include** `translation` (the id):

```json
{
  "_id": "...",
  "bookName": "John",
  "chapterNumber": 3,
  "verseNumber": 16,
  "text": "For God so loved the world...",
  "translation": "web"
}
```

Books/chapters payloads stay as today (`name`, `testament`, `chapterCount`, `verseCount`).

---

## 3. Pack manifest (Phase 2)

`GET /api/bible/translations/:id/manifest`  
Public for `public-domain`. Auth/entitlement for `licensed`.

```json
{
  "success": true,
  "data": {
    "translationId": "web",
    "packVersion": 3,
    "contentHash": "sha256-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "bytes": 4194304,
    "encoding": "gzip-json",
    "schema": "jevah-bible-pack-v1",
    "packUrl": "https://cdn.jevahapp.com/bible/packs/web/v3.json.gz",
    "license": "public-domain",
    "updatedAt": "2026-08-14T00:00:00.000Z"
  }
}
```

| Field | Rules |
|-------|--------|
| `packVersion` | Integer, monotonic per translation. FE re-downloads when local version &lt; remote. |
| `contentHash` | `sha256-` + hex of **uncompressed** JSON. FE verifies after inflate. |
| `encoding` | Phase 2: `gzip-json` only. |
| `packUrl` | CDN, HTTPS, long-cache (`Cache-Control: public, max-age=31536000, immutable` if URL contains version). |
| `schema` | Must be `jevah-bible-pack-v1` until we bump. |

`404` if pack not built yet. FE then keeps using live chapter APIs.

---

## 4. Pack file schema (`jevah-bible-pack-v1`)

Uncompressed JSON (then gzip). One object, not NDJSON.

```json
{
  "schema": "jevah-bible-pack-v1",
  "translationId": "web",
  "packVersion": 3,
  "books": [
    {
      "id": "GEN",
      "name": "Genesis",
      "testament": "old",
      "chapterCount": 50,
      "verseCount": 1533
    }
  ],
  "chapters": {
    "Genesis:1": [
      { "v": 1, "t": "In the beginning God created the heavens and the earth." }
    ]
  }
}
```

**Size rules**

- Key format: `{bookName}:{chapterNumber}` matching `BibleBook.name` from the API (same spelling as today: `"Song of Solomon"` not `"SongOfSolomon"`).
- Verse: `{ "v": number, "t": string }` only. No commentary, no cross-refs in the pack.
- Canonical book `id` (`GEN`) is optional for FE but useful for BE.
- Target: **under 8 MB gzip** per English public-domain translation. Reject packs over 12 MB for Lite (`X-Jevah-Client: lite` or FE check on `packBytes`).

Do **not** put audio/TTS in the pack. Listen stays on-device `expo-speech`.

---

## 5. Download endpoint

`GET /api/bible/translations/:id/pack`

- `302` to `packUrl`, **or** stream the gzip with `Content-Type: application/gzip` and `Content-Length`.
- FE prefers `manifest.packUrl` (CDN) so API boxes are not in the download path.
- Range requests optional; not required for Phase 2 (single GET).

---

## 6. Errors

| Case | Status | Body |
|------|--------|------|
| Unknown translation | 404 | `{ "success": false, "error": "Unknown translation" }` |
| Pack not built | 404 | `{ "success": false, "error": "Pack unavailable" }` |
| Licensed, no entitlement | 403 | `{ "success": false, "error": "Translation requires license" }` |
| Lite asked for pack &gt; 12MB | 400 | `{ "success": false, "error": "Pack too large for lite" }` |

---

## 7. Frontend behavior (so BE can test)

| Event | FE |
|-------|----|
| Cold Bible open | Catalog fetch. Selected id from disk, else `defaultId`. |
| Open chapter, pack installed | Read `chapters["Genesis:1"]` from pack. No verse API. |
| Open chapter, no pack | `GET .../verses?translation={id}` (only if catalog 200) + SWR MMKV cache scoped by translation. |
| Switch translation | Clear reader, load that translation’s cache/pack. Last-read is per translation. |
| Lite | At most **one** downloaded pack. New download deletes the previous. |
| Hash mismatch | Delete local pack, fall back to live API, toast “Download again”. |

---

## 8. License / legal (do not skip)

- **WEB, KJV, ASV:** public domain — OK to pack and CDN.
- **NIV, ESV, NLT, AMP:** licensed. Do not put full text in a public pack. Catalog may list them with `"offline": false, "license": "licensed"` until legal is signed.
- Packs must not include publisher footnotes if the license forbids it.

---

## 9. Out of scope

- Audio Bible files in the pack
- Commentary / cross-references in the pack (keep existing live endpoints)
- Changing book names independently of today’s API
- Forcing a native SQLite module (we can add later; pack JSON works in Expo Go)

---

## 10. Suggested BE checklist

- [ ] Confirm `defaultId` equals current production corpus
- [ ] `?translation=` on all scripture GET routes
- [ ] Catalog endpoint
- [ ] Manifest + CDN pack for WEB (then KJV)
- [ ] `translation` field on every verse JSON
- [ ] Pack gzip under 8MB, sha256 of uncompressed JSON
- [ ] Cache-Control on CDN pack URLs
- [ ] 404 pack-unavailable while building, not 500

---

## 11. FE checklist (this repo)

- [x] Cache + last-read by `translationId`
- [x] Picker reads `data.defaultId` + `data.translations[]` (not `{ code, name }`)
- [x] `?translation=` only after catalog 200 (404/500 → hide picker, omit query)
- [x] Manifest 404 → stay on live verse API
- [x] When `offline: true`: download `packUrl`, inflate, verify `contentHash`
- [x] Reader uses `chapters["Book:n"]` when pack is present
- [x] Lite: one pack; skip if `packBytes > 12e6`
- [x] Never pack `license: "licensed"`

## 12. Corroboration (run together)

| Step | Backend | Frontend (this app) |
|------|---------|---------------------|
| Catalog 200 | `{ defaultId: "web", translations: [{ id: "web", ... }] }` | WEB chip in Bible header. Scripture GETs add `?translation=web` |
| Catalog 404/500 | error | Chip hidden. Chapter GETs have **no** `?translation=` (corpus still WEB) |
| Unknown id | 404 `{ "error": "Unknown translation" }` | FE only sends ids from catalog |
| Manifest/pack | 404 `Pack unavailable` | Reader stays on live chapter API |
| Pack ready later | `offline: true` + gzip on R2 | Phase 2 download; Lite deletes the previous pack |
