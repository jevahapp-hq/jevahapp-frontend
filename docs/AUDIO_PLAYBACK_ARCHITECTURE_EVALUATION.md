# Audio Playback Architecture — Evaluation and Redesign

Why our mini player misbehaves, how Spotify and YouTube Music model the same
problem, and the model we are adopting.

---

## 1. The mental model the big players use

The single most important idea, and the one we were missing: **Spotify and
YouTube Music do not treat "a track object exists" as "show the player."** They
model three separate concepts that we had collapsed into one.

| Concept | Lifetime | Persisted? | Drives UI? |
|---|---|---|---|
| **Resume point** — what you last listened to and where | Forever, across installs | Yes, server + local | No |
| **Playback session** — an engine is loaded and owns the audio focus | This app run, until stopped | No | Yes |
| **Now Playing surface** — the mini bar and the full player | Follows the session, minus route rules | No | — |

A resume point is *data*. A session is *a live engine with a loaded decoder,
audio focus, and a notification*. The bar renders off the session, never off the
data.

This is why Spotify can remember your podcast position for six months without a
bar appearing the instant you open the app on a new phone. When it *does* show a
bar on cold start, that is a deliberate, separate feature ("Jump back in"), it is
explicitly labelled, and — critically — it is **wired to a real engine**, because
tapping play has to work.

Our bug is exactly the failure this separation prevents. More on that in §3.

### The other invariants worth copying

**One engine, one owner.** There is a single playback service. UI never holds a
sound handle. Every surface is a projection of one state machine. We already do
this well with `useGlobalAudioPlayerStore` — the store owns `soundInstance` and
nothing else touches it.

**The mini bar is a stateless projection.** It reads `{track, isPlaying,
progress}` and emits intents (`toggle`, `next`, `expand`). It holds no playback
state of its own, so it can be unmounted and remounted freely. We also do this
correctly.

**Expansion is guaranteed, never conditional.** In both apps, tapping the mini
bar *always* opens the full player. There is no content type for which the tap
silently does nothing. If a source cannot support the rich player, the product
either gives it a different destination or does not render an expand affordance
at all. An affordance that looks tappable and isn't is treated as a bug, not a
gap. **This is our second defect.**

**Chrome arbitration is centralised.** The Now Playing bar, snackbars, ad
banners, and FAB sheets all register with one layout coordinator that decides who
yields. Nobody hardcodes another component's height. **This is our third
defect.**

**Dismissal is explicit and one-directional.** Swipe *down* to dismiss, swipe
*up* to expand. The bar is never free-draggable, because a bar parked in the
middle of the screen is an unrecoverable state for most users. **This is our
fourth defect.**

**State transitions are named, not inferred.** `startSession`, `endSession`,
`suspendForRoute`. No surface tries to guess intent by diffing fields, because
inference breaks the moment persistence, auto-advance, or error recovery writes
the same field a user action would.

---

## 2. What we actually built

The architecture is sound in its core — one store, slice-composed actions, a
presentational bar. The failures are all at the boundary between *data* and
*session*, and in chrome layering.

```
useGlobalAudioPlayerStore (persist middleware)
  ├── partialize → AsyncStorage: currentTrack, queue, currentIndex, repeatMode…
  └── slices: createSetTrack | createTransportActions | createSeekActions
              createQueueActions | createStateSetters

FloatingAudioPlayer (root sibling, painted after <Slot/>)
  ├── useFloatingPlayerVisibility  → route rules, then `return !!currentTrack`
  ├── useFloatingPlayerActions     → PanResponder
  └── FloatingMiniBar              → presentational
```

---

## 3. The four defects, with root causes

### D1 — The bar opens by itself

`src/store/useGlobalAudioPlayerStore.tsx:63-98` persists `currentTrack` to
AsyncStorage. `useFloatingPlayerVisibility.ts:90` ends with:

```ts
// Show whenever a track is loaded (auth is enforced elsewhere)
return !!currentTrack;
```

So on every cold start, zustand rehydrates a track from a previous session and
the bar slides in with nobody having touched anything.

**It is worse than a cosmetic surprise.** `soundInstance` is deliberately *not*
persisted, so the rehydrated state is `{ currentTrack: <track>, soundInstance:
null }`. Look at what `play()` does with that
(`createTransportActions.ts:15-33`):

```ts
play: async () => {
  const { soundInstance } = get();
  if (soundInstance) { /* … */ }   // ← null after rehydrate, so: nothing
}
```

The bar that appears on its own is a **dead shell**: play does nothing, next does
nothing, because there is no engine behind it. This single root cause explains
both "it opens by itself" and a large share of "it doesn't respond."

This is precisely the resume-point-vs-session confusion from §1. The fix is not
to stop persisting — resume data is valuable — it is to stop letting *data* drive
the *surface*.

### D2 — Tapping it doesn't maximise

Two independent causes, which is why it felt intermittent rather than broken.

**(a) A hard gate that silently does nothing.** `FloatingAudioPlayer/index.tsx:58`:

```ts
onOpenFullPlayer={() => {
  if (supportsFullScreenPlayer(currentTrack.source)) {
    useCopyrightFreeOverlayStore.getState().open(currentTrack);
  }
}}
```

`supportsFullScreenPlayer` is `copyright-free || library`
(`audioSourcePolicy.ts:24-26`). For a `feed` sermon, a `hymn`, or `ebook` TTS,
the branch is skipped and **the tap is a no-op with no feedback** — while the
artwork and title still render as `TouchableOpacity`, so they look tappable.

