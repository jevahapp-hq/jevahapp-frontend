# Backend Handoff — Video duration + seekable playback

**Date:** 30 Jul 2026 (rev)  
**Why:** Mobile scrubber needs a known duration. TikTok-style seek is `% of duration → absolute time`. When `duration` is missing and the stream is incomplete HLS, the player reports `duration = 0` and seeking cannot work.

## How TikTok does it (target)

1. **Transcode every upload** to progressive MP4 (moov atom at start / faststart) **and** VOD HLS.
2. Persist **`duration` in seconds** on the media document at finalize (ffprobe / mediainfo).
3. Return `duration` on every feed/list/detail payload.
4. HLS playlists are **VOD** (`#EXT-X-PLAYLIST-TYPE:VOD` + known `#EXTINF` sum), never live-like for on-demand posts.
5. Client enables full absolute seek after duration is known (or uses progressive MP4).

## What mobile needs from API

### On upload finalize / media create response
```json
{
  "_id": "...",
  "fileUrl": "https://…/video.mp4",
  "playbackUrl": "https://…/master.m3u8",
  "hlsUrl": "https://…/master.m3u8",
  "duration": 142.5,
  "processingStatus": "ready"
}
```

- `duration` = **seconds** (float ok), always set when processing completes.
- Prefer a seekable **MP4** `fileUrl` with faststart (extension optional if `fileMimeType` is `video/mp4`).
- If only HLS is ready, playlist must expose total duration (VOD).
- **Most recent uploads fail seek today** because finalize often omits `duration` and may prefer HLS before duration is known — older curated videos already have `duration` set.

### On feed / get-by-id
Always include `duration` (seconds). Do not omit for “still processing” without a status flag — if unknown, send `"processingStatus": "processing"` and omit playback or keep MP4 progressive.

## Smoke

```bash
# After upload finalize
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/media/<id>" | jq '{duration, fileUrl, playbackUrl, hlsUrl, processingStatus}'

# Duration must be > 0 for ready videos
```

## Pass criteria

| Check | Pass |
|-------|------|
| Ready video has `duration > 0` | Yes |
| MP4 is seekable (moov at start) | Yes |
| HLS is VOD with known length | Yes |
| Feed cards include `duration` | Yes |

## FE mitigation (shipping)

- Prefer progressive `fileUrl` over incomplete HLS.
- Probe local duration at pick → attach to optimistic feed item.
- Session cache: once player/backend reports length for a media id, keep it across remounts.
- Scrubber always moves visually; absolute player seek when duration ≥ 500ms.
- Auto-loop **only** on `playToEnd` — never treat buffer window as end (that snapped seek to `0:00`).

**Root fix is still BE:** store and return `duration` on every ready video.
