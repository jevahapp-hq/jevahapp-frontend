# Modularization & Scalability Roadmap

## Component Line Counts & Priorities

| Component | Lines | Target | Strategy | Status |
|-----------|-------|--------|----------|--------|
| AllContentTikTok | ~455 | ≤500 | Handlers, feed data, stats helpers | ✅ Done |
| VideoCard | ~585 | ≤500 | Tap logic, footer, modals, player area, hooks | ✅ Done |
| CopyrightFreeSongModal | ~375 | ≤500 | Player, playlist, queue, search, modal shell | ✅ Done |
| CopyrightFreeSongs | ~1026 | ≤500 | Card list, player bar, filters | Pending |
| VideoComponent | ~2370 | ≤500 | Tabs, list, modals, player wiring | Pending |
| Reelsviewscroll | ~535 | ≤500 | Reel item, player area, list logic | Pending |
| music.tsx | ~1100 | ≤500 | Song cards, player bar, sections, filters | Pending |
| AllLibrary.tsx | ~225 | ≤500 | Tabs, library sections | ✅ Done |
| ContentCard | ~289 (index) | ≤500 | Hooks + Video/Audio/Image views | ✅ Done |
| useInteractionStore | ~77 (index) | ≤500 | Actions split into modules | ✅ Done |

---

## Execution Order

1. **VideoCard** – ✅ Done: `useVideoCardTapLogic`, `VideoCardFooter`, `VideoCardModals`, `VideoCardPlayerArea`, `useVideoCardPlayback`, `useVideoCardInteractionStats`, `useVideoCardSeek`
2. **CopyrightFreeSongModal** – Extract: `SongModalPlayer`, `SongModalPlaylistView`, `SongModalQueue`, search, modal shell (partial ✅: Player, Options, PlaylistView exist)
3. **CopyrightFreeSongs** – Extract: card list, player bar, filters
4. **VideoComponent** – Extract: tabs, list, modals, player wiring
5. **Reelsviewscroll** – Extract: reel item, player area, list logic
6. **music.tsx** – Extract: song cards, player bar, sections, filters
7. **AllLibrary** – Extract: tabs, library sections
8. **ContentCard** – ✅ Done: `useContentCardState`, `useContentCardHandlers`, `useContentCardMedia`, `useContentCardSocket`, `ContentCardVideoView`, `ContentCardAudioView`, `ContentCardImageView`
9. **useInteractionStore** – ✅ Done: `likeActions`, `saveActions`, `shareViewActions`, `commentActions`, `statsActions`, `cacheActions`

---

## VideoCard Extraction (Completed)

- `useVideoCardTapLogic.ts` – handleVideoTap, handleTogglePlay, tap refs, double-tap
- `VideoCardFooter.tsx` – Avatar, CardFooterActions, ThreeDotsMenu
- `VideoCardModals.tsx` – ContentActionModal, DeleteMediaConfirmation, ReportMediaModal, MediaDetailsModal
- `VideoCardPlayerArea.tsx` – Video/thumbnail, overlay, progress bar
- `useVideoCardPlayback.ts` – statusChange, timeUpdate, view tracking
- `useVideoCardInteractionStats.ts` – like/save/comment/view counts
- `useVideoCardSeek.ts` – seekBySeconds, seekToPercent
