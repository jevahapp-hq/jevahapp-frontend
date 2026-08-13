# Auth session model

## Rule

**Backend JWT is the only app session.** Clerk is an OAuth shell (Google/Apple), not the API gate.

```
Email/password ──► POST /login ──────────────► TokenUtils.storeAuthToken
OAuth ──► Clerk getToken ──► POST /clerk-login ► TokenUtils.storeAuthToken
                                                      │
                                                      ▼
                                    Authorization: Bearer <backend JWT>
```

## Canonical APIs

| Helper | File | Use |
|--------|------|-----|
| `getSessionToken` / `hasBackendSession` | `app/utils/sessionAuth.ts` | Boot gates, remember-me |
| `TokenUtils.getAuthToken` | `app/utils/tokenUtils.ts` | All HTTP / socket clients |
| `storeSessionToken` / `TokenUtils.storeAuthToken` | same | Login (email + OAuth) |
| `clearBackendSession` / `clearLocalSessionState` | `sessionAuth` / `sessionExpired` | Logout + 401 end-session |

Storage slots (all written together): AsyncStorage `token` + `userToken`, SecureStore `jwt`.

## Boot (`app/index.tsx`)

1. If `hasBackendSession()` → Home (do **not** wait on Clerk).
2. Else after Clerk loads → `/auth/login`.
3. Clerk `isSignedIn` alone never grants Home (no backend JWT ⇒ broken APIs).

## Logout

Always wipe backend session first, then Clerk `signOut()` when a Clerk session exists:

- Account screen, SessionExpired overlay, `app/auth/Logout.tsx`, `useAuth.signOut`

## Feed auth

`useAuthFeed` means “call authenticated feed endpoints” when a backend session (or cached user) exists — not “Clerk signed in”.

## Future (true Clerk-only)

Requires backend to accept Clerk JWTs (or a per-request bridge). Until then, do not remove `TokenUtils` / backend JWT storage.
