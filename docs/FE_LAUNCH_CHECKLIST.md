# FE launch checklist — Lite + feed events + auth session

**Date:** 2026-08-10  
**Repo:** `jevahapp-frontend`  
**Backend:** Contabo contracts shipped (ops: Contabo deploy checklist)

Status of this Expo app vs the launch ticket list.

---

## A. Auth session (must)

| Item | Status | Notes |
|------|--------|-------|
| Email login → `TokenUtils.storeAuthToken` | Done | `authService` / login path |
| Google/Apple → Clerk → `POST /api/auth/clerk-login` → backend JWT | Done | `useFastLogin` + `authUtils` |
| Boot: `hasBackendSession()` → Home; Clerk alone never | Done | `app/index.tsx` |
| Logout: clear backend first, then Clerk `signOut` | Done | Account, Logout, `useAuth.signOut`, SessionExpired |
| API base | Done* | Origin **without** `/api` (`getApiBaseUrl`); paths are `/api/...` |

\*Checklist text says `https://api.jevahapp.com/api`; this app uses origin + `/api` path segments. Equivalent if callers stay consistent.

Doc: `docs/AUTH_SESSION.md`

Smoke: Google login → `GET /api/feed/for-you` 200 (manual on device).

---

## B. Feed events (must for ranking)

| Item | Status | Notes |
|------|--------|-------|
| Queue + `POST /api/feed/events` | Done | `feedRanker` + `useForYouFeedSignals` |
| Soft-fail; flush on background | Done | + flush on logout |
| Prefer for-you + music-for-you | Done | flags default on |
| Fallback all-content on for-you failure | Done | any error (not 5xx-only) |

Doc: `docs/FRONTEND_FOR_YOU_MUSIC_HANDOFF.md`

---

## C. Lite mode (2GB Android)

| Item | Status | Notes |
|------|--------|-------|
| Heuristic + Settings toggle | Done | `liteProfile` + Edit profile toggle |
| for-you / music-for-you `profile=lite&limit=8` + header | Done | `feedRanker` |
| **all-content** `profile=lite` + `X-Jevah-Client: lite` | Done | `fetchAllContentPage` + `MediaApi` + `ApiClient` header |
| Prefer HLS; ≤2 surfaces | Done | HLS on Lite; mount current + next only |
| Honor `item.lite` | Partial | `preferHls` + `prefetchCount` + `imageMaxEdge` (SafeImage/optimizer); `maxVideoHeight` still ABR |
| Image decode budget | Done | Lite ≤720 edge + disk-only expo-image policy |
| Aggressive disk cache | Done | MMKV 24 items, 24h fresh / 7d SWR; posters + video heads; comments 7d |
| Image native disk byte cap 32–48MB | Open | Needs expo-image / native config |

Doc: `docs/FRONTEND_JEVAH_LITE.md`

---

## D. Creators / Studio (when touching artists)

| Item | Status |
|------|--------|
| Email verify before apply | **Open** |
| Apply genres = `TRACK_GENRES` | **Open** |
| Studio `GET /creators/me/analytics` (+ track detail) | **Open** |

Not blocking feed / Lite / auth launch. Track as next creators ticket.

---

## E. Smoke (FE + live API)

| # | Check | Owner |
|---|--------|--------|
| 1 | Email + Google → backend JWT stored | Manual |
| 2 | For You `profile=lite` | Manual |
| 3 | Music For You `profile=lite` | Manual |
| 4 | All-content `profile=lite` | Manual |
| 5 | Scroll → events `accepted` > 0 | Manual |
| 6 | Creator analytics | Blocked on D |
| 7 | Admin report `preview.mediaUrl` | Manual (admin UI exists) |

---

## Code map

| Concern | Path |
|---------|------|
| Lite profile | `src/shared/lite/liteProfile.ts` |
| Feed ranker / events | `src/shared/feed/feedRanker.ts` |
| All-content + For You fallback | `src/shared/media/fetchAllContentPage.ts` |
| Session | `app/utils/sessionAuth.ts`, `docs/AUTH_SESSION.md` |
