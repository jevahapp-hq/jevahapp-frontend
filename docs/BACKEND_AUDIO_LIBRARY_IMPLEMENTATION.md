# Backend Implementation Guide: Audio Library System (YouTube Audio Library Style)

## Overview

This document provides a comprehensive specification for implementing a fully functional audio library system that works seamlessly with the existing frontend UI. The system should function like YouTube's Audio Library, providing copyright-free music, playlists, playback tracking, and user management.

---

## 1. Copyright-Free Songs Management

### Purpose
The frontend currently uses hardcoded copyright-free songs stored locally. We need a backend system to:
- Store and serve copyright-free audio tracks
- Manage metadata (title, artist, duration, category, thumbnails)
- Track usage statistics (plays, likes, views)
- Support search and filtering
- Enable user interactions (like, save to library)

### API Endpoints Required

#### 1.1 Get All Copyright-Free Songs
**Endpoint**: `GET /api/audio/copyright-free`

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `category`: Filter by category (e.g., "Gospel Music", "Traditional Gospel", "Contemporary Gospel")
- `search`: Search query (searches title, artist, description)
- `sort`: Sort order - "popular", "newest", "oldest", "title" (default: "popular")

**Response**:
```json
{
  "success": true,
  "data": {
    "songs": [
      {
        "id": "song-in-the-name-of-jesus",
        "title": "In The Name of Jesus",
        "artist": "Tadashikeiji",
        "year": 2024,
        "audioUrl": "https://cdn.jevahapp.com/audio/in-the-name-of-jesus.mp3",
        "thumbnailUrl": "https://cdn.jevahapp.com/images/jesus.webp",
        "category": "Gospel Music",
        "duration": 180, // in seconds
        "contentType": "copyright-free-music",
        "description": "A powerful gospel song praising the name of Jesus Christ.",
        "speaker": "Tadashikeiji",
        "uploadedBy": "system",
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z",
        "views": 1250,
        "likes": 89,
        "isLiked": false, // User's like status (if authenticated)
        "isInLibrary": false, // User's library status (if authenticated)
        "isPublicDomain": true,
        "tags": ["gospel", "worship", "jesus"],
        "fileSize": 4320000, // in bytes
        "bitrate": 192, // kbps
        "format": "mp3"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

#### 1.2 Get Single Copyright-Free Song
**Endpoint**: `GET /api/audio/copyright-free/:songId`

**Response**:
```json
{
  "success": true,
  "data": {
    "song": {
      // Same structure as above
    }
  }
}
```

#### 1.3 Search Copyright-Free Songs
**Endpoint**: `GET /api/audio/copyright-free/search`

**Query Parameters**:
- `q`: Search query (required)
- `category`: Filter by category (optional)
- `limit`: Results limit (default: 20)

**Response**: Same as 1.1

#### 1.4 Get Categories
**Endpoint**: `GET /api/audio/copyright-free/categories`

**Response**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "name": "Gospel Music",
        "count": 45,
        "icon": "musical-notes"
      },
      {
        "name": "Traditional Gospel",
        "count": 32,
        "icon": "musical-notes"
      }
    ]
  }
}
```

---

## 2. User Playlist Management

### Purpose
The frontend currently stores playlists locally. We need backend sync to:
- Persist playlists across devices
- Enable playlist sharing (future feature)
- Sync playlist changes in real-time
- Support collaborative playlists (future feature)

### API Endpoints Required

#### 2.1 Get User Playlists
**Endpoint**: `GET /api/audio/playlists`

**Headers**: `Authorization: Bearer <token>` (required)

**Query Parameters**:
- `includeSongs`: Include full song data (default: true)

