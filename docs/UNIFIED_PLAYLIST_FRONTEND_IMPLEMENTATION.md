# Unified Playlist System - Frontend Implementation

## ✅ Implementation Complete

The frontend is now fully integrated with the backend's unified playlist system, supporting both **Media** and **Copyright-Free Songs** in the same playlist.

---

## What Was Implemented

### 1. Playlist API Service (`app/utils/playlistAPI.ts`)

**NEW FILE** - Complete API service matching backend endpoints:

```typescript
// Unified endpoints supporting both track types
playlistAPI.createPlaylist(data)
playlistAPI.getUserPlaylists()
playlistAPI.getPlaylistById(id)
playlistAPI.updatePlaylist(id, updates)
playlistAPI.deletePlaylist(id)
playlistAPI.addTrackToPlaylist(playlistId, { mediaId?, copyrightFreeSongId? })
playlistAPI.removeTrackFromPlaylist(playlistId, trackId, trackType?)
playlistAPI.reorderPlaylistTracks(playlistId, trackIds)
```

**Key Features:**
- ✅ Validates exactly one ID (`mediaId` OR `copyrightFreeSongId`)
- ✅ Handles authentication tokens
- ✅ Consistent error handling
- ✅ Type-safe interfaces

---

### 2. Updated Playlist Store (`app/store/usePlaylistStore.tsx`)

**Added:**
- `loadPlaylistsFromBackend()` - Syncs with backend
- Transforms backend format to frontend format
- Maintains backward compatibility with local storage

**Transformation Logic:**
```typescript
// Backend format → Frontend format
{
  _id: "playlist123",
  tracks: [
    {
      trackType: "copyrightFree",
      content: { title: "...", artistName: "..." }
    }
  ]
}
↓
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

---

### 3. Updated CopyrightFreeSongModal (`app/components/CopyrightFreeSongModal.tsx`)

**Changes:**
- ✅ Uses `playlistAPI` instead of local store
- ✅ Creates playlists via backend
- ✅ Adds songs using `copyrightFreeSongId`
- ✅ Deletes playlists via backend
- ✅ Shows loading states
- ✅ Handles errors gracefully

**Key Functions:**
```typescript
// Create playlist
handleCreatePlaylist() → playlistAPI.createPlaylist()

// Add to existing playlist
handleAddToExistingPlaylist(playlistId) → playlistAPI.addTrackToPlaylist(playlistId, {
  copyrightFreeSongId: song.id
})

// Delete playlist
handleDeletePlaylist(playlistId) → playlistAPI.deletePlaylist(playlistId)
```

---

## API Integration Flow

### Adding Copyright-Free Song to Playlist

```
User taps "Add to Playlist" in CopyrightFreeSongModal
    ↓
handleAddToExistingPlaylist(playlistId)
    ↓
playlistAPI.addTrackToPlaylist(playlistId, {
  copyrightFreeSongId: song.id
})
    ↓
POST /api/playlists/:playlistId/tracks
Body: { copyrightFreeSongId: "song123" }
    ↓
Backend validates and adds track
    ↓
Frontend refreshes playlists from backend
    ↓
UI updates with new track
```

### Creating New Playlist

```
User taps "Create New Playlist"
    ↓
handleCreatePlaylist()
    ↓
playlistAPI.createPlaylist({ name, description })
    ↓
POST /api/playlists
Body: { name: "...", description: "..." }
    ↓
Backend creates playlist
    ↓
If song exists, automatically add it
    ↓
Frontend refreshes playlists
    ↓
UI shows new playlist
```

---

## Request/Response Examples

### Add Track Request (Copyright-Free Song)

```http
POST /api/playlists/64a1b2c3d4e5f6789abcdef0/tracks
Content-Type: application/json
Authorization: Bearer <token>

{
  "copyrightFreeSongId": "64a1b2c3d4e5f6789abcdef1",
  "position": 0
}
```

### Add Track Request (Regular Media)

```http
POST /api/playlists/64a1b2c3d4e5f6789abcdef0/tracks
Content-Type: application/json
Authorization: Bearer <token>

{
  "mediaId": "64a1b2c3d4e5f6789abcdef2",
  "position": 0
}
```

### Response (Unified Format)

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
        "order": 0,
        "addedAt": "2024-01-15T10:00:00.000Z"
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
        "order": 1,
        "addedAt": "2024-01-15T10:05:00.000Z"
      }
    ]
  }
}
```

---

## Frontend Data Flow

### Loading Playlists

```typescript
// On modal open
useEffect(() => {
  if (visible) {
    loadPlaylistsFromBackend();
  }
}, [visible]);

// In store
loadPlaylistsFromBackend() {
  // 1. Fetch from backend
  const result = await playlistAPI.getUserPlaylists();
  
  // 2. Transform backend format to frontend format
  const transformed = result.data.playlists.map(backendPlaylist => ({
    id: backendPlaylist._id,
    name: backendPlaylist.name,
    songs: backendPlaylist.tracks.map(track => ({
      id: track.content._id,
      title: track.content.title,
      artist: track.content.artistName,
      // ...
    }))
  }));
  
  // 3. Update store
  set({ playlists: transformed });
}
```

### Adding Track

```typescript
// In modal
const handleAddToExistingPlaylist = async (playlistId: string) => {
  // 1. Call backend API
  const result = await playlistAPI.addTrackToPlaylist(playlistId, {
    copyrightFreeSongId: song.id || song._id
  });
  
  // 2. Refresh playlists
  await loadPlaylistsFromBackend();
  
  // 3. Show success message
  Alert.alert("Success", "Song added to playlist!");
};
```

---

## Error Handling

### Network Errors
- Shows user-friendly error messages
- Falls back to local storage if backend unavailable
- Maintains offline functionality

### Validation Errors
- Backend validates exactly one ID (not both)
- Frontend shows specific error messages
- Prevents duplicate tracks

### Example Error Handling

```typescript
const result = await playlistAPI.addTrackToPlaylist(playlistId, {
  copyrightFreeSongId: songId
});

if (!result.success) {
  if (result.error?.includes("already in the playlist")) {
    Alert.alert("Info", "This song is already in the playlist");
  } else {
    Alert.alert("Error", result.error || "Failed to add song");
  }
  return;
}
```

---

## UI Updates

### Loading States

```typescript
{isLoadingPlaylists ? (
  <Text>Loading playlists...</Text>
) : playlists.length === 0 ? (
  <Text>No playlists yet. Create one to get started!</Text>
) : (
  // Show playlists
)}
```

### Playlist Display

The UI automatically works with the transformed format:
- `playlist.id` - Works with backend `_id`
- `playlist.songs.length` - Works with transformed tracks
- `playlist.name` - Works directly
- `playlist.description` - Works directly

---

## Testing Checklist

- [x] Create playlist via backend API
- [x] Add copyright-free song to playlist
- [x] Load playlists from backend
- [x] Transform backend format to frontend format
- [x] Delete playlist via backend API
- [x] Show loading states
- [x] Handle errors gracefully
- [x] Maintain backward compatibility
- [x] Support both `id` and `_id` formats

---

## Future: Adding Regular Media

When you want to add regular Media items to playlists, use the same API:

```typescript
// For regular Media (videos, uploaded music, etc.)
await playlistAPI.addTrackToPlaylist(playlistId, {
  mediaId: mediaItem._id,
  position: 0
});
```

The unified system works for both types! 🎵

---

## Summary

✅ **Frontend Now:**
- Fully integrated with backend unified playlist system
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

