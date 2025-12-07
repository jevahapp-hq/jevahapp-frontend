# Copyright-Free Music Interactions - Backend Integration Guide

## 📋 Overview

This document provides a complete guide for wiring backend interactions (likes, views, saves) for copyright-free music. It covers the frontend implementation, expected backend endpoints, data flow, state management, and integration logic.

**Last Updated**: 2024-12-19  
**Status**: ✅ Frontend Ready - Backend Integration Required

---

## 🎯 Core Interactions

The copyright-free music system supports three main user interactions:

1. **Like/Unlike** - Users can like or unlike songs
2. **View Tracking** - Track when users view/listen to songs
3. **Save/Bookmark** - Users can save songs to their library

---

## 📱 Frontend Implementation

### Component: CopyrightFreeSongModal

**File**: `app/components/CopyrightFreeSongModal.tsx`

**Current State Management**:
```typescript
// Like and Views state
const [isLiked, setIsLiked] = useState(song?.isLiked || false);
const [likeCount, setLikeCount] = useState(song?.likeCount || song?.likes || 0);
const [viewCount, setViewCount] = useState(song?.viewCount || song?.views || 0);
const [isTogglingLike, setIsTogglingLike] = useState(false);
```

**UI Components**:
- **Like Button**: Heart icon (filled when liked, outline when not) with count
- **Views Display**: Eye icon with view count (read-only)

**Location**: Below song title/artist, above playback controls

---

## 🔌 Backend API Endpoints Required

### 1. Toggle Like/Unlike

**Endpoint**: `POST /api/audio/copyright-free/{songId}/like`

**Method**: `POST`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:
- `songId` (string, required): The ID of the copyright-free song

**Request Body**: None (empty body)

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likeCount": 125,
    "viewCount": 1250,
    "listenCount": 890
  }
}
```

**Response Fields**:
- `liked` (boolean, **REQUIRED**): Whether the user has liked the song after this action
- `likeCount` (number, **REQUIRED**): Total number of likes for this song
- `viewCount` (number, **REQUIRED**): Total number of views for this song
- `listenCount` (number, optional): Total number of listens/plays

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Song not found
- `500 Internal Server Error`: Server error

**Logic**:
- If user hasn't liked the song → Add like, increment count
- If user has already liked the song → Remove like, decrement count
- Return updated state in response

---

### 2. Record View

**Endpoint**: `POST /api/audio/copyright-free/{songId}/view`

**Method**: `POST`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:
- `songId` (string, required): The ID of the copyright-free song

**Request Body**:
```json
{
  "durationMs": 45000,
  "progressPct": 30,
  "isComplete": false
}
```

**Request Fields** (all optional):
- `durationMs` (number): Viewing/listening duration in milliseconds
- `progressPct` (number): Viewing progress percentage (0-100)
- `isComplete` (boolean): Whether the song was played to completion

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "viewCount": 1251,
    "hasViewed": true
  }
}
```

**Response Fields**:
- `viewCount` (number, **REQUIRED**): Total view count for this song
- `hasViewed` (boolean, **REQUIRED**): Whether the authenticated user has viewed this song

**Status Codes**:
- `200 OK`: Success (view recorded or already recorded)
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Song not found
- `500 Internal Server Error`: Server error

**Logic**:
- **One view per user per song**: If user already viewed, don't increment count but return current count
- **Deduplication**: Backend should prevent duplicate view counting
- **Increment viewCount**: Only if this is the user's first view
- **Track engagement**: Store durationMs, progressPct, isComplete for analytics

---

### 3. Toggle Save/Bookmark

**Endpoint**: `POST /api/audio/copyright-free/{songId}/save`

**Method**: `POST`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:
- `songId` (string, required): The ID of the copyright-free song