**Response**:
```json
{
  "success": true,
  "data": {
    "playlists": [
      {
        "id": "playlist-1234567890-abc",
        "name": "My Worship Songs",
        "description": "Favorite worship songs for morning devotion",
        "songs": [
          {
            "id": "song-in-the-name-of-jesus",
            "title": "In The Name of Jesus",
            "artist": "Tadashikeiji",
            "audioUrl": "https://cdn.jevahapp.com/audio/in-the-name-of-jesus.mp3",
            "thumbnailUrl": "https://cdn.jevahapp.com/images/jesus.webp",
            "duration": 180,
            "category": "Gospel Music",
            "description": "A powerful gospel song...",
            "addedAt": "2024-01-15T10:30:00Z",
            "order": 1 // Position in playlist
          }
        ],
        "createdAt": "2024-01-10T08:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z",
        "thumbnailUrl": "https://cdn.jevahapp.com/images/jesus.webp", // First song's thumbnail
        "songCount": 12,
        "totalDuration": 2160, // Total duration in seconds
        "isPublic": false,
        "isCollaborative": false
      }
    ],
    "total": 5
  }
}
```

#### 2.2 Create Playlist
**Endpoint**: `POST /api/audio/playlists`

**Headers**: `Authorization: Bearer <token>` (required)

**Request Body**:
```json
{
  "name": "My Worship Songs",
  "description": "Favorite worship songs for morning devotion",
  "isPublic": false
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "playlist": {
      // Full playlist object (same structure as 2.1)
    }
  }
}
```

#### 2.3 Get Single Playlist
**Endpoint**: `GET /api/audio/playlists/:playlistId`

**Headers**: `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "playlist": {
      // Full playlist object with songs
    }
  }
}
```

#### 2.4 Update Playlist
**Endpoint**: `PUT /api/audio/playlists/:playlistId`

**Headers**: `Authorization: Bearer <token>` (required)

**Request Body**:
```json
{
  "name": "Updated Playlist Name",
  "description": "Updated description",
  "isPublic": false
}
```

**Response**: Same as 2.3

#### 2.5 Delete Playlist
**Endpoint**: `DELETE /api/audio/playlists/:playlistId`

**Headers**: `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "message": "Playlist deleted successfully"
}
```

#### 2.6 Add Song to Playlist
**Endpoint**: `POST /api/audio/playlists/:playlistId/songs`

**Headers**: `Authorization: Bearer <token>` (required)

**Request Body**:
```json
{
  "songId": "song-in-the-name-of-jesus",
  "position": 0 // Optional: insert at specific position (0 = beginning, -1 = end)
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "playlist": {
      // Updated playlist object
    }
  }
}
```

#### 2.7 Remove Song from Playlist
**Endpoint**: `DELETE /api/audio/playlists/:playlistId/songs/:songId`

**Headers**: `Authorization: Bearer <token>` (required)

**Response**: Same as 2.6

#### 2.8 Reorder Playlist Songs
**Endpoint**: `PUT /api/audio/playlists/:playlistId/songs/reorder`

**Headers**: `Authorization: Bearer <token>` (required)

**Request Body**:
```json
{
  "songIds": [
    "song-1",
    "song-3",
    "song-2"
  ]
}
```

**Response**: Same as 2.6

---

## 3. Audio Playback Tracking

### Purpose
Track user listening behavior for analytics, recommendations, and resume functionality.

### API Endpoints Required

#### 3.1 Start Playback
**Endpoint**: `POST /api/audio/playback/start`

**Headers**: `Authorization: Bearer <token>` (optional, but recommended)

**Request Body**:
```json
{
  "trackId": "song-in-the-name-of-jesus",
  "trackType": "copyright-free-music", // or "user-upload", "sermon", etc.
  "playlistId": "playlist-123", // Optional: if playing from playlist
  "position": 0 // Optional: resume position in milliseconds
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "playbackId": "playback-abc123",
    "track": {
      // Full track object
    },
    "resumePosition": 0 // Last position if resuming
  }
}
```

#### 3.2 Update Playback Progress
**Endpoint**: `POST /api/audio/playback/progress`

**Headers**: `Authorization: Bearer <token>` (optional)

**Request Body**:
```json
{
  "playbackId": "playback-abc123",
  "position": 45000, // Current position in milliseconds
  "duration": 180000, // Total duration in milliseconds
  "progress": 0.25 // 0-1 ratio
}
```

**Response**:
```json
{
  "success": true,
  "message": "Progress updated"
}
```

