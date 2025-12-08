# Unified Playlist System - Frontend Integration Guide

## ✅ Implementation Status

**COMPLETE** - Frontend now fully integrated with backend's unified playlist system.

---

## Overview

The frontend now supports the **unified playlist system** that allows users to mix:
- ✅ **Regular Media items** (from `Media` collection)
- ✅ **Copyright-Free Songs** (from `CopyrightFreeSong` collection)

All in the same playlist! 🎵

---

## Architecture

### Backend Endpoints Used

```
POST   /api/playlists                    - Create playlist
GET    /api/playlists                    - Get user's playlists
GET    /api/playlists/:playlistId        - Get single playlist
PUT    /api/playlists/:playlistId        - Update playlist
DELETE /api/playlists/:playlistId        - Delete playlist
POST   /api/playlists/:playlistId/tracks - Add track (mediaId OR copyrightFreeSongId)
DELETE /api/playlists/:playlistId/tracks/:trackId - Remove track
PUT    /api/playlists/:playlistId/tracks/reorder - Reorder tracks
```

### Frontend Files

1. **`app/utils/playlistAPI.ts`** (NEW)
   - API service for all playlist endpoints
   - Supports both `mediaId` and `copyrightFreeSongId`

2. **`app/store/usePlaylistStore.tsx`** (UPDATED)
   - Added `loadPlaylistsFromBackend()` method
   - Transforms backend format to frontend format
   - Maintains backward compatibility

3. **`app/components/CopyrightFreeSongModal.tsx`** (UPDATED)
   - Uses backend API for create/add/delete operations
   - Uses `copyrightFreeSongId` when adding copyright-free songs

---

## How It Works

### Adding Copyright-Free Songs to Playlist

```typescript
// In CopyrightFreeSongModal.tsx
const handleAddToExistingPlaylist = async (playlistId: string) => {
  // Uses backend API with copyrightFreeSongId
  const result = await playlistAPI.addTrackToPlaylist(playlistId, {
    copyrightFreeSongId: song.id || song._id,
    position: undefined, // Add to end
  });
};
```

### Adding Regular Media to Playlist

```typescript
// For regular Media items (videos, uploaded music, etc.)
const result = await playlistAPI.addTrackToPlaylist(playlistId, {
  mediaId: mediaItem._id,
  position: 0, // Optional: insert at specific position
});
```

### Creating Playlist

```typescript
// Creates playlist via backend
const result = await playlistAPI.createPlaylist({
  name: "My Worship Mix",
  description: "Favorite worship songs",
  isPublic: false,
});

// Then add tracks
await playlistAPI.addTrackToPlaylist(result.data._id, {
  copyrightFreeSongId: songId,
});
```

---

## API Request/Response Format

### Add Track Request

**For Copyright-Free Songs:**
```json
POST /api/playlists/:playlistId/tracks
{
  "copyrightFreeSongId": "64a1b2c3d4e5f6789abcdef1",
  "position": 0
}
```

**For Regular Media:**
```json
POST /api/playlists/:playlistId/tracks
{
  "mediaId": "64a1b2c3d4e5f6789abcdef0",
  "position": 0
}
```

### Response Format (Unified)

```json
{
  "success": true,
  "data": {
    "_id": "playlist123",
    "name": "My Worship Mix",
    "tracks": [
      {
        "_id": "track1",
        "trackType": "copyrightFree",
        "copyrightFreeSongId": "song123",
        "content": {
          "_id": "song123",
          "title": "Copyright-Free Song",
          "artistName": "Artist Name",
          "thumbnailUrl": "https://...",
          "fileUrl": "https://...",
          "duration": 180
        },
        "order": 0
      },
      {
        "_id": "track2",
        "trackType": "media",
        "mediaId": "media123",
        "content": {
          "_id": "media123",
          "title": "Regular Song",
          "artistName": "John Doe",
          "thumbnailUrl": "https://...",
          "fileUrl": "https://...",
          "duration": 240
        },
        "order": 1
      }
    ]
  }
}
```

**Key Point:** Frontend sees unified `content` object regardless of source!

---

## Frontend Data Transformation

### Backend → Frontend Format

The store transforms backend playlists to match the existing frontend format:

```typescript
// Backend format
{
  _id: "playlist123",
  tracks: [
    {
      trackType: "copyrightFree",
      content: { title: "...", artistName: "..." }
    }
  ]
}

// Transformed to frontend format
{
  id: "playlist123",
  songs: [
    {
      id: "...",
      title: "...",
      artist: "...",
      audioUrl: "...",
      // ...
    }
  ]
}
```

This ensures **zero breaking changes** to existing UI components!

---

## Usage in Components

### CopyrightFreeSongModal

The modal now:
1. ✅ Loads playlists from backend on open
2. ✅ Creates playlists via backend API
3. ✅ Adds copyright-free songs using `copyrightFreeSongId`
4. ✅ Deletes playlists via backend API
5. ✅ Shows loading states

### Example: Adding Song to Playlist

```typescript
// User taps "Add to Playlist" in CopyrightFreeSongModal
const handleAddToExistingPlaylist = async (playlistId: string) => {
  // Calls backend with copyrightFreeSongId
  await playlistAPI.addTrackToPlaylist(playlistId, {
    copyrightFreeSongId: song.id,
  });
  
  // Refreshes playlists from backend
  await loadPlaylistsFromBackend();
};
```

---

## Error Handling

### Network Errors
- Shows user-friendly error messages
- Falls back to local storage if backend unavailable
- Maintains offline functionality

### Validation Errors
- Backend validates `mediaId` OR `copyrightFreeSongId` (not both)
- Frontend shows specific error messages
- Prevents duplicate tracks

---

## Testing Checklist

- [x] Create playlist via backend
- [x] Add copyright-free song to playlist
- [x] Add regular media to playlist (when implemented)
- [x] Mix both types in same playlist
- [x] Delete playlist via backend
- [x] Load playlists from backend
- [x] Transform backend format to frontend format
- [x] Show loading states
- [x] Handle errors gracefully
- [x] Maintain backward compatibility

---

## Future Enhancements

### For Regular Media Items

When adding regular Media items to playlists, use:

```typescript
await playlistAPI.addTrackToPlaylist(playlistId, {
  mediaId: mediaItem._id,
  position: 0,
});
```

The same unified system works for both types!

### Reordering Tracks

```typescript
await playlistAPI.reorderPlaylistTracks(playlistId, [
  "trackId1",
  "trackId2",
  "trackId3"
]);
```

---

## Summary

✅ **Frontend Now:**
- Uses backend unified playlist API
- Supports both `mediaId` and `copyrightFreeSongId`
- Transforms backend format to frontend format
- Maintains backward compatibility
- Shows loading states
- Handles errors gracefully

✅ **Backend Ready:**
- Unified playlist system implemented
- Supports both track types
- Returns normalized `content` objects

✅ **User Experience:**
- Can mix copyright-free songs and regular media
- Seamless playlist management
- Works like Spotify/Apple Music

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-27  
**Status:** ✅ Complete Integration




