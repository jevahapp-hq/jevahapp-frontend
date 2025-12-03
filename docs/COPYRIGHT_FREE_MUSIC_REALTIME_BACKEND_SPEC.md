# Copyright-Free Music Realtime Updates - Backend Socket.IO Implementation

**Date**: 2024-12-19  
**Status**: ✅ **Frontend Ready - Backend Implementation Required**

---

## 📋 Overview

This document specifies the **backend Socket.IO implementation** required to enable **realtime updates** for copyright-free music interactions (likes, views, saves). The frontend is already implemented and listening for these events.

---

## ✅ Frontend Implementation Status

### What's Already Done (Frontend)

✅ **Socket.IO Client Integration** in `CopyrightFreeSongModal.tsx`:
- Connects to Socket.IO server when modal opens
- Joins content room: `joinContentRoom(songId, "audio")`
- Listens for event: `"copyright-free-song-interaction-updated"`
- Updates UI in realtime when events are received
- Disconnects and leaves room when modal closes

### Frontend Event Listener

```typescript
// Frontend listens for this event:
socket.on("copyright-free-song-interaction-updated", (data) => {
  // Expected payload:
  // {
  //   songId: string,
  //   likeCount: number,
  //   viewCount: number,
  //   liked?: boolean,        // optional: per-user flag
  //   bookmarkCount?: number, // optional
  //   bookmarked?: boolean    // optional
  // }
});
```

---

## 🔌 Backend Socket.IO Implementation Required

### 1. **Socket.IO Room Management**

#### Join Content Room Handler

When frontend calls `joinContentRoom(songId, "audio")`, backend should:

```typescript
// Backend Socket.IO handler
socket.on("join-content", ({ contentId, contentType }) => {
  // Map to room key format
  const roomKey = `content:${contentType}:${contentId}`;
  // Example: "content:audio:507f1f77bcf86cd799439011"
  
  socket.join(roomKey);
  console.log(`✅ User joined room: ${roomKey}`);
});
```

**Room Key Format**: `content:{contentType}:{contentId}`

**Example**:
- Song ID: `"507f1f77bcf86cd799439011"`
- Content Type: `"audio"`
- Room Key: `"content:audio:507f1f77bcf86cd799439011"`

#### Leave Content Room Handler

```typescript
socket.on("leave-content", ({ contentId, contentType }) => {
  const roomKey = `content:${contentType}:${contentId}`;
  socket.leave(roomKey);
  console.log(`❌ User left room: ${roomKey}`);
});
```

---

### 2. **Emit Realtime Updates After Interactions**

After **each interaction** (like, view, save), backend should:

1. **Update the database** (already implemented)
2. **Fetch updated counts** from database
3. **Emit Socket.IO event** to the song's room

#### 2.1. After Like Toggle

**Location**: `POST /api/audio/copyright-free/:songId/like` controller

**After updating database and fetching fresh counts**:

```typescript
// In your copyrightFreeSong.controller.ts toggleLike() method

// After successful like toggle and fetching updated song:
const updatedSong = await songService.getSongById(songId);
const interaction = await interactionService.getInteraction(userId, songId);

// Emit realtime update to all clients viewing this song
io.to(`content:audio:${songId}`).emit("copyright-free-song-interaction-updated", {
  songId: songId,
  likeCount: updatedSong.likeCount || 0,
  viewCount: updatedSong.viewCount || 0,
  liked: interaction?.liked || false,  // Current user's like status
  listenCount: 0,  // Always 0 (model doesn't have this field)
});

// Return REST response as usual
return res.json({
  success: true,
  data: {
    liked: interaction?.liked || false,
    likeCount: updatedSong.likeCount || 0,
    viewCount: updatedSong.viewCount || 0,
    listenCount: 0,
  },
});
```

---

#### 2.2. After View Tracking

**Location**: `POST /api/audio/copyright-free/:songId/view` controller

**After incrementing view count**:

```typescript
// In your copyrightFreeSong.controller.ts recordView() method

// After marking as viewed and incrementing count:
const updatedSong = await songService.getSongById(songId);

// Emit realtime update
io.to(`content:audio:${songId}`).emit("copyright-free-song-interaction-updated", {
  songId: songId,
  viewCount: updatedSong.viewCount || 0,
  likeCount: updatedSong.likeCount || 0,  // Include for completeness
});

// Return REST response as usual
return res.json({
  success: true,
  data: {
    viewCount: updatedSong.viewCount || 0,
    hasViewed: true,
  },
});
```

---

#### 2.3. After Save/Bookmark Toggle

**Location**: `POST /api/audio/copyright-free/:songId/save` controller

**After toggling bookmark**:

```typescript
// In your copyrightFreeSong.controller.ts toggleSave() method

// After UnifiedBookmarkService.toggleBookmark() and fetching updated song:
const updatedSong = await songService.getSongById(songId);
const bookmarkResult = await UnifiedBookmarkService.getBookmarkStatus(userId, songId);

// Emit realtime update
io.to(`content:audio:${songId}`).emit("copyright-free-song-interaction-updated", {
  songId: songId,
  bookmarkCount: updatedSong.bookmarkCount || 0,
  bookmarked: bookmarkResult.isBookmarked || false,
  likeCount: updatedSong.likeCount || 0,  // Include for completeness
  viewCount: updatedSong.viewCount || 0,  // Include for completeness
});

// Return REST response as usual
return res.json({
  success: true,
  data: {
    bookmarked: bookmarkResult.isBookmarked || false,
    bookmarkCount: updatedSong.bookmarkCount || 0,
  },
});
```

---

## 📊 Event Payload Specification

### Event Name

```
"copyright-free-song-interaction-updated"
```

### Payload Structure

```typescript
interface CopyrightFreeSongRealtimeUpdate {
  songId: string;              // REQUIRED: MongoDB ObjectId of the song
  likeCount: number;           // REQUIRED: Current total like count
  viewCount: number;           // REQUIRED: Current total view count
  liked?: boolean;             // OPTIONAL: Current user's like status (if available)
  bookmarkCount?: number;      // OPTIONAL: Current total bookmark count
  bookmarked?: boolean;        // OPTIONAL: Current user's bookmark status
  listenCount?: number;        // OPTIONAL: Always 0 (model doesn't have this field)
}
```

### Example Payload

```json
{
  "songId": "507f1f77bcf86cd799439011",
  "likeCount": 126,
  "viewCount": 1251,
  "liked": true,
  "bookmarkCount": 45,
  "bookmarked": false,
  "listenCount": 0
}
```

---

## 🔧 Backend Implementation Checklist

### Socket.IO Setup

- [ ] **Socket.IO server initialized** and attached to Express app
- [ ] **CORS configured** to allow frontend origin
- [ ] **Authentication middleware** validates JWT token from socket handshake
- [ ] **Room management** handlers for `join-content` and `leave-content` events

### Event Emission Points

- [ ] **Like toggle endpoint** emits `copyright-free-song-interaction-updated` after like/unlike
- [ ] **View tracking endpoint** emits `copyright-free-song-interaction-updated` after view increment
- [ ] **Save toggle endpoint** emits `copyright-free-song-interaction-updated` after bookmark toggle

### Room Key Consistency

- [ ] **Room key format** matches: `content:audio:{songId}`
- [ ] **Content type** is `"audio"` for copyright-free songs (not `"copyright-free-music"`)
- [ ] **Song ID** is MongoDB ObjectId string (not `_id` object)

### Error Handling

- [ ] **Graceful degradation**: If Socket.IO fails, REST endpoints still work
- [ ] **No crashes**: Socket emission errors don't break REST responses
- [ ] **Logging**: Socket events are logged for debugging

---

## 🧪 Testing Guide

### Test Case 1: Like Toggle Realtime Update

1. **Open two browser tabs** (or two devices) with the same song modal
2. **Like the song** in Tab 1
3. **Expected**: Tab 2 should see `likeCount` increment **without refresh**

### Test Case 2: View Tracking Realtime Update

1. **Open song modal** in Tab 1
2. **Play song** in Tab 2 (triggers view tracking)
3. **Expected**: Tab 1 should see `viewCount` increment **without refresh**

### Test Case 3: Save Toggle Realtime Update

1. **Open song modal** in Tab 1
2. **Save the song** in Tab 2
3. **Expected**: Tab 1 should see `bookmarkCount` increment **without refresh**

### Test Case 4: Multiple Users

1. **User A** opens song modal
2. **User B** likes the song
3. **Expected**: User A sees like count increase **without refresh**

---

## 🔍 Debugging Tips

### Check Socket Connection

**Frontend logs**:
```
✅ Socket connected
📺 Joined content room: audio:507f1f77bcf86cd799439011
```

**Backend logs**:
```
✅ User joined room: content:audio:507f1f77bcf86cd799439011
```

### Check Event Emission

**Backend logs** (after like/view/save):
```
📡 Emitting copyright-free-song-interaction-updated to room: content:audio:507f1f77bcf86cd799439011
```

**Frontend logs** (when event received):
```
📡 Real-time song update received: { songId: "...", likeCount: 126, ... }
```

### Common Issues

1. **Room key mismatch**: Ensure backend uses `content:audio:{songId}` format
2. **Event name mismatch**: Must be exactly `"copyright-free-song-interaction-updated"`
3. **Socket not connected**: Check authentication token in socket handshake
4. **Room not joined**: Verify `join-content` handler is called and working

---

## 📝 Code Examples

### Complete Backend Implementation Example

