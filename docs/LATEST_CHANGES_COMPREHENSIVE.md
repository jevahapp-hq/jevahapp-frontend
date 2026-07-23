# Latest Frontend Changes — Comprehensive Technical Summary

**Repository:** `jevahapp-frontend`  
**Change snapshot:** July 19, 2026  
**Primary areas:** Like reliability, HTTP 429 handling, interaction-state consistency, content-action modal modularization, and backend contract documentation

---

## 1. Executive summary

The latest work addresses two main concerns:

1. **Like interactions now handle backend rate limiting safely.**
   - HTTP `429 Too Many Requests` is represented by a dedicated error type.
   - Optimistic likes are rolled back when the backend rejects the request.
   - The app honors the backend `Retry-After` header when available.
   - Repeated taps are temporarily blocked per content item.
   - Feed and shared like controls show throttled “Slow down” alerts.
   - Rate-limit and authentication failures no longer fall back to local-only toggles.

2. **`ContentActionModal` was split into focused modules.**
   - Shared row markup is now centralized in `ActionRow`.
   - Props are defined in a dedicated type module.
   - Open, close, backdrop, and swipe-dismiss behavior lives in a custom transition hook.
   - The modal now animates both the bottom sheet and backdrop during dismissal.
   - Existing admin, ownership, delete, report, save, view, and download behavior is retained.

A new canonical backend like-system specification was also added. It documents identity, persistence, concurrency, response contracts, rate limiting, caching, testing, and observability requirements needed to keep frontend and backend like state consistent.

---

## 2. Scope of changed files

### Like interaction infrastructure

- `app/utils/contentInteraction/errors.ts` — new typed rate-limit error utilities.
- `app/utils/contentInteraction/index.ts` — exports the new error utilities.
- `app/utils/contentInteraction/like.ts` — turns HTTP 429 responses into typed failures and narrows local fallback behavior.
- `app/store/useInteractionStore/actions/likeActions.ts` — adds rollback, cooldown, and structured rate-limit results.
- `app/store/useInteractionStore/types.ts` — extends interaction state and the `toggleLike` return contract.
- `app/store/useInteractionStore/index.tsx` — initializes cooldown state.
- `app/store/useInteractionStore/actions/cacheActions.ts` — clears cooldown state with the rest of the interaction cache.

### Like user interfaces

- `src/features/media/AllContentTikTok/hooks/useAllContentTikTokHandlers.ts` — displays rate-limit feedback and avoids recording affinity for a rejected like.
- `src/shared/components/InteractionButtons/UnifiedInteractionButtons.tsx` — handles the store’s structured rate-limit result.
- `src/shared/components/LikeButton.tsx` — adds local cooldown, rollback-aware 429 handling, and rate-limit feedback.

### Content action modal

- `src/shared/components/ContentActionModal.tsx` — removed after being replaced by a module directory.
- `src/shared/components/ContentActionModal/index.tsx` — new modal composition entry point.
- `src/shared/components/ContentActionModal/ActionRow.tsx` — reusable action-row presentation.
- `src/shared/components/ContentActionModal/types.ts` — exported modal prop contract.
- `src/shared/components/ContentActionModal/useSheetTransition.ts` — transition and swipe-dismiss logic.

The directory entry point preserves normal imports such as:

```ts
import ContentActionModal from ".../ContentActionModal";
```

### Documentation and local configuration

- `docs/LIKE_SYSTEM_BACKEND_BUSINESS_LOGIC_SPEC.md` — new canonical backend contract.
- `.env` — local environment configuration changed. Values are intentionally not documented here because environment files may contain sensitive or machine-specific data.

---

## 3. Like-system behavior before and after

### Previous risk

The like flow uses optimistic UI: the heart and count update before the backend responds. That is appropriate for responsiveness, but rejected requests require exact reconciliation.

Previously, an HTTP 429 response was converted into a generic error. The lower interaction layer could then use the local fallback path. That behavior was unsafe for authenticated server content because:

- the backend had rejected the toggle;
- the optimistic UI could remain in the wrong state;
- a local fallback could simulate another successful state transition;
- frontend and backend state could diverge;
- repeated requests could generate mismatch warnings and alert spam.

### New behavior

The new flow distinguishes a rate-limit rejection from an offline or unexpected network failure:

```text
User taps Like
  → store performs optimistic toggle
  → API sends authenticated POST
  → backend succeeds
      → reconcile count and liked state
      → persist reconciled local cache
  → backend returns 429
      → throw RateLimitError
      → roll back optimistic state
      → persist rolled-back cache state
      → start per-content cooldown
      → return { rateLimited: true, message }
      → UI displays a throttled alert
  → offline/unexpected network failure
      → existing local fallback remains available
```

