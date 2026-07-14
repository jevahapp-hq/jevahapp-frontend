# VideoProgressBar (modular scrubber)

TikTok / IG-style seek bar used by feed `VideoCard` and Reels.

## Seek pipeline (debug top → bottom)

1. **`useProgressBarGestures`** — pan / tap (all callbacks + `barWidth` via **refs**; never freeze `PanResponder` in a one-shot `useRef`)
2. **`TikTokProgressBar`** — live scrub (`seekDuringDrag`) + hold UI via `useSeekSync`
3. **Parent** — `onSeekToPercent(0..1)`
4. **Feed:** `useVideoCardSeek` → `expoVideoAdapter.seekPlayerToMs` (`player.currentTime`)
5. **Reels:** `seekToPosition` → expo-av `setPositionAsync`

## Module map

| File | Responsibility |
|------|----------------|
| `TikTokProgressBar.tsx` | Sheet chrome, mute, wires gestures → seek |
| `ProgressBarTrack.tsx` | Track / fill / knob / floating time |
| `useProgressBarGestures.ts` | PanResponder + live/tap seek |
| `useProgressBarState.ts` | Drag / seeking / width |
| `useSeekSync.ts` | Hold bar until player catches target |
| `useHaptics.ts` | Optional haptics |
| `defaultConfig.ts` | Defaults (`seekDuringDrag: true`) |
| `utils.ts` / `types.ts` | Math + types |
| `VideoProgressBar.tsx` | Legacy prop shim |

## Why scrub used to fail

`PanResponder.create` lived in `useRef(...).current` once. First render had `barWidth === 0` and stale `dragProgress` / `onSeekToPercent`, so release often sought **0%**. Fixed by reading width + callbacks from refs inside a stable responder.

## Parent wiring tips

- Keep the scrubber **outside** `TouchableWithoutFeedback` (play tap) so pan wins.
- Pass `onScrubStart` / `onScrubEnd` to suppress near-end auto-loop and Reels position fights.
- Prefer player `duration` over backend for seek math when available.
