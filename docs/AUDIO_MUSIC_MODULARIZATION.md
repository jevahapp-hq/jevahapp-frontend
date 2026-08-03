# Audio / Music Modularization

**Date:** 2026-08-02 (updated)  
**Status:** God-file split complete for music / audio / CF modal / floating player.

---

## Done

| Before | After | Notes |
|--------|------:|-------|
| `MusicScreen.tsx` ~1175 | **~147** | Types, hooks, song items, header/shelf/list/modals |
| `useGlobalAudioPlayerStore.tsx` ~673 | **~125** | Modules under `app/store/audioPlayer/` |
| CF `index.tsx` ~590 | **~170** | Player pieces + modal hooks |
| CF `SongModalPlayer.tsx` ~602 | **~140** | Artwork/transport/progress/skip |
| `src/shared/.../CopyrightFreeSongModal/*` | **re-export barrel** | Canonical = `app/components/CopyrightFreeSongModal` |
| `FloatingAudioPlayer.tsx` ~507 | **folder** (~80 index + mini bar + hooks) | Old monolith deleted |

### Public APIs unchanged
- `useGlobalAudioPlayerStore` / `AudioTrack`
- `CopyrightFreeSongModal` (app path)
- `FloatingAudioPlayer` (folder index)
- Music default export from `MusicScreen`

---

## Rules going forward

1. One CF modal tree (`app/`); shared path only re-exports.  
2. Screens orchestrate; hooks own I/O; pure utils own math.  
3. Prefer new files under ~180 lines; hard cap ~250.  
4. Do not merge CF + feed view HTTP clients — share qualification helpers only.