This makes the backend authoritative for authenticated rejections while retaining the project’s existing resilience strategy for genuine connectivity failures.

---

## 4. Typed HTTP 429 handling

### `RateLimitError`

`app/utils/contentInteraction/errors.ts` introduces `RateLimitError`, which:

- extends JavaScript’s `Error`;
- uses the stable name `RateLimitError`;
- exposes `status = 429`;
- carries `retryAfterMs`;
- enforces a minimum retry delay of one second;
- provides a user-readable default message.

### Error identification

`isRateLimitError(error)` supports:

- direct `instanceof RateLimitError` checks;
- errors whose `name` survived a boundary as `RateLimitError`;
- generic errors containing “too many requests.”

This allows both the API and UI layers to recognize rate limiting even if an error is reconstructed or crosses a module boundary.

### `Retry-After` parsing

`parseRetryAfterMs(header, fallbackMs)` accepts both standard HTTP forms:

- numeric seconds, such as `Retry-After: 3`;
- an HTTP date, such as `Retry-After: Sun, 19 Jul 2026 14:30:00 GMT`.

Invalid or missing values use a three-second fallback. Parsed delays are clamped to at least one second.

### Public exports

The content-interaction barrel now exports:

- `RateLimitError`;
- `isRateLimitError`;
- `parseRetryAfterMs`.

These utilities can therefore be reused by other interaction types without importing internal module paths.

---

## 5. API-layer changes

`app/utils/contentInteraction/like.ts` continues to call:

```http
POST /api/content/:contentType/:contentId/like
Authorization: Bearer <JWT>
Content-Type: application/json
```

### HTTP 429

When the backend returns 429, the API layer now:

1. parses the backend response body;
2. uses the backend message when present;
3. reads and parses `Retry-After`;
4. throws `RateLimitError`;
5. prevents the request from falling through to local-storage fallback.

### Authentication failures

Authentication failures are also rethrown instead of being converted into a local toggle. This prevents an unauthenticated local state from appearing to be a successful server mutation.

### Local fallback boundary

The fallback is now reserved for:

- offline failures;
- transport failures;
- unexpected network or server failures not explicitly classified as authentication or rate limiting.

This is a significant semantic change: local fallback is a resilience mechanism, not a substitute for a backend mutation that was explicitly rejected.

### Successful response parsing

The frontend still expects the canonical backend response fields:

```text
data.liked
data.likeCount
```

The API returns those as:

```ts
{
  liked: boolean;
  totalLikes: number;
}
```

---

## 6. Interaction-store changes

### New state

The Zustand interaction store adds:

```ts
likeCooldownUntil: Record<string, number>
```

Each key is a content ID and each value is an absolute timestamp in milliseconds. Cooldowns are therefore isolated per content item: being rate-limited on one item does not disable likes everywhere.

The map is initialized in the store and reset by `clearCache`.

### Extended result contract

`toggleLike` now resolves to:

```ts
{
  liked: boolean;
  totalLikes: number;
  rateLimited?: boolean;
  message?: string;
}
```

Rate limiting is returned as an expected interaction outcome instead of forcing every UI caller to catch and interpret the original exception.

### Cooldown short-circuit

Before starting another request, the store checks `likeCooldownUntil[contentId]`.

If the cooldown is still active:

- no optimistic update is performed;
- no network request is sent;
- current state is returned;
- `rateLimited: true` is included;
- a standard wait message is returned.

### Duplicate in-flight tap protection

The existing `loadingInteraction["<contentId>_like"]` guard remains. A second tap while the authoritative request is pending returns current state without sending a duplicate toggle.

This guard and the cooldown solve different problems:

- the loading guard prevents concurrent duplicate requests;
- the cooldown prevents requests during a backend-imposed waiting period.

### Optimistic update

For an allowed tap, the store:

1. seeds missing stats from the component’s initial values;
2. toggles `userInteractions.liked`;
3. increments or decrements the count;
4. clamps the count at zero;
5. marks the interaction as loading;
6. writes optimistic state to the local interaction cache.

### Successful reconciliation

On success:

- the server count is accepted when it is numeric;
- counts remain non-negative;
- the loading flag is cleared;
- reconciled state is persisted locally.

The existing temporary mismatch safeguard remains: if the backend’s returned `liked` value disagrees with the optimistic transition, the store logs a warning and keeps the optimistic heart state while still accepting the server count. This is a compatibility measure for a known backend inconsistency, not the intended long-term contract.

