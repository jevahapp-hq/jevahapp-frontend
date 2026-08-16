# Frontend — How we consume Bible

**Audience:** `jevahapp-frontend` + backend corroboration  
**Contract:** [`BACKEND_BIBLE_OFFLINE_TRANSLATIONS.md`](./BACKEND_BIBLE_OFFLINE_TRANSLATIONS.md)  
**Default corpus:** `web` (Mongo `WEB`)  
**Auth:** scripture routes are **public** (`requireAuth: false`)

This is what the app actually calls and how it paints the reader.

---

## 0. One rule

**If a pack is installed for this `translationId`, `chapters["John:3"]` is the source of truth.** Otherwise live chapter APIs + MMKV SWR. Listen is on-device TTS (`expo-speech`), not an audio file and not the global playback session.

```text
GET /api/bible/translations     → chip + ?translation= gate + offline download
GET .../manifest                → packUrl + contentHash (only when offline: true)
GET packUrl (CDN)               → gzip JSON, inflate, sha256
chapters["Book:n"]              → verse text when pack is on disk
GET .../verses?translation=web  → when no pack / hash fail / offline: false
expo-speech                     → Listen bar
```

---

## 1. Where it lives in the app

```text
BottomNav "Bible"
  → HomeScreen (suppress mini player, pause audio/video session)
    → BibleScreen
      → BibleOnboarding          local daily verse (not the API)
      → BibleReaderScreen        catalog, last-read, books / chapters / reader / search
        → BibleBookSelector
        → BibleChapterSelector
        → BibleReader            verses + TTS
        → BibleSearch
        → BibleTranslationPicker
```

| File | Role |
|------|------|
| `app/services/bibleApiService.ts` | All HTTP |
| `app/services/bibleCache.ts` | MMKV books / chapters / verses / last-read |
| `app/services/bibleTranslations.ts` | Catalog parse, selected id, `?translation=` gate |
| `app/services/biblePack.ts` | Download gzip, inflate, hash, local `chapters["Book:n"]` |
| `app/hooks/useTextToSpeech.ts` | Listen |
| `app/services/dailyVerseService.ts` | Hardcoded onboarding verse of the day |

---

## 2. Open Bible (cold)

1. Home tab **Bible** → hide mini player (`setMiniPlayerSuppressed(true)`), `pausePlaybackSession()`.
2. Onboarding splash. Daily verse is **local** (`dailyVerseService.getTodaysVerse()`). We do **not** call `GET /api/bible/verses/daily`.
3. Enter reader → `BibleReaderScreen`:
   - Restore last-read for the selected translation (`bible_last_read_v2:{id}`).
   - `GET /api/bible/translations` (no auth).

### Catalog 200

Parse **`data.defaultId` + `data.translations[]`** (`id` slugs, not `{ code, name }`).

- Show **WEB** chip.
- Persist selected id (`web` unless the user picked another).
- From this point, scripture GETs append `?translation=web` (lowercase).

### Catalog 404 / 500

- Hide chip.
- Clear catalog-available flag.
- **Do not** send `?translation=`. Omitted still means WEB on the backend.

We never send an id that is not in the catalog.

---

## 3. Scripture we actually hit

All of these go through `bibleApiService` and, after catalog 200, `translationQuery()`.

| UI | Method | HTTP |
|----|--------|------|
| Book list | `getAllBooks()` | `GET /api/bible/books` |
| Chapter grid | `getBookChapters(name)` | `GET /api/bible/books/{name}/chapters` |
| Reader header count | `getChapter(name, n)` | `GET /api/bible/books/{name}/chapters/{n}` |
| Verse list | `getChapterVerses(name, n)` | `GET /api/bible/books/{name}/chapters/{n}/verses` |
| Prefetch next chapter | same, `n + 1` | same, fire-and-forget |
| Search (try first) | `searchBibleAdvanced(q)` | `GET /api/bible/search/advanced?q=&limit=20` |
| Search fallback | `searchBible(q)` | `GET /api/bible/search?q=` |

Book names are API names as-is (`John`, `Song of Solomon`). They are path-encoded, not slugified.

Expected verse object:

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

We paint `text` in a `FlatList`. We do not need commentary, cross-refs, or audio URLs on this payload.

---

## 4. How cache works (not a pack)

Stale-while-revalidate:

