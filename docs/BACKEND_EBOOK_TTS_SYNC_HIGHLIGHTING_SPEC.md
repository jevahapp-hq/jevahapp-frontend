# Ebook TTS Text Sync Highlighting — Backend Requirements (Timestamps/Segments)

**Last Updated:** December 2025  
**Purpose:** Specify the backend changes required to support **full text sync highlighting** (word/segment highlighting) while playing ebook TTS audio in the Jevah app.

---

## ✅ Summary

The backend is already able to generate and return an `audioUrl` for ebook narration. That is enough for a “listen” feature.

However, **accurate text highlighting synced to audio requires timestamps**. The frontend cannot reliably infer timestamps from raw audio alone.

### What backend must add

Add **time-aligned metadata** to the TTS response (or a dedicated endpoint) that maps **text → time**, at least at **sentence/paragraph segment** level (V1), and optionally **word-level** (V2).

---

## 🎯 Desired UX

When a user opens an ebook:

- Audio can play (TTS narration).
- The ebook text is displayed.
- As the audio progresses, the app highlights:
  - **Current sentence/segment** (minimum viable), and ideally
  - **Current word** (best experience).
- User can:
  - Tap a sentence/word to seek the audio to that point.
  - Use playback controls (play/pause/seek/speed).

---

## 🔌 Current Backend Endpoints (Existing)

These already exist per backend guidance:

- **GET** `/api/ebooks/:ebookId/tts`  
  Returns existing narration if available.

- **POST** `/api/ebooks/:ebookId/tts/generate`  
  Generates narration and returns `audioUrl` (may be cached).

These endpoints need to be **extended** to include timestamps/segments metadata.

---

## 🧩 Backend Options (Choose One)

### Option A (Recommended): Extend existing endpoints to include timing metadata

Return `timings` (segments/words) in:

- `GET /api/ebooks/:ebookId/tts`
- `POST /api/ebooks/:ebookId/tts/generate`

Pros:
- Single round-trip for audio + timings.
- Simple for frontend.

Cons:
- Large payload for long ebooks (word-level).

### Option B: Dedicated timing endpoint (Recommended for word-level)

Keep audio response lightweight and provide timings via:

- **GET** `/api/ebooks/:ebookId/tts/timings`

Pros:
- Timings can be paginated/chunked.
- Better caching and incremental loading.

Cons:
- Extra request.

---

## ✅ Required Response Fields (Minimum)

Backend must return:

- `audioUrl: string` (existing)
- `durationMs: number` (or `duration` in seconds) — **required for seeking & progress**
- `timings` — **required for sync highlighting**
  - V1: sentence/paragraph segments
  - V2: words

Also include:

- `textHash: string` — hash of the exact text used to generate this audio (so frontend knows timings match current text)
- `ttsConfig` — voice/speed/pitch/language used for generation
- `cached: boolean` — whether result was cached

---

## 📦 Proposed Schemas

### 1) V1 (Minimum viable): Segment-level timings (sentence/paragraph)

**Segment granularity is REQUIRED** at minimum. This enables highlighting + tap-to-seek with good performance.

```ts
type EbookTtsSegment = {
  id: string;              // stable id, e.g. "p12-s3"
  kind: "paragraph" | "sentence";
  startMs: number;         // inclusive
  endMs: number;           // exclusive (or omit if unknown and infer from next start)
  text: string;            // exact segment text used in audio
  page?: number;           // optional: page number if you have it
  charStart?: number;      // optional: offset in fullText
  charEnd?: number;        // optional: offset in fullText
};

type EbookTtsTimingsV1 = {
  format: "segments.v1";
  segments: EbookTtsSegment[];
};
```

### 2) V2 (Best): Word-level timings

Word-level timings enable karaoke-style highlighting.

```ts
type EbookTtsWord = {
  i: number;               // word index in tokenized text
  w: string;               // exact word/token
  startMs: number;
  endMs: number;
  charStart?: number;
  charEnd?: number;
  page?: number;
};

type EbookTtsTimingsV2 = {
  format: "words.v2";
  words: EbookTtsWord[];
};
```

### Unified Response

```ts
type EbookTtsResponse = {
  success: boolean;
  message?: string;
  data?: {
    audioUrl: string;
    durationMs: number;
    generatedAt: string;
    cached: boolean;

    // Must match the exact text used to generate the audio
    textHash: string;

    // For debugging + cache correctness
    ttsConfig: {
      provider: "google-tts";
      voicePreset?: "male" | "female" | "custom";
      voiceName?: string;
      languageCode: string;  // e.g. "en-US"
      speed: number;         // 0.25–4.0
      pitch: number;         // -20..20
    };

    // Choose one or both:
    timings?: EbookTtsTimingsV1 | EbookTtsTimingsV2;
  };
  code?: string;
};
```

---

## ✅ Example Responses

### Example: Segment-level timing included (V1)

