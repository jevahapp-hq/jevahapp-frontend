# Frontend Ebook PDF Reader + TTS Sync Flow (Why TTS Was 404 + How It Works Now)

**Last Updated:** December 2025  
**Purpose:** Explain the full frontend flow for opening/reading ebooks (PDF), how users scroll/read, how TTS is triggered, how sync highlighting works, and why the earlier implementation got stuck at `HTTP 404: TTS audio not generated`.

---

## 1) User Flow: How a user opens and reads an ebook

### Entry points (where users tap an ebook)

The app can open an ebook from multiple surfaces:

- **Feed / media cards** → `src/features/media/components/EbookCard.tsx`
- **Library → Ebooks** → `app/screens/library/EbooksLibrary.tsx`
- **Library → All items** → `app/screens/library/AllLibrary.tsx`
- **Ebook screens** → `app/categories/ViewContent/ViewEbook.tsx` (updated to open PDF viewer)

### Navigation to reader

When an ebook is tapped, the app navigates to:

- `app/reader/PdfViewer.tsx`

and passes route params:

- `url`: the PDF URL (fileUrl/pdfUrl/mediaUrl)
- `ebookId`: the ebook’s backend ID (`_id`)
- `title`
- `desc`

### How user reads/scrolls

`PdfViewer` renders the PDF inside a `WebView`.

- User scrolls vertically like a normal document.
- The viewer captures page changes via injected JS + `onMessage`.
- The header shows `Page X of Y` based on page events.

### PDF loading behavior

`PdfViewer` attempts multiple strategies:

- **Primary**: load direct PDF URL (or downloaded local file on iOS)
- **Fallback**: if WebView fails, uses Google Docs viewer URL

---

## 2) TTS Flow: What happens when the ebook opens

### Where TTS lives in the UI

`PdfViewer` shows a bottom narration player:

- `app/components/EbookTtsPlayer.tsx`

This provides:
- Generate/refresh
- Play/pause
- Seek slider
- Speed presets
- Voice toggle (male/female)
- Synced text panel (segments highlighting + tap-to-seek)

### What the frontend calls

On open (auto):

1. `GET /api/ebooks/:ebookId/tts?includeTimings=true`
2. If audio exists: play is available immediately.
3. If audio does **not** exist: frontend automatically triggers generation:
   - `POST /api/ebooks/:ebookId/tts/generate?voice=female&speed=1.0`

### Why “stop other audio” is needed

When narration starts, we stop other audio (global music player) to prevent overlapping playback and UI state conflicts.

---

## 3) Sync Highlighting Flow (Segments)

Backend returns (expected):

```json
{
  "success": true,
  "data": {
    "audioUrl": "...",
    "durationMs": 542312,
    "timings": {
      "format": "segments.v1",
      "segments": [
        { "id": "s1", "startMs": 0, "endMs": 4200, "text": "..." }
      ]
    }
  }
}
```

Frontend behavior:

- While audio plays, we track `positionMs`.
- The current active segment is the one where:
  - `startMs <= positionMs < endMs`
- We highlight the active segment.
- We auto-scroll the text panel to keep the active segment in view.
- If user taps a segment, we:
  - seek audio to `segment.startMs`
  - resume playback (if paused)

---

## 4) Why the earlier implementation got stuck at “HTTP 404”

### Root cause

The backend uses **HTTP 404** to indicate:

> “TTS audio not generated for this ebook”

Our original frontend `getEbookTts()` treated **any non-200** as a thrown error.

So the flow was:

1. `GET /api/ebooks/:id/tts` → 404
2. frontend throws and stops
3. `POST /tts/generate` is never called

Result:

Users can refresh forever and always see the same 404.

### Fix implemented

We updated:

- `app/services/ebookTtsApi.ts`
- `app/components/EbookTtsPlayer.tsx`

So that:

- `GET /api/ebooks/:ebookId/tts?includeTimings=true`
  - If it returns `200 success=false` → generate
  - If it returns **404** → treat as “not generated yet” (not fatal) → generate

---

## 5) What backend must guarantee for integration to work

To make this reliable, backend must ensure:

### A) Correct ID

The `:ebookId` in:

- `GET /api/ebooks/:ebookId/tts`
- `POST /api/ebooks/:ebookId/tts/generate`

must be the **same `_id` used by the ebooks/media collection**, not the file URL.

### B) Clear “not generated” behavior

Backend should do one of these consistently:

- **Preferred**: `200` with `{ success:false, data:{ canGenerate:true } }`
- **Allowed**: `404` with a JSON body describing not generated

Frontend now supports both.

### C) Timings for sync highlighting

For highlighting to work:

- `GET /api/ebooks/:ebookId/tts?includeTimings=true` must include:
  - `data.timings.format = "segments.v1"`
  - `data.timings.segments[]` containing:
    - `id`, `startMs`, `endMs`, `text`

Without `timings.segments`, audio can still play, but highlighting cannot work.

---

## 6) Why it may still not generate (backend-side reasons)

If the app still cannot generate TTS after this fix, backend should check:

- **Route mismatch**: endpoint path differs from `/api/ebooks/:id/tts` and `/tts/generate`
- **Auth**: endpoint requires auth but frontend calls without/optional token
- **Ebook not found**: backend does not recognize the `_id` being passed
- **TTS service config**: missing Google credentials or provider errors
- **Async generation**: returning `202` but never making audio available on follow-up GET

---

## 7) What to tell backend (quick message)

Frontend now:

- opens ebooks in `PdfViewer`
- passes `ebookId` (`_id`) into the reader
- calls `GET /api/ebooks/:id/tts?includeTimings=true`
- if missing (404 or success=false), calls `POST /api/ebooks/:id/tts/generate`
- plays returned `audioUrl`
- uses `timings.segments` to highlight and tap-to-seek

Backend must:

- accept `_id` as `:ebookId`
- return `audioUrl` after generate
- return `timings.segments` when `includeTimings=true`


