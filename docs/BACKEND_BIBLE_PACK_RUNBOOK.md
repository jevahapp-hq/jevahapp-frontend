# Backend runbook — ship the WEB Bible pack

**Date:** 2026-08-16  
**Audience:** API / Contabo (`jevahapp` backend)  
**Goal:** Put the WEB gzip on R2, flip catalog `offline: true`, so mobile shows **Download ~X MB**.  
**Do not:** stream the gzip through the 8GB Node box, pack NIV/ESV, or add SQLite.

Mobile Phase 1 + pack **download code** are already shipped. Nothing downloads until this job succeeds.

**API:** `https://api.jevahapp.com/api`  
**Contract:** [`BACKEND_BIBLE_OFFLINE_TRANSLATIONS.md`](./BACKEND_BIBLE_OFFLINE_TRANSLATIONS.md)

---

## 0. Done vs you

| Already live | You do now |
|--------------|------------|
| `GET /api/bible/translations` (`defaultId: "web"`) | Run `npm run bible:pack` for **WEB only** |
| `?translation=web` on scripture GET | Upload gzip to **R2**, not Contabo disk-as-CDN |
| Manifest/pack routes exist; 404 `Pack unavailable` is expected | After upload: catalog row `offline: true` + `packBytes` |
| Mobile downloads `manifest.packUrl`, inflates, sha256 | `GET .../pack` must **302** to R2 |

KJV in the catalog does **not** mean a KJV pack exists. Only WEB this run.

---

## 1. Preconditions (fail the job if any are missing)

- [ ] Mongo WEB corpus is today’s live default (`defaultId` stays `"web"`).
- [ ] Book `name` strings match the live API (`"Song of Solomon"`, `"John"`, not slugs).
- [ ] R2 (or equivalent HTTPS CDN) credentials on the box: bucket, account, access key, public base URL.
- [ ] Script exists: `npm run bible:pack` (build JSON → gzip → sha256 uncompressed → PUT → write manifest).
- [ ] Pack route **302s** to `packUrl`. Do not `res.send(gzip)` from Node.

If R2 env is empty, stop. A pack on the VPS will melt the box when phones download it.

---

## 2. Build + publish WEB

On Contabo, in the API repo, production env loaded:

```bash
# 1) Build from Mongo WEB only
npm run bible:pack -- --id=web
# if the script has no flags, confirm it defaults to WEB / public-domain

# 2) Confirm local artifact before upload
#    uncompressed JSON schema jevah-bible-pack-v1
#    gzip < 8 MB (hard fail if >= 12 MB)
```

**Uncompressed JSON (then gzip)** — one object, not NDJSON:

```json
{
  "schema": "jevah-bible-pack-v1",
  "translationId": "web",
  "packVersion": 1,
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
    ],
    "Song of Solomon:1": [{ "v": 1, "t": "..." }],
    "John:3": [{ "v": 16, "t": "For God so loved the world..." }]
  }
}
```

| Rule | Why |
|------|-----|
| Chapter key = `{BibleBook.name}:{n}` | Mobile does `pack.chapters["John:3"]` |
| Verses = `{ "v", "t" }` only | No commentary, footnotes, audio |
| `contentHash` = `sha256-` + hex of **uncompressed UTF-8 JSON** | Mobile hashes after inflate; mismatch → toast “Download again” |
| `packVersion` integer, bump on every publish | Mobile re-downloads when remote > local |
| Object key order stable (or hash the exact bytes you gzip) | Hash the file you gzip, not a re-serialized copy |

**PUT to R2** example key:

`bible/packs/web/v1.json.gz`

Public URL must be HTTPS, e.g.

`https://cdn.jevahapp.com/bible/packs/web/v1.json.gz`

Headers on that object:

```http
Content-Type: application/gzip
Cache-Control: public, max-age=31536000, immutable
```

(`immutable` only if the URL contains the version.)

---

## 3. Flip catalog + manifest (same transaction)

After the object is reachable on CDN:

`GET /api/bible/translations` WEB row:

```json
{
  "id": "web",
  "abbreviation": "WEB",
  "name": "World English Bible",
  "language": "en",
  "license": "public-domain",
  "offline": true,
  "packBytes": 4194304,
  "verseCount": 31102,
  "isDefault": true
}
```

- `offline: true` **only** after the gzip HEAD/GET on `packUrl` returns 200.
- `packBytes` = gzip size in bytes (exact or ceiling). Mobile hides Download if this is null/0.
- KJV (and anything without a file): `offline: false`, `packBytes: null`.

`GET /api/bible/translations/web/manifest`:

```json
{
  "success": true,
  "data": {
    "translationId": "web",
    "packVersion": 1,
    "contentHash": "sha256-<64 hex of uncompressed json>",
    "bytes": 4194304,
    "encoding": "gzip-json",
    "schema": "jevah-bible-pack-v1",
    "packUrl": "https://cdn.jevahapp.com/bible/packs/web/v1.json.gz",
    "license": "public-domain",
    "updatedAt": "2026-08-16T00:00:00.000Z"
  }
}
```

