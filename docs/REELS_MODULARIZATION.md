# Reels Modularization Guide

## Overview

`Reelsviewscroll.tsx` was modularized from ~1158 lines to ~506 lines. Logic is split across focused modules for easier debugging and maintenance.

## File Structure

```
app/reels/
├── Reelsviewscroll.tsx         # Main orchestrator (~506 lines)
├── components/
│   ├── ReelsActionButtons.tsx
│   ├── ReelsErrorView.tsx
│   ├── ReelsHeader.tsx
│   ├── ReelsMenu.tsx
│   ├── ReelsModals.tsx         # Header + bottom nav + all modals
│   ├── ReelsProgressBar.tsx
│   ├── ReelsSpeakerInfo.tsx
│   └── ReelsVideoItem.tsx
└── hooks/
    ├── useReelsCurrentVideo.ts # Video metadata, keys, speaker resolution
    ├── useReelsHandlers.ts     # Like, comment, share, save, navigation
    ├── useReelsResponsive.ts
    ├── useReelsScroll.ts
    ├── useReelsVideoList.ts
    └── useReelsVideoPlayback.ts # Seek, formatTime, playback effects
```

## Where to Debug

| Symptom | Check |
|---------|-------|
| Wrong author/speaker name | `useReelsCurrentVideo.ts` → `getSpeakerName` |
| Like/comment/share not working | `useReelsHandlers.ts` |
| Video won't seek or play | `useReelsVideoPlayback.ts` |
| Scroll/snap issues | `useReelsScroll.ts` |
| Video list parsing | `useReelsVideoList.ts` |
| Modal/header layout | `ReelsModals.tsx`, `ReelsVideoItem.tsx` |

## Other Large Files (Modularized or Pending)

| File | Before | After | Notes |
|------|--------|-------|-------|
| `Reelsviewscroll.tsx` | 1158 | 506 | useReelsCurrentVideo, useReelsHandlers, useReelsVideoPlayback, ReelsModals |
| `AllContentTikTok.tsx` | 1715 | 1564 | useAllContentTikTokAudio hook |
| `AllLibrary.tsx` | 1845 | 1545 | getThumbnailSource, getContentTypeColor, isVideoContent, isAudioContent → utils |
| `CopyrightFreeSongModal.tsx` | 2515 | - | Pending: useCopyrightModal, useSongList |
| `upload.tsx` | 2110 | - | Pending: useUploadForm, UploadSteps |
| `contentInteractionAPI.ts` | 1319 | - | Pending: split by domain |