**Request Body**: None (empty body)

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "bookmarked": true,
    "bookmarkCount": 45
  }
}
```

**Response Fields**:
- `bookmarked` (boolean, **REQUIRED**): Whether the user has saved/bookmarked the song
- `bookmarkCount` (number, **REQUIRED**): Total number of bookmarks for this song

**Status Codes**:
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Song not found
- `500 Internal Server Error`: Server error

**Logic**:
- If user hasn't saved → Add bookmark, increment count
- If user has already saved → Remove bookmark, decrement count
- Return updated state in response

---

### 4. Get Song Details (with interaction state)

**Endpoint**: `GET /api/audio/copyright-free/{songId}`

**Method**: `GET`

**Headers**:
```
Authorization: Bearer {token}  (optional - for user-specific data)
Content-Type: application/json
```

**Path Parameters**:
- `songId` (string, required): The ID of the copyright-free song

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "song-in-the-name-of-jesus",
    "id": "song-in-the-name-of-jesus",
    "title": "In The Name of Jesus",
    "artist": "Tadashikeiji",
    "year": 2024,
    "fileUrl": "https://cdn.jevahapp.com/audio/in-the-name-of-jesus.mp3",
    "thumbnailUrl": "https://cdn.jevahapp.com/images/jesus.webp",
    "category": "Gospel Music",
    "duration": 180,
    "contentType": "copyright-free-music",
    "description": "A powerful gospel song...",
    "speaker": "Tadashikeoji",
    "uploadedBy": "system",
    "createdAt": "2024-01-15T10:00:00Z",
    "viewCount": 1250,
    "views": 1250,
    "likeCount": 89,
    "likes": 89,
    "isLiked": false,
    "isInLibrary": false,
    "isPublicDomain": true
  }
}
```

**Response Fields** (interaction-related):
- `viewCount` OR `views` (number, **REQUIRED**): Total view count
- `likeCount` OR `likes` (number, **REQUIRED**): Total like count
- `isLiked` (boolean, **REQUIRED if authenticated**): Whether authenticated user has liked
- `isInLibrary` (boolean, **REQUIRED if authenticated**): Whether authenticated user has saved

**Note**: Backend should return both `viewCount` and `views` (and `likeCount` and `likes`) for backward compatibility. Frontend handles both formats.

---

### 5. Get All Songs (with interaction state)

**Endpoint**: `GET /api/audio/copyright-free`

**Method**: `GET`

