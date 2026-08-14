# MMKV and React Query (RQ)

**Audience:** frontend + anyone running the app locally  
**Date:** 2026-08-14

This is how Instagram-style cold start works. It is already wired in the app. Expo Go cannot run the native half.

---

## What each piece is

| Piece | What it is | What it does here |
|---|---|---|
| **MMKV** | Native, synchronous key-value disk (via NitroModules) | Feed, authors, comments, music catalog hydrate **before first paint**. `getString` returns immediately — no `await`. |
| **NitroModules** | Native runtime MMKV v4 uses | Must exist in **your** APK/IPA. Expo Go does not ship it. |
| **React Query (RQ)** | In-memory query cache + fetch/retry | Home feed infinite query. After boot, UI reads RQ. Network refreshes in the background. |
| **AsyncStorage** | Async JS disk | Fallback only when MMKV is missing. Too late for “no spinner” cold start. |

They are not alternatives. **MMKV seeds disk → RQ holds the live page → UI paints from RQ.**

```
cold start
  → MMKV get (sync) first feed page
  → hydrate RQ (`hydrateFeedQueryCache`)
  → Home paints that page (no LoadingState)
  → RQ refetch in background
```

Code:

- `src/shared/cache/mmkvStorage.ts` — MMKV or memory+AsyncStorage
- `src/shared/cache/hydrateFeedQueryCache.ts` — disk → RQ
- `src/shared/media/useAllContentInfiniteQuery.ts` — `offlineFirst` + `initialData`

---

## Expo Go vs a native Jevah build (this is not “production”)

You can keep developing in **Expo Go**. Comments, Bible, feed UI all work. You will **not** get Instagram-style cold start until the phone runs a Jevah binary that includes MMKV.

| What you open | Native MMKV inside? | What you see |
|---|---|---|
| **Expo Go** (Play Store / App Store) | No. Expo ships a fixed native set. MMKV is not in it. | Fallback warning. App still runs. |
| **`npx expo run:android` / EAS `development` APK** | Yes. Still **dev**: Metro, Fast Refresh, same JS. | Sync disk cache. No Nitro warning. |
| Store / preview APK built after MMKV was added | Yes | Same as native, without Metro. |
| **Old Jevah APK** (installed weeks ago, before MMKV was compiled in) | No. OTA JS cannot add native code. | Same fallback as Expo Go. |

`npm start` only starts Metro. It does not put MMKV into the phone.

### What “fallback” means

When native MMKV is missing, `mmkvStorage.ts` does **not** crash. It uses:

1. **RAM** — gone when you swipe the app away  
2. **AsyncStorage** — writes after first paint (too late to skip the spinner)

That is why Expo Go still opened before. The warning was success of the fallback, not a failed install.

A Metro red screen (`Unable to resolve ./AnyHybridObject`) is different: JS bundling broke. Metro now resolves Nitro through `lib/` so Expo Go can boot again. Restart Metro after that change.

---

## Setup (Windows, Android) — do this once

JS is already implemented. You need a **custom native binary**.

### Option A — USB / emulator (fastest)

1. Android Studio + SDK, USB debugging on, or an emulator.
2. Install the Nitro peer (already in `package.json`): `react-native-nitro-modules`.
3. From the repo:

```bash
npm install
npx expo run:android
```

That prebuilds `android/`, compiles MMKV + Nitro into `com.italgyirhrudhdhd.jevahapp`, installs it, and attaches Metro.

Later sessions:

```bash
npm start
```

Open **Jevah** on the device (the custom app), **not** Expo Go. The QR is for the dev client.

If native deps change again:

```bash
npm run rebuild-dev-client
npx expo run:android
```

### Option B — EAS development APK (no local Android SDK)

```bash
npm run bda
```

Install the downloaded APK, then `npm start` and open that app.

`eas.json` profile `development` already has `"developmentClient": true`.

---

## How you know it worked

On launch you should **not** see the NitroModules warning.

In a debug log or by checking `isMmkvNative` from `mmkvStorage.ts`: it is `true`.

Kill the app, relaunch offline: Home should still show the last cached first page instead of an empty spinner.

---

## What not to do

- Do **not** expect Expo Go to ever have MMKV. It never will.
- Do **not** rewrite the product in Flutter to get disk cache. Flutter has the same “need a real binary” rule.
- Do **not** remove the memory fallback — it keeps Expo Go / stale APKs from crashing.