`GET /api/bible/translations/web/pack` → **302** `Location: <packUrl>`.

Until the file exists, keep:

- catalog `offline: false`
- manifest/pack **404** `{ "success": false, "error": "Pack unavailable" }`  
  Never 500.

---

## 4. Verify on the box (copy/paste)

Replace the CDN host if yours differs.

```bash
API=https://api.jevahapp.com/api

curl -sS "$API/bible/translations" | jq '.data.translations[] | {id,offline,packBytes,license}'

# Expect WEB: offline true, packBytes > 0

curl -sS "$API/bible/translations/web/manifest" | jq '.data | {packVersion,bytes,schema,encoding,packUrl,contentHash}'

# Hash prefix
curl -sS "$API/bible/translations/web/manifest" | jq -r '.data.contentHash' | grep -E '^sha256-[0-9a-f]{64}$'

# Pack route must redirect off Node
curl -sSI "$API/bible/translations/web/pack" | grep -Ei 'HTTP/|location:'

# CDN object
PACK_URL=$(curl -sS "$API/bible/translations/web/manifest" | jq -r '.data.packUrl')
curl -sSI "$PACK_URL" | grep -Ei 'HTTP/|content-type|content-length|cache-control'

# Size + inflate + hash (must match manifest)
curl -sS "$PACK_URL" -o /tmp/web.json.gz
stat -c%s /tmp/web.json.gz
gunzip -c /tmp/web.json.gz > /tmp/web.json
python3 - <<'PY'
import hashlib, json, pathlib
raw = pathlib.Path("/tmp/web.json").read_bytes()
doc = json.loads(raw)
assert doc["schema"] == "jevah-bible-pack-v1"
assert doc["translationId"] == "web"
assert "John:3" in doc["chapters"]
assert "Song of Solomon:1" in doc["chapters"]
print("sha256-" + hashlib.sha256(raw).hexdigest())
print("gzip_ok verses_john3", len(doc["chapters"]["John:3"]))
PY
```

`sha256-…` from Python **must equal** `data.contentHash`. If not, mobile will delete the pack and toast **Download again**.

Spot-check live API names vs pack keys:

```bash
curl -sS "$API/bible/books?translation=web" | jq -r '.data[].name' | head
# every name must appear as "<name>:1" in the pack
```

Lite guard (optional): if `packBytes > 12000000` and request has `X-Jevah-Client: lite`, manifest/pack **400** `{ "error": "Pack too large for lite" }`. WEB should be well under 8 MB gzip.

---

## 5. Errors mobile already handles

| Status | `error` | Keep this string |
|--------|---------|------------------|
| 404 | `Unknown translation` | Unknown id |
| 404 | `Pack unavailable` | Job not run / R2 miss |
| 403 | `Translation requires license` | NIV/ESV/NLT |
| 400 | `Pack too large for lite` | gzip &gt; 12 MB + lite header |

Do not 500 while the file is missing.

---

## 6. What not to do

| Skip | Why |
|------|-----|
| `bible:pack` for NIV/ESV/NLT/AMP | Licensed. Redistributing a public gzip is a legal problem. Catalog may list them `license: "licensed"`, `offline: false`. |
| KJV in this first run | Second job, after WEB is proven on a phone. |
| Gzip body from Contabo Node | 4 MB × N readers saturates the 8 GB VPS. 302 to R2. |
| Audio / TTS in the pack | Mobile Listen is `expo-speech`. |
| Changing book names | Pack keys must match today’s `GET /api/bible/books` names. |
| Local FTS / SQLite | Mobile Lite cannot ship a native module for this; search stays `GET /api/bible/search`. |

---

## 7. After WEB is green (later)

1. Tell frontend: catalog WEB is `offline: true` (they already have Download).
2. Phone: picker → Download → airplane mode → John 3 still reads. Search still needs network.
3. Then a second `bible:pack` for **KJV** only (`id: kjv`, public domain). Mobile Lite keeps **one** pack; a new download deletes WEB.

---

## 8. Checklist

- [ ] R2 credentials on Contabo; public `packUrl` GETs 200
- [ ] `npm run bible:pack` for WEB only
- [ ] gzip &lt; 8 MB; uncompressed sha256 stored as `sha256-<hex>`
- [ ] Keys include `John:3` and `Song of Solomon:1`
- [ ] Catalog WEB `offline: true`, `packBytes` set
- [ ] Manifest 200 with `schema: jevah-bible-pack-v1`, `encoding: gzip-json`
- [ ] `GET .../web/pack` → 302 to R2 (not a Node body)
- [ ] CDN `Cache-Control` long-cache on versioned URL
- [ ] KJV/NIV still `offline: false` until packed / licensed
- [ ] Ping mobile: Download appears on the WEB row