### Rollback

A dedicated `rollbackOptimisticLike` helper now reverses the optimistic transition for every rejected request:

- `liked` returns to its previous value;
- the count is reversed and clamped at zero;
- the loading flag is cleared.

The rolled-back value is then persisted to the local cache so a rejected optimistic state is not restored later.

### Rate-limit result

After rollback, a recognized rate limit:

- chooses the server-provided retry duration or a three-second default;
- stores a new per-content cooldown timestamp;
- emits a throttled development warning;
- resolves with current rolled-back values;
- includes `rateLimited: true`;
- includes the user-facing backend message.

Unexpected failures still roll back and resolve with current state, preserving the store’s existing non-throwing caller contract.

---

## 7. UI changes

### TikTok-style all-content feed

`useAllContentTikTokHandlers` now checks the structured result from `toggleLike`.

When `rateLimited` is true:

- it displays an alert titled **“Slow down”**;
- it uses the backend message when available;
- repeated alerts are suppressed for 2.5 seconds;
- it exits before recording feed affinity.

The early return is important because a rejected like must not train the local recommendation signal as if the content were successfully liked.

### Unified interaction buttons

`UnifiedInteractionButtons` now performs the same structured result check and displays the same throttled “Slow down” message.

This covers screens that use the shared multi-action control rather than the TikTok feed handler.

### Standalone `LikeButton`

The standalone component does not rely on the Zustand store for cooldown state, so it now maintains its own:

- `cooldownUntil` timestamp;
- last-alert timestamp;
- rate-limit error message.

Its updated behavior is:

1. ignore taps while loading or explicitly disabled;
2. block taps during the local cooldown;
3. perform the existing optimistic update;
4. roll back state on failure;
5. identify rate-limit errors;
6. store the retry window;
7. show a throttled alert;
8. disable and dim the button while cooling down.

Cooldown state resets when `contentId` changes so a recycled component does not transfer one item’s cooldown to another.

### Alert throttling

Alerts are limited to approximately one every 2.5 seconds in each UI path. This prevents multiple cards or rapid taps from creating an unusable stack of native alerts.

The throttling is currently implemented at module or component scope rather than through one global notification service. It prevents spam within each path, but separate like surfaces could still produce independent alerts.

---

## 8. Content action modal modularization

The previous `ContentActionModal.tsx` contained approximately 500 lines combining:

- prop definitions;
- authorization and ownership decisions;
- animation state;
- gesture handling;
- visibility lifecycle;
- repeated action-row markup;
- modal composition.

It has been replaced by a directory with focused responsibilities.

### `index.tsx`

The entry point now owns:

- modal composition;
- admin lookup when opened;
- ownership resolution;
- delete/report visibility rules;
- action invocation;
- action-row selection and labels.

### `types.ts`

`ContentActionModalProps` is now separately defined and exported. The public contract still supports:

- visibility and close callbacks;
- view-details action;
- save/remove-library action;
- download/remove-download action;
- saved and downloaded states;
- optional content title;
- media identity and uploader information;
- optional full media item;
- delete callback;
- explicit `showDelete` override;
- report callback.

### `ActionRow.tsx`

Repeated row markup has been replaced by a reusable component accepting:

- `label`;
- `icon`;
- `onPress`;
- optional `destructive` styling.

The component centralizes:

- spacing;
- icon container dimensions;
- surface color;
- typography;
- error color for destructive actions;
- trailing chevron;
- touch opacity.

This reduces duplication and ensures visual changes can be made once.

### `useSheetTransition.ts`

The custom hook now owns:

- internal mounted visibility;
- sheet `translateY`;
- backdrop opacity;
- open spring;
- close timing;
- swipe translation;
- swipe threshold;
- close timer cleanup;
- animated styles.

### Open behavior

When `isVisible` becomes true:

- pending close timers are cleared;
- the modal is mounted;
- the backdrop fades in over 200 ms;
- the sheet springs from below the screen to its resting position.

### Close behavior

Closing from the backdrop, close button, hardware back action, action selection, or downward swipe:

- fades the backdrop to transparent;
- moves the sheet below the screen over 240 ms;
- notifies the parent through `onClose`;
- keeps the modal mounted until the transition completes;
- then unmounts using a JavaScript timer.

The timer avoids relying on a Reanimated callback crossing from the UI worklet to JavaScript.

### Swipe behavior

- only downward translation moves the sheet;
- a drag over 150 pixels dismisses it;
- a shorter drag springs the sheet back into place;
- gesture translation is reset after release.