**Note**: Frontend will call this every 10-30 seconds during playback. Consider rate limiting.

#### 3.3 Complete Playback
**Endpoint**: `POST /api/audio/playback/complete`

**Headers**: `Authorization: Bearer <token>` (optional)

**Request Body**:
```json
{
  "playbackId": "playback-abc123",
  "completed": true,
  "totalPlayTime": 180000, // Total time played in milliseconds
  "completedAt": "2024-01-15T10:33:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Playback completed"
}
```

#### 3.4 Pause/Resume Playback
**Endpoint**: `POST /api/audio/playback/pause` or `POST /api/audio/playback/resume`

**Request Body**:
```json
{
  "playbackId": "playback-abc123",
  "position": 45000
}
```

#### 3.5 Get Playback History
**Endpoint**: `GET /api/audio/playback/history`

**Headers**: `Authorization: Bearer <token>` (required)

**Query Parameters**:
- `limit`: Number of records (default: 50, max: 100)
- `offset`: Pagination offset (default: 0)
- `trackType`: Filter by type (optional)

**Response**:
```json
{
  "success": true,
  "data": {
    "playbacks": [
      {
        "id": "playback-abc123",
        "trackId": "song-in-the-name-of-jesus",
        "trackTitle": "In The Name of Jesus",
        "trackArtist": "Tadashikeiji",
        "trackThumbnail": "https://cdn.jevahapp.com/images/jesus.webp",
        "startedAt": "2024-01-15T10:30:00Z",
        "completedAt": "2024-01-15T10:33:00Z",
        "totalPlayTime": 180000,
        "completed": true,
        "progress": 1.0
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0
    }
  }
}
```

#### 3.6 Get Last Playback Position
**Endpoint**: `GET /api/audio/playback/last-position/:trackId`