**(b) The gesture layer steals the tap.**
`useFloatingPlayerActions.ts:18-23`:

```ts
onStartShouldSetPanResponder: () => true,
onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
```

These handlers are spread onto the *container*, wrapping every button. Claiming
on move at a 5px threshold means the container asks the pressed
`TouchableOpacity` to surrender the touch after the smallest finger drift — and
`TouchableOpacity` grants termination by default. A real thumb tap moves more
than 5px. The press is cancelled and no `onPress` fires.

### D3 — It covers the Upload / Go Live buttons

Pure geometry, with paint order making it unavoidable.

```
navH  = getBottomNavHeight()                  ≈ 108   (84 + safe-area 24)
FAB wrapper bottom = navH - 44                = 64,  height ≈ 64  → top ≈ navH + 20
FabCreateActions bottom = navH - 44 + 56 + 10 = navH + 22, minHeight 72
                                              → spans navH+22 … navH+94
Mini bar bottom = getBottomNavHeight() + 56   = navH + 56, height 76
                                              → spans navH+56 … navH+132
                                                       ^^^^^^^^^^^^^^^ overlap
```

A ~38px overlap. The sheet sets `zIndex: 1000` and the bar only `zIndex: 100`,
but that is irrelevant: `zIndex` only orders siblings within a stacking context.
The sheet lives inside the screen tree under `<Slot />`; the bar is a *later
sibling of `<Slot />`* in `app/_layout.tsx:435-439`. The later root child paints
on top regardless of the descendant's `zIndex`. The bar wins, and the `+ 56` in
`FloatingMiniBar.tsx:57` is a magic number that was tuned to clear the FAB, not
the expanded sheet.

### D4 — A stray drag parks the bar in mid-screen

`useFloatingPlayerActions.ts:47-54` allows dragging *up* to `-SCREEN_HEIGHT *
0.6` and stores the result in `baselineOffset`, which is never reset on track
change. One accidental upward swipe leaves the bar floating in the middle of the
screen for the rest of the session, which reads to a user as "it opened itself
somewhere weird."

---

## 4. The model we are adopting

### Split resume point from session

Add `isSessionActive` to the store. It is set by `setTrack` (the only entry point
that creates an engine) and cleared by `clear`. It is **excluded from
`partialize`**, so it is always `false` on cold start.

```
Visibility = isSessionActive AND currentTrack AND routeAllows AND notSuppressed
```

Persistence keeps working untouched — the resume point is still on disk for a
future "Jump back in" surface — but it can no longer summon a dead bar. This is
the §1 table expressed in code.

### Make expansion total

Replace the boolean `supportsFullScreenPlayer` with a routing function that
returns a *destination*, so the call site cannot silently fall through:

```ts
resolveFullPlayerTarget(source) → "audio-modal" | "none"
```

`feed` joins `copyright-free` and `library` on the full player. `hymn` and
`ebook` return `"none"` — and where the target is `"none"` the bar **renders no
expand affordance at all**, with the tap falling back to play/pause. Nothing that
looks tappable is inert.

### One suppression registry, keyed by reason

Generalise the existing `miniPlayerGate` boolean into a reason-keyed set, so
independent subsystems can hide the bar without fighting each other:

```ts
suppressMiniPlayer("create-sheet");   // FAB Upload / Go Live open
suppressMiniPlayer("bible-tab");      // reading
releaseMiniPlayer("create-sheet");
```

The bar is hidden while any reason is held. This replaces the D3 geometry
collision with an explicit yield, which is what §1's "chrome arbitration"
invariant asks for — and it removes the need to keep two components' magic
offsets in sync.

### Derive layout from one source of truth

`getMiniPlayerBottomOffset()` computes clearance from the same nav-height and FAB
constants `BottomNav` uses, so the `+ 56` magic number disappears and the two
cannot drift.

### Gesture: down to dismiss, up to expand, nothing else

- `onStartShouldSetPanResponder: () => false` — never claim a tap.
- Claim on move only when the drag is downward-dominant and past 12px.
- `onPanResponderTerminationRequest: () => false` once genuinely dragging.
- No upward parking, no retained baseline; the bar springs home or dismisses.

---

## 5. Priority

| # | Change | Fixes | Risk |
|---|---|---|---|
| 1 | `isSessionActive`, excluded from persist | D1 (+ dead controls) | Low |
| 2 | Gesture claim rules | D2b | Low |
| 3 | `resolveFullPlayerTarget` + honest affordance | D2a | Low |
| 4 | Reason-keyed suppression + FAB wiring | D3 | Low |
| 5 | Layout offset helper | D3 drift | Very low |
| 6 | Mini bar redesign + progress line | UX | Medium (visual) |

## 6. Deliberately not done yet

- **Lock-screen / notification controls.** `staysActiveInBackground: true` is set
  in `createSetTrack.ts:76-82`, but without `expo-av` background modes plus a
  media-session shim there is no OS transport. This is the largest remaining gap
  versus Spotify and should be its own piece of work.
- **A real "Jump back in" resume surface.** The persisted resume point is now
  inert by design. Turning it into a deliberate, engine-backed resume entry point
  is a product decision, not a bug fix.
- **Gapless / prefetch of the next queue item.** Both reference apps preload the
  next track's first segment during the current one.