### Authorization and action visibility

The existing priority remains:

1. `showDelete: true` explicitly treats the viewer as allowed to delete;
2. `showDelete: false` explicitly hides owner deletion;
3. otherwise `useMediaOwnership` determines ownership.

Final action visibility remains:

- admins: Delete available, Report hidden;
- regular owners: Delete available;
- regular non-owners: Report available;
- actions are shown only when their callback exists.

### Action error isolation

Action callbacks are invoked inside `try/catch`. A synchronous action error is logged, and the sheet still proceeds through the close flow.

---

## 9. Canonical backend like specification

`docs/LIKE_SYSTEM_BACKEND_BUSINESS_LOGIC_SPEC.md` was added as the source-of-truth contract for backend implementation and QA.

It defines:

- the difference between the current user’s `liked` state and the global `likeCount`;
- canonical identity as `(userId, contentType, contentId)`;
- supported content-type normalization;
- JWT authentication requirements;
- the current POST toggle endpoint;
- a recommended future idempotent desired-state API;
- the database model and uniqueness constraints;
- atomic toggle transaction requirements;
- count integrity and repair strategies;
- idempotency and duplicate-delivery handling;
- rate-limit behavior and response headers;
- error response contracts;
- single and batch metadata contracts;
- authenticated feed hydration;
- cache invalidation and read-after-write consistency;
- realtime event semantics;
- notification and analytics rules;
- moderation and deleted-content handling;
- frontend behavior supported by the contract;
- concurrency scenarios;
- acceptance and integration tests;
- implementation checklist;
- production observability.

### Critical semantic rule

The specification explicitly states:

```json
{
  "liked": false,
  "likeCount": 12
}
```

This is valid. It means the authenticated user has not liked the item while twelve other users have. The global count must never be used to infer the current user’s state.

### Required mutation response

The current frontend expects a successful toggle response containing:

```json
{
  "success": true,
  "data": {
    "contentId": "<id>",
    "contentType": "media",
    "liked": true,
    "likeCount": 42,
    "updatedAt": "<server timestamp>"
  }
}
```

`liked` must be the authenticated user’s post-mutation state, and `likeCount` must be the global non-negative count after the same mutation.

---

## 10. State and consistency invariants

The updated implementation is designed around these invariants:

1. A count must never become negative.
2. A rejected optimistic mutation must be rolled back.
3. A 429 response must not be treated as a successful local mutation.
4. An authentication rejection must not be hidden by local fallback.
5. A second tap must not create a concurrent toggle while the first is pending.
6. A rate limit on one content item must not disable unrelated content.
7. Locally persisted interaction state must reflect rollback and reconciliation.
8. Recommendation affinity must only be recorded after an accepted like result.
9. UI feedback must be visible but throttled.
10. The backend remains the durable source of truth.

---

## 11. Compatibility and migration impact

### Import compatibility

Changing a file module into a same-named directory with `index.tsx` should preserve extensionless imports of `ContentActionModal`.

Any code importing a type that was previously private can now use:

```ts
import ContentActionModal, {
  type ContentActionModalProps,
} from ".../ContentActionModal";
```

### Store caller compatibility

Existing callers reading only `liked` and `totalLikes` remain compatible. The new `rateLimited` and `message` fields are optional.

### Store reset compatibility

Any full-state replacement outside the standard initializer and `clearCache` must include `likeCooldownUntil`; otherwise it should preserve existing state rather than construct an incomplete `InteractionState`.

### Backend compatibility

The frontend can use a missing or invalid `Retry-After` header because it falls back to three seconds. Backend support for a valid header is still recommended so the UI cooldown matches server policy.

---

## 12. Testing and QA checklist

### Successful like

- Start with an unliked item.
- Tap once.
- Confirm the heart fills immediately.
- Confirm the count increments immediately.
- Confirm exactly one request is sent.
- Confirm server values reconcile without a visible flicker.
- Reload and confirm the liked state persists.

### Successful unlike

- Start with a liked item.
- Tap once.
- Confirm the heart clears immediately.
- Confirm the count decrements but never below zero.
- Reload and confirm the unliked state persists.

### Duplicate taps

- Tap rapidly while the first request is pending.
- Confirm only one toggle request is sent.
- Confirm the heart does not toggle twice.

### HTTP 429 with numeric `Retry-After`

- Return 429 with `Retry-After: 3`.
- Confirm optimistic heart and count are rolled back.
- Confirm “Slow down” appears.
- Confirm additional taps do not send requests during the cooldown.
- Confirm tapping works again after the cooldown.