**Headers**: `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "trackId": "song-in-the-name-of-jesus",
    "lastPosition": 45000, // in milliseconds
    "lastPlayedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 4. User Interactions

### Purpose
Track likes, saves, and other user interactions with audio content.

### API Endpoints Required

#### 4.1 Like/Unlike Song
**Endpoint**: `POST /api/audio/copyright-free/:songId/like` or `DELETE /api/audio/copyright-free/:songId/like`

**Headers**: `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "isLiked": true,
    "likeCount": 90
  }
}
```

#### 4.2 Save/Unsave Song to Library
**Endpoint**: `POST /api/audio/copyright-free/:songId/save` or `DELETE /api/audio/copyright-free/:songId/save`

**Headers**: `Authorization: Bearer <token>` (required)

**Response**:
```json
{
  "success": true,
  "data": {
    "isInLibrary": true
  }
}
```

#### 4.3 Get User Library
**Endpoint**: `GET /api/audio/library`

**Headers**: `Authorization: Bearer <token>` (required)

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "songs": [
      // Array of saved songs (same structure as copyright-free songs)
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

---

## 5. Database Schema

### 5.1 Copyright-Free Songs Table
```sql
CREATE TABLE copyright_free_songs (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  year INT,
  audio_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  category VARCHAR(100),
  duration INT NOT NULL, -- in seconds
  content_type VARCHAR(50) DEFAULT 'copyright-free-music',
  description TEXT,
  speaker VARCHAR(255),
  uploaded_by VARCHAR(255) DEFAULT 'system',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  is_public_domain BOOLEAN DEFAULT true,
  tags JSON,
  file_size BIGINT, -- in bytes
  bitrate INT, -- kbps
  format VARCHAR(10),
  INDEX idx_category (category),
  INDEX idx_created_at (created_at),
  FULLTEXT INDEX idx_search (title, artist, description)
);
```

### 5.2 User Playlists Table
```sql
CREATE TABLE user_playlists (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  is_public BOOLEAN DEFAULT false,
  is_collaborative BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
);
```

### 5.3 Playlist Songs Table (Junction)
```sql
CREATE TABLE playlist_songs (
  id VARCHAR(255) PRIMARY KEY,
  playlist_id VARCHAR(255) NOT NULL,
  song_id VARCHAR(255) NOT NULL,
  song_type VARCHAR(50) DEFAULT 'copyright-free-music', -- 'copyright-free-music', 'user-upload', etc.
  position INT NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (playlist_id) REFERENCES user_playlists(id) ON DELETE CASCADE,
  UNIQUE KEY unique_playlist_song (playlist_id, song_id, song_type),
  INDEX idx_playlist_id (playlist_id),
  INDEX idx_position (playlist_id, position)
);
```

### 5.4 Audio Playbacks Table
```sql
CREATE TABLE audio_playbacks (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255), -- NULL for anonymous
  track_id VARCHAR(255) NOT NULL,
  track_type VARCHAR(50) NOT NULL,
  playlist_id VARCHAR(255), -- NULL if not from playlist
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  last_position INT DEFAULT 0, -- in milliseconds
  total_play_time INT DEFAULT 0, -- in milliseconds
  completed BOOLEAN DEFAULT false,
  INDEX idx_user_id (user_id),
  INDEX idx_track_id (track_id),
  INDEX idx_started_at (started_at)
);
```

### 5.5 User Song Interactions Table
```sql
CREATE TABLE user_song_interactions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  song_id VARCHAR(255) NOT NULL,
  song_type VARCHAR(50) NOT NULL,
  is_liked BOOLEAN DEFAULT false,
  is_in_library BOOLEAN DEFAULT false,
  last_played_at TIMESTAMP,
  last_position INT DEFAULT 0, -- in milliseconds
  play_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_song (user_id, song_id, song_type),
  INDEX idx_user_id (user_id),
  INDEX idx_song_id (song_id)
);
```

---

## 6. Frontend Integration Points

### 6.1 Current Frontend State
The frontend currently:
- Uses local `require()` statements for audio files
- Stores playlists in AsyncStorage (local only)
- Has a global audio player store (`useGlobalAudioPlayerStore`)
- Has a playlist store (`usePlaylistStore`)
- Displays copyright-free songs in `CopyrightFreeSongs.tsx`
- Shows full audio modal in `CopyrightFreeSongModal.tsx`

### 6.2 Required Frontend Changes
1. **Replace local audio files with API calls**
   - Fetch songs from `/api/audio/copyright-free`
   - Use `audioUrl` from API response instead of `require()`

2. **Sync playlists with backend**
   - On app start: Fetch user playlists from `/api/audio/playlists`
   - On create: POST to `/api/audio/playlists`
   - On update: PUT to `/api/audio/playlists/:id`
   - On delete: DELETE to `/api/audio/playlists/:id`
   - On add song: POST to `/api/audio/playlists/:id/songs`
   - On remove song: DELETE to `/api/audio/playlists/:id/songs/:songId`

3. **Track playback**
   - Call `/api/audio/playback/start` when track starts
   - Call `/api/audio/playback/progress` every 10-30 seconds
   - Call `/api/audio/playback/complete` when track finishes
   - Call `/api/audio/playback/pause` and `/api/audio/playback/resume` appropriately

4. **User interactions**
   - Call `/api/audio/copyright-free/:songId/like` on like/unlike
   - Call `/api/audio/copyright-free/:songId/save` on save/unsave
   - Fetch library from `/api/audio/library`

---

## 7. Implementation Priority

### Phase 1: Core Functionality (MVP)
1. ✅ Copyright-free songs CRUD endpoints
2. ✅ Get all songs with pagination and filtering
3. ✅ User playlist CRUD endpoints
4. ✅ Add/remove songs from playlists
5. ✅ Basic playback tracking (start, complete)

### Phase 2: Enhanced Features
1. ✅ Search functionality
2. ✅ Like/save interactions
3. ✅ Playback history
4. ✅ Resume playback position
5. ✅ User library management

### Phase 3: Advanced Features
1. ⏳ Playlist sharing
2. ⏳ Collaborative playlists
3. ⏳ Recommendations based on listening history
4. ⏳ Analytics dashboard
5. ⏳ Playlist templates

---

## 8. Important Notes

### 8.1 Audio File Storage
- Store audio files in CDN or cloud storage (AWS S3, Cloudinary, etc.)
- Provide signed URLs for secure access if needed
- Support multiple formats (MP3, AAC, OGG)
- Consider streaming for large files

### 8.2 Performance Considerations
- Cache frequently accessed songs
- Use pagination for large result sets
- Implement rate limiting for playback tracking
- Use database indexes for search queries
- Consider Elasticsearch for advanced search

### 9.3 Security
- Authenticate playlist operations (users can only modify their own playlists)
- Validate file uploads (if allowing user uploads)
- Sanitize search queries
- Rate limit API endpoints
- Use HTTPS for all audio file URLs

### 8.4 Error Handling
- Return consistent error format:
```json
{
  "success": false,
  "error": {
    "code": "SONG_NOT_FOUND",
    "message": "Song with ID 'xyz' not found",
    "statusCode": 404
  }
}
```

### 8.5 Response Format
All successful responses should follow:
```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

