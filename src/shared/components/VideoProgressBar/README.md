# VideoProgressBar (modular scrubber)

TikTok / IG-style seek bar used by feed `VideoCard` and Reels.

## Seek pipeline (debug top → bottom)

1. **`useProgressBarGestures`** — RNGH `Gesture.Pan` (manual activate so Reels FlatList cannot steal) + refs for width/callbacks
2. **`TikTokProgressBar`** — live scrub (`seekDuringDrag`) + hold UI via `useSeekSync`
3. **Parent** — `onSeekToPercent(0..1)`
4. **Feed:** `useVideoCardSeek` → `expoVideoAdapter.seekPlayerToMs`
5. **Reels:** `seekToPosition` → expo-av `setPositionAsync` (accepts 0–1; `>1` = legacy 0–100)

## Module map

| File | Responsibility |
|------|----------------|
| `TikTokProgressBar.tsx` | Sheet chrome, mute, wires gestures → seek |
| `ProgressBarTrack.tsx` | Track / fill / knob + `GestureDetector` |
| `useProgressBarGestures.ts` | RNGH pan + live/tap seek |
| `useProgressBarState.ts` | Drag / seeking / width |
| `useSeekSync.ts` | Hold bar until player catches target |
| `useHaptics.ts` | Optional haptics |
| `defaultConfig.ts` | Defaults (`seekDuringDrag: true`) |
| `utils.ts` / `types.ts` | Math + types |
| `VideoProgressBar.tsx` | Legacy prop shim |

## Why scrub used to fail

1. Stale `PanResponder` + `barWidth === 0` → sought **0%** (fixed with refs).
2. RN `PanResponder` loses to RNGH `FlatList` — scrub never granted (fixed with `Gesture.Pan` + `manualActivation`).

## Parent wiring tips

- Keep the scrubber **outside** `TouchableWithoutFeedback` (play tap) so pan wins.
- Pass `onScrubStart` / `onScrubEnd` to lock Reels scroll and suppress auto-loop.
- Prefer player `duration` over backend for seek math when available.