```typescript
// socket.io setup (e.g., in server.ts or socket.ts)

import { Server } from "socket.io";
import { Server as HttpServer } from "http";

const httpServer = new HttpServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:8081",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }
    
    // Verify JWT token (use your existing auth logic)
    const user = await verifyToken(token);
    socket.data.userId = user.id;
    next();
  } catch (error) {
    next(new Error("Authentication failed"));
  }
});

// Room management
io.on("connection", (socket) => {
  console.log(`✅ Socket connected: ${socket.id}`);

  // Join content room
  socket.on("join-content", ({ contentId, contentType }) => {
    const roomKey = `content:${contentType}:${contentId}`;
    socket.join(roomKey);
    console.log(`📺 User ${socket.data.userId} joined room: ${roomKey}`);
  });

  // Leave content room
  socket.on("leave-content", ({ contentId, contentType }) => {
    const roomKey = `content:${contentType}:${contentId}`;
    socket.leave(roomKey);
    console.log(`📺 User ${socket.data.userId} left room: ${roomKey}`);
  });

  socket.on("disconnect", () => {
    console.log(`❌ Socket disconnected: ${socket.id}`);
  });
});

// Export io instance for use in controllers
export { io };
```

```typescript
// In copyrightFreeSong.controller.ts

import { io } from "../socket"; // or wherever you export io

export const toggleLike = async (req: Request, res: Response) => {
  try {
    const { songId } = req.params;
    const userId = req.user.id; // From auth middleware

    // Existing logic: toggle like, update database
    const { liked, likeCount, viewCount } = await interactionService.toggleLike(userId, songId);
    const updatedSong = await songService.getSongById(songId);

    // Emit realtime update
    io.to(`content:audio:${songId}`).emit("copyright-free-song-interaction-updated", {
      songId,
      likeCount: updatedSong.likeCount || 0,
      viewCount: updatedSong.viewCount || 0,
      liked,
      listenCount: 0,
    });

    // Return REST response
    return res.json({
      success: true,
      data: {
        liked,
        likeCount: updatedSong.likeCount || 0,
        viewCount: updatedSong.viewCount || 0,
        listenCount: 0,
      },
    });
  } catch (error) {
    console.error("Error toggling like:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle like",
    });
  }
};

export const recordView = async (req: Request, res: Response) => {
  try {
    const { songId } = req.params;
    const userId = req.user.id;

    // Existing logic: record view, increment count
    await interactionService.markAsViewed(userId, songId);
    await songService.incrementViewCount(songId);
    const updatedSong = await songService.getSongById(songId);

    // Emit realtime update
    io.to(`content:audio:${songId}`).emit("copyright-free-song-interaction-updated", {
      songId,
      viewCount: updatedSong.viewCount || 0,
      likeCount: updatedSong.likeCount || 0,
    });

    // Return REST response
    return res.json({
      success: true,
      data: {
        viewCount: updatedSong.viewCount || 0,
        hasViewed: true,
      },
    });
  } catch (error) {
    console.error("Error recording view:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record view",
    });
  }
};

export const toggleSave = async (req: Request, res: Response) => {
  try {
    const { songId } = req.params;
    const userId = req.user.id;

    // Existing logic: toggle bookmark
    const result = await UnifiedBookmarkService.toggleBookmark(userId, songId);
    const updatedSong = await songService.getSongById(songId);

    // Emit realtime update
    io.to(`content:audio:${songId}`).emit("copyright-free-song-interaction-updated", {
      songId,
      bookmarkCount: updatedSong.bookmarkCount || 0,
      bookmarked: result.bookmarked || false,
      likeCount: updatedSong.likeCount || 0,
      viewCount: updatedSong.viewCount || 0,
    });

    // Return REST response
    return res.json({
      success: true,
      data: {
        bookmarked: result.bookmarked || false,
        bookmarkCount: updatedSong.bookmarkCount || 0,
      },
    });
  } catch (error) {
    console.error("Error toggling save:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle save",
    });
  }
};
```

---

## ✅ Integration Status

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend Socket.IO Client | ✅ Complete | Listens for `copyright-free-song-interaction-updated` |
| Frontend Room Joining | ✅ Complete | Calls `joinContentRoom(songId, "audio")` |
| Backend Socket.IO Server | ⚠️ **TODO** | Needs initialization and room handlers |
| Backend Event Emission | ⚠️ **TODO** | Emit after like/view/save operations |
| Backend Room Management | ⚠️ **TODO** | Handle `join-content` and `leave-content` events |

---

## 🚀 Next Steps for Backend

1. ✅ **Initialize Socket.IO server** (if not already done)
2. ✅ **Add room management handlers** (`join-content`, `leave-content`)
3. ✅ **Emit events** in like/view/save controllers
4. ✅ **Test with multiple clients** to verify realtime updates
5. ✅ **Add error handling** and logging

---

## 📚 Related Files

### Frontend Files (Already Implemented)

- `app/components/CopyrightFreeSongModal.tsx` - Socket.IO client integration
- `app/services/SocketManager.ts` - Socket.IO manager utility
- `app/services/copyrightFreeMusicAPI.ts` - REST API calls

### Backend Files (Need Implementation)

- `src/controllers/copyrightFreeSong.controller.ts` - Add Socket.IO emissions
- `src/routes/audio.route.ts` - Routes (already exist)
- `src/socket.ts` or `src/socket.io.ts` - Socket.IO server setup (create if needed)

---

**Last Updated**: 2024-12-19  
**Frontend Status**: ✅ **Complete**  
**Backend Status**: ⚠️ **Implementation Required**

