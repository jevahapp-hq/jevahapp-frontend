# API environments (local vs production)

Flip one variable in `.env` (copy from `.env.example`):

```bash
EXPO_PUBLIC_API_ENV=production   # live https://api.jevahapp.com
EXPO_PUBLIC_API_ENV=local        # local backend
```

Then restart Metro (`npx expo start -c`).

| Env | Default URL |
|-----|-------------|
| `production` | `https://api.jevahapp.com` |
| `local` (iOS sim) | `http://localhost:4000` |
| `local` (Android emulator) | `http://10.0.2.2:4000` |
| `local` (physical device) | set `EXPO_PUBLIC_API_URL_LOCAL=http://<LAN-IP>:4000` |

Optional overrides: `EXPO_PUBLIC_API_URL_LOCAL`, `EXPO_PUBLIC_API_URL_PRODUCTION`.  
Legacy `EXPO_PUBLIC_API_URL` still works as the production URL when `EXPO_PUBLIC_API_ENV=production`.

Source of truth: `app/utils/environmentManager.ts` → `getApiBaseUrl()` / `API_BASE_URL`.