### HTTP 429 with date `Retry-After`

- Return 429 with an HTTP-date header.
- Confirm the computed delay is honored.

### HTTP 429 without `Retry-After`

- Return 429 without the header.
- Confirm the three-second fallback is used.

### Alert suppression

- Trigger repeated rate-limit outcomes within 2.5 seconds.
- Confirm alerts are not repeatedly stacked.

### Feed affinity

- Trigger a rate-limited like from the all-content feed.
- Confirm no positive affinity event is recorded.

### Authentication rejection

- Return 401.
- Confirm the optimistic state rolls back.
- Confirm a local fallback does not invent a successful like.

### Offline fallback

- Simulate a genuine network failure rather than an HTTP rejection.
- Confirm the intended local fallback path still works.
- Reconnect and verify the product’s normal synchronization behavior.

### Content action modal

- Open the sheet and verify spring and backdrop animations.
- Close by tapping the backdrop.
- Close with the top-right close button.
- Close with the Android hardware back action.
- Swipe down less than 150 px and confirm the sheet returns.
- Swipe down more than 150 px and confirm dismissal.
- Select every available action and confirm it fires once before dismissal.
- Verify save/download labels and icons for both states.
- Verify Delete for admins and owners.
- Verify Report for regular non-owners.
- Verify an explicit `showDelete` value overrides ownership lookup.
- Open and close repeatedly to detect stale timers or delayed unmounts.

---

## 13. Recommended automated coverage

The current changes would benefit from focused tests for:

- `parseRetryAfterMs` with seconds, dates, invalid values, missing values, and past dates;
- `isRateLimitError` with typed and reconstructed errors;
- store rollback after 429;
- per-content cooldown isolation;
- duplicate in-flight tap suppression;
- cache reset of `likeCooldownUntil`;
- no fallback on 401 or 429;
- fallback on network failure;
- no feed-affinity update for rejected likes;
- action visibility for admin, owner, and non-owner combinations;
- modal timer cleanup during rapid reopen;
- swipe threshold behavior.

---

## 14. Known limitations and follow-up considerations

1. **Backend mismatch safeguard is temporary.**  
   Keeping optimistic `liked` when the server disagrees can hide a genuine server-side rejection if it arrives as a successful but incorrect payload. The backend contract should be fixed and the safeguard removed once responses are trustworthy.

2. **Alert throttling is distributed.**  
   The feed handler, unified buttons, and standalone button each maintain separate suppression state. A centralized interaction-notification service could guarantee app-wide deduplication.

3. **Cooldown entries are timestamp-based but not pruned individually.**  
   Expired entries are harmless and the map is cleared with the cache, but a cleanup strategy could be added if the session touches a very large number of content items.

4. **Standalone and store-backed buttons implement cooldown separately.**  
   Shared behavior could eventually move into one reusable hook to prevent drift.

5. **Fallback policy should remain narrow.**  
   Additional explicit backend rejections such as authorization or validation errors should not silently become local success. Error classification can be expanded as the API contract matures.

6. **No secret configuration is captured in this document.**  
   The `.env` change must be reviewed and distributed through the project’s secure environment-management process.

---

## 15. Release impact

### User-visible impact

- Like controls recover correctly when users tap too quickly.
- Rejected likes no longer remain visually active.
- Users receive clear, rate-limited feedback.
- Content action sheets close with smoother sheet and backdrop transitions.

### Engineering impact

- Rate limiting has a typed, reusable representation.
- Interaction state exposes cooldown and structured outcomes.
- Local fallback has safer boundaries.
- Modal code is smaller and easier to maintain.
- Backend engineers have a comprehensive source-of-truth contract.

### Data-integrity impact

- Fewer frontend/backend like mismatches.
- Rejected toggles are less likely to pollute local persistence.
- Rejected feed likes no longer train local affinity.
- Authentication and rate-limit failures no longer masquerade as successful local mutations.

---

## 16. Final implementation summary

The latest changes strengthen the boundary between optimistic UX and authoritative backend state. The app still responds immediately to a valid like tap, but it now treats explicit backend rejection as a rollback event, applies a content-specific cooldown, and communicates the result consistently to users and callers.

At the same time, the content-action sheet was refactored from one large component into a small composition layer, a reusable row, a public prop type, and a dedicated transition hook. This preserves behavior while making the component easier to test and evolve.

Together with the new backend business-logic specification, these changes provide a clearer end-to-end contract for reliable engagement behavior.