**Headers**:
```
Authorization: Bearer {token}  (optional - for user-specific data)
Content-Type: application/json
```

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 20)
- `category` (string, optional): Filter by category
- `search` (string, optional): Search query
- `sortBy` (string, optional): Sort order (`popular`, `newest`, `oldest`, `title`)

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "songs": [
      {
        "_id": "song-in-the-name-of-jesus",
        "id": "song-in-the-name-of-jesus",
        "title": "In The Name of Jesus",
        "artist": "Tadashikeiji",
        "viewCount": 1250,
        "views": 1250,
        "likeCount": 89,
        "likes": 89,
        "isLiked": false,
        "isInLibrary": false,
        // ... other fields
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

**Response Fields** (per song):
- Each song should include `viewCount`/`views`, `likeCount`/`likes`, `isLiked`, `isInLibrary` (if authenticated)

---

## 🔄 Data Flow & Logic

### Like Toggle Flow

```
1. User clicks like button
   ↓
2. Frontend: Optimistic update
   - setIsLiked(!isLiked)
   - setLikeCount(isLiked ? likeCount - 1 : likeCount + 1)
   ↓
3. Frontend: Call API
   POST /api/audio/copyright-free/{songId}/like
   ↓
4. Backend: Process request
   - Check if user already liked
   - If not liked → Add like, increment count
   - If already liked → Remove like, decrement count
   - Return updated state
   ↓
5. Frontend: Update from response
   - setIsLiked(response.data.liked)
   - setLikeCount(response.data.likeCount)
   - setViewCount(response.data.viewCount) // Also updates view count
   ↓
6. If error → Revert optimistic update
```

### View Tracking Flow

```
1. User opens song modal OR plays song
   ↓
2. Frontend: Check if view already tracked
   - Use hasTrackedView flag (local state)
   ↓
3. If not tracked:
   - Wait for engagement threshold:
     * 3 seconds of playback, OR
     * 25% progress, OR
     * Completion
   ↓
4. Frontend: Call API
   POST /api/audio/copyright-free/{songId}/view
   Body: { durationMs, progressPct, isComplete }
   ↓
5. Backend: Process request
   - Check if user already viewed this song
   - If not viewed → Increment viewCount, mark as viewed
   - If already viewed → Return current count (don't increment)
   - Store engagement data (durationMs, progressPct, isComplete)
   ↓
6. Frontend: Update view count
   - setViewCount(response.data.viewCount)
   - Set hasTrackedView = true
```

### Save/Bookmark Flow

```
1. User clicks save/bookmark button
   ↓
2. Frontend: Optimistic update
   - setIsInLibrary(!isInLibrary)
   ↓
3. Frontend: Call API
   POST /api/audio/copyright-free/{songId}/save
   ↓
4. Backend: Process request
   - Check if user already saved
   - If not saved → Add bookmark, increment count
   - If already saved → Remove bookmark, decrement count
   - Return updated state
   ↓
5. Frontend: Update from response
   - setIsInLibrary(response.data.bookmarked)
```

---

## 📊 State Management

### Frontend State Structure

```typescript
// In CopyrightFreeSongModal component
interface SongInteractionState {
  isLiked: boolean;           // User's like status
  likeCount: number;          // Total likes
  viewCount: number;          // Total views
  isInLibrary: boolean;       // User's save status
  bookmarkCount: number;       // Total bookmarks
  hasTrackedView: boolean;    // Whether view was already tracked
  isTogglingLike: boolean;    // Loading state for like toggle
  isSaving: boolean;          // Loading state for save toggle
}
```

### Initial State from Song Data

```typescript
// When song prop changes
useEffect(() => {
  if (song) {
    setIsLiked(song.isLiked || false);
    setLikeCount(song.likeCount || song.likes || 0);
    setViewCount(song.viewCount || song.views || 0);
    // ... other fields
  }
}, [song]);
```

### State Updates from API Responses

```typescript
// After like toggle
const result = await copyrightFreeMusicAPI.toggleLike(songId);
if (result.success && result.data) {
  setIsLiked(result.data.liked);
  setLikeCount(result.data.likeCount);
  setViewCount(result.data.viewCount); // Also updates view count
}

// After view tracking
const result = await copyrightFreeMusicAPI.recordView(songId, {
  durationMs,
  progressPct,
  isComplete
});
if (result.success && result.data) {
  setViewCount(result.data.viewCount);
  setHasTrackedView(true);
}
```

---

## 🎨 UI Integration

### Like Button Component

**Location**: `app/components/CopyrightFreeSongModal.tsx` (lines ~545-580)

**Implementation**:
```typescript
<TouchableOpacity
  onPress={handleToggleLike}
  disabled={isTogglingLike}
  style={{
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
    backgroundColor: isLiked 
      ? UI_CONFIG.COLORS.ERROR + "15" 
      : UI_CONFIG.COLORS.SURFACE,
  }}
>
  <Ionicons
    name={isLiked ? "heart" : "heart-outline"}
    size={20}
    color={isLiked ? UI_CONFIG.COLORS.ERROR : UI_CONFIG.COLORS.TEXT_SECONDARY}
  />
  <Text>
    {likeCount > 0 ? likeCount.toLocaleString() : "0"}
  </Text>
</TouchableOpacity>
```

**Features**:
- Visual feedback: Red background when liked
- Icon changes: Filled heart when liked, outline when not
- Count display: Shows formatted number
- Loading state: Disabled during API call
- Optimistic update: Immediate UI feedback

### Views Display Component

**Location**: `app/components/CopyrightFreeSongModal.tsx` (lines ~582-600)

**Implementation**:
```typescript
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: UI_CONFIG.SPACING.MD,
    paddingVertical: UI_CONFIG.SPACING.SM,
    borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
  }}
>
  <Ionicons
    name="eye-outline"
    size={20}
    color={UI_CONFIG.COLORS.TEXT_SECONDARY}
  />
  <Text>
    {viewCount > 0 ? viewCount.toLocaleString() : "0"}
  </Text>
</View>
```

**Features**:
- Read-only display: No interaction
- Eye icon: Indicates views
- Count display: Shows formatted number
- Updates automatically: When view is tracked

---

## 🔧 API Service Implementation

### CopyrightFreeMusicAPI Service

**File**: `app/services/copyrightFreeMusicAPI.ts`

**Current Methods**:

#### 1. toggleLike()
```typescript
async toggleLike(songId: string): Promise<{
  success: boolean;
  data: {
    liked: boolean;
    likeCount: number;
    viewCount: number;
    listenCount: number;
  };
}>
```

**Implementation**:
- Endpoint: `POST /api/audio/copyright-free/{songId}/like`
- Requires authentication
- Returns updated like state and counts

#### 2. toggleSave()
```typescript
async toggleSave(songId: string): Promise<{
  success: boolean;
  data: {
    bookmarked: boolean;
    bookmarkCount: number;
  };
}>
```

**Implementation**:
- Endpoint: `POST /api/audio/copyright-free/{songId}/save`
- Requires authentication
- Returns updated bookmark state and count

#### 3. recordView() (TO BE IMPLEMENTED)

**Required Implementation**:
```typescript
async recordView(
  songId: string,
  payload?: {
    durationMs?: number;
    progressPct?: number;
    isComplete?: boolean;
  }
): Promise<{
  success: boolean;
  data: {
    viewCount: number;
    hasViewed: boolean;
  };
}> {
  try {
    const token = await TokenUtils.getAuthToken();
    if (!token) {
      throw new Error("Authentication required");
    }

    const response = await fetch(`${this.baseUrl}/${songId}/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload || {}),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error recording view for song ${songId}:`, error);
    throw error;
  }
}
```

---

## ⚠️ Error Handling

### Like Toggle Errors

```typescript
try {
  // Optimistic update
  setIsLiked(!isLiked);
  setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

  // API call
  const result = await copyrightFreeMusicAPI.toggleLike(songId);

  if (result.success && result.data) {
    // Update from response
    setIsLiked(result.data.liked);
    setLikeCount(result.data.likeCount);
  } else {
    // Revert optimistic update
    setIsLiked(isLiked);
    setLikeCount(likeCount);
    Alert.alert("Error", "Failed to update like");
  }
} catch (error) {
  // Revert optimistic update
  setIsLiked(isLiked);
  setLikeCount(likeCount);
  Alert.alert("Error", "Failed to update like");
}
```

### View Tracking Errors

```typescript
try {
  const result = await copyrightFreeMusicAPI.recordView(songId, {
    durationMs,
    progressPct,
    isComplete
  });

  if (result.success && result.data) {
    setViewCount(result.data.viewCount);
    setHasTrackedView(true);
  } else {
    console.warn("Failed to record view:", result.error);
    // Don't show error to user - view tracking is non-critical
  }
} catch (error) {
  console.error("Error recording view:", error);
  // Don't show error to user - view tracking is non-critical
}
```

**Note**: View tracking errors should be silent (logged but not shown to user) since it's a background operation.

---

## 📝 Backend Requirements Summary

### Required Endpoints

1. ✅ `POST /api/audio/copyright-free/{songId}/like` - Toggle like
2. ⚠️ `POST /api/audio/copyright-free/{songId}/view` - Record view (TO BE IMPLEMENTED)
3. ✅ `POST /api/audio/copyright-free/{songId}/save` - Toggle save
4. ✅ `GET /api/audio/copyright-free/{songId}` - Get song with interaction state
5. ✅ `GET /api/audio/copyright-free` - Get all songs with interaction state

### Required Response Fields

**For Like Toggle**:
- `liked` (boolean)
- `likeCount` (number)
- `viewCount` (number) - Also return updated view count
- `listenCount` (number, optional)

**For View Tracking**:
- `viewCount` (number)
- `hasViewed` (boolean)

**For Save Toggle**:
- `bookmarked` (boolean)
- `bookmarkCount` (number)

**For Song Data**:
- `viewCount` OR `views` (number) - Support both for compatibility
- `likeCount` OR `likes` (number) - Support both for compatibility
- `isLiked` (boolean, if authenticated)
- `isInLibrary` (boolean, if authenticated)

### Backend Logic Requirements

#### Like Toggle Logic
```
IF user has NOT liked song:
  → Add like record
  → Increment likeCount
  → Return { liked: true, likeCount: newCount }
ELSE:
  → Remove like record
  → Decrement likeCount
  → Return { liked: false, likeCount: newCount }
```

#### View Tracking Logic
```
IF user has NOT viewed song:
  → Add view record
  → Increment viewCount
  → Store engagement data (durationMs, progressPct, isComplete)
  → Return { viewCount: newCount, hasViewed: true }
ELSE:
  → Return current count (don't increment)
  → Return { viewCount: currentCount, hasViewed: true }
```

#### Save Toggle Logic
```
IF user has NOT saved song:
  → Add bookmark record
  → Increment bookmarkCount
  → Return { bookmarked: true, bookmarkCount: newCount }
ELSE:
  → Remove bookmark record
  → Decrement bookmarkCount
  → Return { bookmarked: false, bookmarkCount: newCount }
```

---

## 🔍 Testing Checklist

### Like Toggle Testing

- [ ] Like button toggles correctly
- [ ] Like count increments/decrements correctly
- [ ] Optimistic update works
- [ ] Error handling reverts optimistic update
- [ ] Loading state prevents multiple clicks
- [ ] Unauthenticated users see appropriate error

### View Tracking Testing

- [ ] View is recorded after 3 seconds of playback
- [ ] View is recorded at 25% progress
- [ ] View is recorded on completion
- [ ] View count increments only once per user
- [ ] View tracking doesn't block UI
- [ ] Errors are handled silently

### Save Toggle Testing

- [ ] Save button toggles correctly
- [ ] Bookmark count increments/decrements correctly
- [ ] Optimistic update works
- [ ] Error handling reverts optimistic update
- [ ] Loading state prevents multiple clicks

### Integration Testing

- [ ] Song data includes interaction state
- [ ] Like/view counts persist across sessions
- [ ] Multiple users can like same song
- [ ] View counts are accurate
- [ ] API responses match expected format

---

## 🚀 Implementation Steps

### Step 1: Backend Endpoints

1. Implement `POST /api/audio/copyright-free/{songId}/like`
2. Implement `POST /api/audio/copyright-free/{songId}/view`
3. Implement `POST /api/audio/copyright-free/{songId}/save`
4. Update `GET /api/audio/copyright-free/{songId}` to include interaction state
5. Update `GET /api/audio/copyright-free` to include interaction state

### Step 2: Frontend API Service

1. ✅ `toggleLike()` - Already implemented
2. ⚠️ `recordView()` - TO BE IMPLEMENTED (see code above)
3. ✅ `toggleSave()` - Already implemented

### Step 3: Frontend Component Integration

1. ✅ Like button - Already implemented
2. ✅ Views display - Already implemented
3. ⚠️ View tracking logic - TO BE IMPLEMENTED (call `recordView()` when thresholds met)

### Step 4: Testing

1. Test all endpoints
2. Test error handling
3. Test optimistic updates
4. Test state persistence

---

## 📚 Related Documentation

- `docs/COPYRIGHT_FREE_AUDIO_PLAYLIST_SYSTEM.md` - Playlist system documentation
- `docs/BACKEND_VIEW_TRACKING_SPEC.md` - View tracking specification
- `docs/BACKEND_INTERACTION_API_SPEC.md` - General interaction API spec
- `app/services/copyrightFreeMusicAPI.ts` - API service implementation

---

## ✅ Status

- ✅ Frontend UI: Complete
- ✅ Like toggle: Frontend ready, backend endpoint exists
- ⚠️ View tracking: Frontend ready, backend endpoint TO BE IMPLEMENTED
- ✅ Save toggle: Frontend ready, backend endpoint exists
- ✅ State management: Complete
- ✅ Error handling: Complete

---

**Last Updated**: 2024-12-19  
**Next Steps**: Implement `recordView()` API method and view tracking logic in component