```json
{
  "success": true,
  "data": {
    "audioUrl": "https://cdn.example.com/tts/ebook-123-en-US-female-1.mp3",
    "durationMs": 542312,
    "generatedAt": "2025-01-12T10:15:00.000Z",
    "cached": false,
    "textHash": "sha256:8c0c9b0a...",
    "ttsConfig": {
      "provider": "google-tts",
      "voicePreset": "female",
      "languageCode": "en-US",
      "speed": 1.0,
      "pitch": 0
    },
    "timings": {
      "format": "segments.v1",
      "segments": [
        { "id": "p1-s1", "kind": "sentence", "startMs": 0, "endMs": 4200, "text": "In the beginning, God created the heavens and the earth.", "page": 1 },
        { "id": "p1-s2", "kind": "sentence", "startMs": 4200, "endMs": 8200, "text": "Now the earth was formless and empty.", "page": 1 }
      ]
    }
  }
}
```

### Example: Word-level timing included (V2)

```json
{
  "success": true,
  "data": {
    "audioUrl": "https://cdn.example.com/tts/ebook-123-en-US-female-1.mp3",
    "durationMs": 542312,
    "generatedAt": "2025-01-12T10:15:00.000Z",
    "cached": true,
    "textHash": "sha256:8c0c9b0a...",
    "ttsConfig": {
      "provider": "google-tts",
      "voicePreset": "female",
      "languageCode": "en-US",
      "speed": 1.0,
      "pitch": 0
    },
    "timings": {
      "format": "words.v2",
      "words": [
        { "i": 0, "w": "In", "startMs": 0, "endMs": 220 },
        { "i": 1, "w": "the", "startMs": 220, "endMs": 360 },
        { "i": 2, "w": "beginning,", "startMs": 360, "endMs": 720 }
      ]
    }
  }
}
```

---

## 🧠 Implementation Guidance (Backend)

### A) Segment-level timings (V1) — Practical & recommended first

Google Cloud TTS can provide **timepoints** via **SSML marks** (supported via `enableTimePointing: [SSML_MARK]`).

Approach:

1. Extract full ebook text.
2. Split into **segments** (prefer sentences; fallback to paragraphs).
3. Build SSML:
   - Insert a `<mark name="seg:p1-s1"/>` before each segment.
4. Call Google TTS with `enableTimePointing`.
5. Google returns `timepoints[]` for the marks:
   - Convert each mark’s `timeSeconds` to `startMs`.
   - Compute `endMs` from the next segment’s start, and last segment end = `durationMs`.
6. Store `segments[]` + `audioUrl` + `durationMs` + `textHash`.

This yields accurate **segment highlighting** and **tap-to-seek** quickly.

### B) Word-level timings (V2) — Best UX, heavier implementation

Google TTS does **not** reliably return word timestamps directly.

To get word-level times, backend needs **forced alignment**, e.g.:

- Generate audio with TTS.
- Obtain the exact text used.
- Run a forced aligner pipeline:
  - Whisper timestamps + alignment refinement, or
  - Montreal Forced Aligner, Gentle, Aeneas, etc.

Output:
- word list with `startMs/endMs` for each token.

Recommendation:
- Ship **V1 segments first**, then iterate to V2 if needed.

---

## 🔐 Cache Correctness Requirements (Important)

Caching must consider:

- `ebookId`
- `textHash` (or text version)
- `languageCode`
- `voicePreset/voiceName`
- `speed`
- `pitch`

Otherwise the backend may return:
- audio generated with different settings, or
- timings that don’t match the text displayed.

---

## 🚦 Async Generation (Recommended Contract)

For large ebooks, narration generation may take time.

If generation is async:

- `POST /api/ebooks/:id/tts/generate` should return:
  - `202 Accepted`
  - `data.status = "processing"`
  - optional `data.retryAfterSeconds`
  - optional `data.progressPct`

Then frontend polls:

- `GET /api/ebooks/:id/tts`
  - returns `audioUrl + timings` when ready.

---

## ✅ Frontend Expectation (What we will implement once backend adds timings)

When backend returns `timings`:

- highlight current segment/word based on `positionMs`
- allow tapping a segment/word to seek audio to `startMs`
- show “Now reading…” UI with synced text

---

## 🧪 Test Checklist (Backend)

1. `GET /api/ebooks/:id/tts` when ready:
   - returns `audioUrl`, `durationMs`, `textHash`, and `timings`
2. Segment timing monotonic:
   - `startMs` strictly increases
   - `endMs > startMs`
3. `textHash` matches extracted/normalized text output used for narration
4. Cache correctness:
   - generating with different speed/voice returns different cached object or regenerates
5. Large ebook handling:
   - either returns 202 with processing state or completes within timeout

---

## ✅ Deliverables for Backend Team

- Extend TTS endpoints to include:
  - `durationMs`
  - `textHash`
  - `timings` (segments.v1 at minimum)
- (Optional) add `GET /api/ebooks/:id/tts/timings` for big payloads
- Ensure caching keys include voice/speed/pitch/language + textHash