---

## 10. Testing Checklist

- [ ] Get all copyright-free songs with pagination
- [ ] Search songs by query
- [ ] Filter songs by category
- [ ] Create, read, update, delete playlists
- [ ] Add/remove songs from playlists
- [ ] Reorder playlist songs
- [ ] Track playback start/progress/complete
- [ ] Like/unlike songs
- [ ] Save/unsave songs to library
- [ ] Get user library
- [ ] Get playback history
- [ ] Resume playback from last position
- [ ] Handle authentication errors
- [ ] Handle network errors gracefully
- [ ] Test with large playlists (100+ songs)
- [ ] Test concurrent playlist modifications
- [ ] Test rate limiting on playback tracking

---

## 11. Questions for Backend Team

1. **File Storage**: Where will audio files be stored? (S3, Cloudinary, local server?)
2. **CDN**: Will there be a CDN for audio file delivery?
3. **File Upload**: Will admins upload songs via API or admin panel?
4. **Authentication**: Which authentication method? (JWT, OAuth, etc.)
5. **Rate Limiting**: What rate limits should be applied?
6. **Caching**: What caching strategy for frequently accessed data?
7. **Search**: Will you use database full-text search or Elasticsearch?
8. **Analytics**: Do you need real-time analytics or batch processing?
9. **Webhooks**: Any webhooks needed for frontend real-time updates?
10. **Migration**: How to migrate existing local playlists to backend?

---

## 12. Frontend Data Structure Reference

### AudioTrack Interface (from `useGlobalAudioPlayerStore.tsx`)
```typescript
interface AudioTrack {
  id: string;
  title: string;
  artist: string;
  audioUrl: string | any; // URL string or require() object
  thumbnailUrl: string | any;
  duration: number; // in seconds
  category?: string;
  description?: string;
}
```

### PlaylistSong Interface (from `usePlaylistStore.tsx`)
```typescript
interface PlaylistSong {
  id: string;
  title: string;
  artist: string;
  audioUrl: string | any;
  thumbnailUrl: string | any;
  duration: number;
  category?: string;
  description?: string;
  addedAt: string; // ISO timestamp
}
```

### Playlist Interface
```typescript
interface Playlist {
  id: string;
  name: string;
  description?: string;
  songs: PlaylistSong[];
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string | any;
}
```

**Note**: Frontend expects `audioUrl` and `thumbnailUrl` to be either:
- String URLs (from API)
- `require()` objects (local files - for backward compatibility)

Backend should always return string URLs.

---

## Conclusion

This specification provides a complete backend implementation guide that aligns with the existing frontend UI. The system should function like YouTube's Audio Library, providing a seamless experience for users to discover, organize, and play copyright-free music.

**Key Points**:
- ✅ Separate REST endpoints for copyright-free songs (not mixed with general media)
- ✅ Full playlist management with backend sync
- ✅ Comprehensive playback tracking
- ✅ User interactions (like, save, library)
- ✅ Search and filtering capabilities
- ✅ Resume playback functionality

The frontend is ready to integrate once these endpoints are available. All data structures match the current frontend implementation.

