# Copyright-Free Music Data Format

## Current Frontend Format (Hardcoded)

The copyright-free music is currently hardcoded in the frontend with the following structure:

### TypeScript Interface

```typescript
interface CopyrightFreeSong {
  id: string;                    // Unique identifier (e.g., "song-in-the-name-of-jesus")
  title: string;                 // Song title (e.g., "In The Name of Jesus")
  artist: string;                // Artist name (e.g., "Tadashikeiji")
  year: number;                  // Release year (e.g., 2024)
  audioUrl: string | any;        // Audio file URL or require() object for local files
  thumbnailUrl: string | any;    // Thumbnail image URL or require() object
  category: string;              // Category (e.g., "Gospel Music", "Traditional Gospel")
  duration: number;              // Duration in seconds (e.g., 180)
  contentType: "copyright-free-music"; // Fixed content type
  description: string;           // Song description
  speaker: string;               // Speaker/performer name
  uploadedBy: string;            // Uploader (e.g., "Jevah App")
  createdAt: string;             // ISO timestamp
  views: number;                 // View count
  likes: number;                 // Like count
  isLiked: boolean;              // User's like status
  isInLibrary: boolean;          // User's library status
  isPublicDomain: boolean;        // Public domain flag
}
```

### Example Hardcoded Song (from CopyrightFreeSongs.tsx)

```typescript
{
  id: "song-in-the-name-of-jesus",
  title: "In The Name of Jesus",
  artist: "Tadashikeiji",
  year: 2024,
  audioUrl: require("../../assets/audio/in-the-name-of-jesus-Tadashikeiji.mp3"), // Local file
  thumbnailUrl: require("../../assets/images/Jesus.webp"), // Local file
  category: "Gospel Music",
  duration: 180, // seconds
  contentType: "copyright-free-music",
  description: "A powerful gospel song praising the name of Jesus Christ.",
  speaker: "Tadashikeiji",
  uploadedBy: "Jevah App",
  createdAt: new Date().toISOString(),
  views: 1250,
  likes: 89,
  isLiked: false,
  isInLibrary: false,
  isPublicDomain: true,
}
```

### Current Implementation Locations

1. **Hardcoded Songs**: `app/components/CopyrightFreeSongs.tsx` (lines 59-161)
   - Uses `require()` for local audio/image files
   - 5 hardcoded songs

2. **Service Class**: `app/services/copyrightFreeSongs.ts`
   - Also has hardcoded songs (different set)
   - Provides utility methods

### Issues with Current Implementation

1. ❌ **Hardcoded Data**: Songs are embedded in code
2. ❌ **Local Files**: Uses `require()` for assets (not scalable)
3. ❌ **No Backend Integration**: Can't update songs without app update
4. ❌ **No Real-time Stats**: Views/likes are static
5. ❌ **No User Personalization**: Can't track user-specific data (isLiked, isInLibrary)

---

## Backend API Format (Expected)

### API Response Format

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
        "duration": 180,
        "contentType": "copyright-free-music",
        "description": "A powerful gospel song praising the name of Jesus Christ.",
        "speaker": "Tadashikeiji",
        "uploadedBy": "system",
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z",
        "views": 1250,
        "likes": 89,
        "isLiked": false,
        "isInLibrary": false,
        "isPublicDomain": true,
        "tags": ["gospel", "worship", "jesus"],
        "fileSize": 4320000,
        "bitrate": 192,
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

### Key Differences

| Frontend (Current) | Backend (Expected) |
|-------------------|-------------------|
| `require("../../assets/audio/...")` | `"https://cdn.jevahapp.com/audio/..."` |
| Hardcoded in component | Fetched from API |
| Static data | Dynamic, updatable |
| No pagination | Paginated results |
| No search/filter | Search and filter support |
| No user context | User-specific data (isLiked, isInLibrary) |

---

## Migration Plan

### Step 1: Create API Service
- Create `app/services/copyrightFreeMusicAPI.ts`
- Implement methods to fetch from backend
- Handle errors gracefully with fallback

### Step 2: Update Components
- Replace hardcoded songs with API calls
- Add loading states
- Add error handling
- Support pagination

### Step 3: Handle URL Conversion
- Backend returns string URLs
- Frontend needs to handle both:
  - String URLs (from API) - use directly
  - require() objects (local fallback) - for backward compatibility

### Step 4: User Context
- Pass authentication token
- Get user-specific data (isLiked, isInLibrary)
- Update interactions in real-time

---

## Frontend Data Transformation

When receiving data from backend, transform to match frontend format:

```typescript
// Backend response
const backendSong = {
  id: "song-123",
  audioUrl: "https://cdn.jevahapp.com/audio/song.mp3",
  thumbnailUrl: "https://cdn.jevahapp.com/images/thumb.jpg",
  // ... other fields
};

// Frontend format (for useGlobalAudioPlayerStore)
const frontendSong = {
  id: backendSong.id,
  title: backendSong.title,
  artist: backendSong.artist,
  audioUrl: backendSong.audioUrl, // String URL - works directly
  thumbnailUrl: backendSong.thumbnailUrl, // String URL - works directly
  duration: backendSong.duration,
  category: backendSong.category,
  description: backendSong.description,
};
```

---

## Backend Endpoint Reference

See `docs/BACKEND_AUDIO_LIBRARY_IMPLEMENTATION.md` for complete API specification:

- `GET /api/audio/copyright-free` - Get all songs
- `GET /api/audio/copyright-free/:songId` - Get single song
- `GET /api/audio/copyright-free/search` - Search songs
- `GET /api/audio/copyright-free/categories` - Get categories
- `POST /api/audio/copyright-free/:songId/like` - Like song
- `POST /api/audio/copyright-free/:songId/save` - Save to library

