# Backend Handoff — Copyright-free player: repeat + shuffle preferences

**Date:** 27 Aug 2026  
**Frontend:** `jevahapp-frontend`  
**Surfaces:** Copyright-free song modal (`CopyrightFreeSongModal`), global audio player

## Why

The copyright-free player now cycles **Repeat off → Repeat all → Repeat one** locally (same as Spotify / Apple Music). Shuffle already lives on the same transport row.

This is **client-complete today**. Repeat and shuffle survive app restarts via the audio Zustand persist store. They do **not** sync across devices or survive logout.

Optional backend work: persist the user’s playback preference so a phone and a tablet stay in sync.

## What frontend already does (no BE required)

| Tap cycle | `repeatMode` | Behaviour on track end |
|-----------|--------------|------------------------|
| 1st tap | `"all"` | Play next; wrap to index 0 (including a 1-song queue) |
| 2nd tap | `"one"` | Restart the same track (`setTrack(current, true)`) |
| 3rd tap | `"none"` | Play next; **stop** at end of queue |

- Shuffle is a local queue reorder; current track stays in place.
- End-of-track already calls `next()` from `createSetTrack` (`didJustFinish`).
- FE does **not** send repeat/shuffle on listen/view events.

## Optional API (cross-device)

### Get
```http
GET /api/users/me/playback-preferences
```

```json
{
  "success": true,
  "data": {
    "repeatMode": "none",
    "shuffle": false
  }
}
```

`repeatMode`: `"none"` | `"all"` | `"one"`  
`shuffle`: boolean

Unauthed / missing row → treat as `{ repeatMode: "none", shuffle: false }`.

### Upsert
```http
PUT /api/users/me/playback-preferences
Content-Type: application/json
```

```json
{ "repeatMode": "all", "shuffle": true }
```

Debounce ~400ms on the client. Last write wins. No need to attach this to every listen event.

## What we will not send you

- Per-song repeat. This is a **user session preference**, not a media field.
- Server-side looping of the audio file. The client loops / advances the queue.

## Pass criteria (if you ship the endpoints)

| Check | Pass |
|-------|------|
| GET returns `repeatMode` + `shuffle` | Yes |
| PUT round-trips the same values | Yes |
| Unknown / missing user → defaults, not 500 | Yes |
| Auth required | Yes |

Until these exist, FE keeps using the local store only.
