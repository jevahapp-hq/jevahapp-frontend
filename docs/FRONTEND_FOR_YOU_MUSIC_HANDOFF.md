# Frontend handoff — For You + Artists Music algorithm

**Implemented in Expo app** (2026-08-09). Backend: Contabo `jevahapp-backend`.

Related: this doc · `AUTH_SESSION.md` · `FRONTEND_PERF_BOOT.md`

## What shipped

| Flag | Default | Behavior |
|------|---------|----------|
| `USE_SERVER_FOR_YOU` | `true` | Auth Home ALL/VIDEO → `GET /api/feed/for-you`, fallback `all-content` |
| `USE_MUSIC_FOR_YOU` | `true` | Artists lane (no search/genre) → `GET /api/feed/music-for-you?lane=artist`, fallback tracks |
| `CLIENT_RERANK` | `false` | Preserve server order (local `rankFeedForYou` off) |

Flags: `src/shared/feed/feedFeatureFlags.ts`  
Client: `src/shared/feed/feedRanker.ts`  
Signals: `src/shared/feed/useForYouFeedSignals.ts`

## API base (this repo)

Origin base **does not** include `/api` (e.g. `https://api.jevahapp.com`). Paths are `/api/feed/...`.  
`feedRanker` builds `${getApiBaseUrl()}/api/...`.

Auth: `TokenUtils` Bearer. Events soft-fail. Flush on AppState background + logout.

## Video For You

- `fetchAllContentPage` → try for-you when `shouldFetchServerForYou`
- Same `AllContentTikTok` cards
- Impression (≥300ms), watch_time (~5s), skip (&lt;1.5s), like/save/share mirrors
- Counted views still via `contentInteractionAPI.recordView`

## Artists For You

- `MusicCatalogApi.listMusicForYou` + `useMusicCatalog` artists branch
- Banner title **For You** when personalized
- Search/genre → chronological `lane=artist` tracks
- Play / skip events + existing `recordPlay`

## Smoke

```bash
BASE=https://api.jevahapp.com/api
TOKEN="<JWT>"

curl -s "$BASE/feed/for-you?limit=5" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/feed/music-for-you?lane=artist&limit=5" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$BASE/feed/events" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"events":[{"contentId":"<id>","contentType":"music","eventType":"impression","sessionId":"fe-1","source":"music_for_you"}]}'
```