1. If MMKV has the row → return it immediately.
2. Kick a network refresh in the background and overwrite the key.

Keys (always include translation id, default `web`):

```text
bible_books_v2:{translationId}
bible_chapters_v2:{translationId}:{bookName}
bible_verses_v2:{translationId}:{bookName}:{chapterNumber}
bible_last_read_v2:{translationId}
bible_translation_id_v1
bible_translation_catalog_v1
```

Switching translation keeps the same book/chapter and reloads verses for the new id. Last-read is **per translation**.

This is **not** offline. A chapter never opened (and not prefetched) still needs the network. Expo Go without native MMKV uses an in-memory/AsyncStorage fallback — cache is weaker until a native rebuild.

---

## 5. Search

`BibleSearch` tries advanced first, then regular:

```http
GET /api/bible/search/advanced?q=love&limit=20&translation=web
GET /api/bible/search?q=love&limit=20&translation=web
```

Optional filters: `book`, `testament=old|new`.

Tap a result → set book + chapter → reader. Search is **always online**. No local FTS until a pack exists.

---

## 6. Listen (TTS)

Not consumed from the Bible API.

- `BibleReader` concatenates verse words and calls `expo-speech`.
- The glass bar starts **hidden**; tap the page to show it; it auto-shows while speaking.
- Bible tab does **not** use `useGlobalAudioPlayerStore`. Feed audio stays paused and the mini bar stays hidden.

Do not put TTS/audio files in a translation pack.

---

## 7. Client methods we do **not** use in UI

Wired on `bibleApiService` but no screen calls them today:

| Method | Route |
|--------|--------|
| `getDailyVerse` | `/api/bible/verses/daily` |
| `getRandomVerse` | `/api/bible/verses/random` |
| `getPopularVerses` | `/api/bible/verses/popular` |
| `getVerseRange` | `/api/bible/verses/range/{ref}` |
| `getCrossReferences` | `.../verses/{v}/cross-references` |
| `getCommentary` | `.../verses/{v}/commentary` |

Onboarding’s “verse of the day” is the local list, labeled NIV in that file — it is **not** the WEB API corpus.

Upload “Suggested Bible Verses” come from `generateDescription` (AI strings), not `/api/bible/*`.

---

## 8. Packs (Phase 2)

Implemented in `biblePack.ts`. The picker grows a download button only when catalog `offline: true` and `packBytes` is set. `license: "licensed"` never downloads. Lite skips `packBytes > 12_000_000` and keeps **one** pack on disk.

```text
offline: true
  → GET /api/bible/translations/{id}/manifest
  → 404 Pack unavailable → live verses (same as today)
  → 403 Translation requires license → no pack UI
  → 200 → GET data.packUrl (CDN, not Node)
  → gunzip → JSON schema jevah-bible-pack-v1
  → sha256(uncompressed utf8) vs contentHash
  → persist gzip at documentDirectory/bible-packs/{id}.json.gz
```

Hash mismatch → delete local pack, toast **Download again**, fall back to live verses.

Reader: `pack.chapters["Song of Solomon:1"]` → `{ v, t }[]`. Search stays `GET /api/bible/search`. TTS stays `expo-speech`.

Until Contabo runs `npm run bible:pack`, catalog stays `offline: false` and nothing downloads.

---

## 9. Flow (happy path)

```text
Open Bible tab
  pause feed audio/video, hide mini player
  GET /api/bible/translations
    200 → chip WEB, enable ?translation=web
    4xx/5xx → no chip, omit query
  restore last-read (John 3, etc.)
  GET /api/bible/books                          (or MMKV)
  GET /api/bible/books/John/chapters
  GET /api/bible/books/John/chapters/3
  GET /api/bible/books/John/chapters/3/verses   (or MMKV, then refresh)
  GET /api/bible/books/John/chapters/4/verses   (prefetch, ignore fail)
  Listen → expo-speech on verse text
```

---

## 10. What backend should assume we send

| After catalog 200 | Before / on catalog error |
|-------------------|---------------------------|
| `?translation=web` (lowercase) on every scripture GET above | no `translation` query |
| Only ids from `data.translations[]` | treat omitted as WEB |
| Public, no Bearer required | same |
| `X-Jevah-Client: lite` on Lite devices | same (from `BaseApiClient`) |
