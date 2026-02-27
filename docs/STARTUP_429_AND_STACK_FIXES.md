# Startup 429 and Stack Overflow Fixes

**Issues from logs:**
- `429 Too many requests` at app startup
- `RangeError: Maximum call stack size exceeded` in content stats
- `ENOENT: InternalBytecode.js` (Metro symbolication – cosmetic)

---

## Fixes Applied

### 1. Stagger startup requests (_layout.tsx)
- **Before:** warmupBackend, prefetchQuery ran in parallel
- **After:** await warmupBackend, then 800ms delay, then prefetch
- Reduces burst of requests that triggered rate limiting

### 2. Safer loadContentStats error handling (useInteractionStore)
- Fixed `loadingStats` key in catch block (`contentId` → `${contentId}_stats`)
- Avoided deep spread that could contribute to stack overflow
- Reduced `console.warn` noise in production

### 3. Avoid batch→per-item cascade on 429 (useInteractionStore)
- **Before:** Batch fails → 32 sequential `loadContentStats` calls → more 429s
- **After:** On 429, skip per-item fallback; on other errors, only fall back if ≤8 items
- Inner fallback (empty batch response) limited to ≤6 items

### 4. Reduce AllContentTikTok stats load (AllContentTikTok.tsx)
- **Before:** 32 items, immediate batch, fallback to 32 per-item on failure
- **After:** 16 items, 400ms delay before batch, no per-item fallback
- Removed `loadContentStats` from effect deps (avoids extra runs)

---

## InternalBytecode.js ENOENT (optional)

Metro tries to read `InternalBytecode.js` for symbolication. It does not exist.

**Option A – create a placeholder (avoids ENOENT):**
```
echo. > InternalBytecode.js
```

**Option B – ignore:** Stack traces still work; only symbolication of internal frames is affected.

---

## Backend rate limits

If 429 persists, the backend may need higher limits or separate limits for:
- Health checks
- Media list
- Batch stats
- User profile fetches

Consider raising limits for known-good clients or for `/api/media/public/*` during cold start.
