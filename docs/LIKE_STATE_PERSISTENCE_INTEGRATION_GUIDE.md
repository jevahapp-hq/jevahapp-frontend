# Like State Persistence – Frontend Integration Guide

## Overview

This document explains how the like state persistence flow works after the backend fixes. The backend now ensures that like states are consistently stored and returned across all endpoints.

---

## Table of Contents

1. [Endpoints](#endpoints)
2. [Response Formats](#response-formats)
3. [Like Flow](#like-flow)
4. [Metadata Endpoints](#metadata-endpoints)
5. [Important Notes](#important-notes)
6. [Error Handling](#error-handling)
7. [Content Type Mapping](#content-type-mapping)

---

## Endpoints

### 1. Toggle Like

**Endpoint:** `POST /api/content/{backendContentType}/{contentId}/like`

**Headers:**
```http
Authorization: Bearer <JWT>
Content-Type: application/json
expo-platform: ios | android
```

**Path Parameters:**
- `backendContentType`: One of `media`, `devotional`, `artist`, `merch`, `ebook`, `podcast`
- `contentId`: MongoDB ObjectId (24-hex string)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Content liked successfully" | "Content unliked successfully",
  "data": {
    "contentId": "<id>",
    "liked": true | false,
    "likeCount": 42
  }
}
```

**Important:** The `data` object now includes `contentId` to help with reconciliation.

---

### 2. Single Content Metadata

**Endpoint:** `GET /api/content/{backendContentType}/{contentId}/metadata`

**Headers:**
```http
Authorization: Bearer <JWT>  // Optional, but required for user-specific flags
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "<id>",
    "likeCount": 42,
    "bookmarkCount": 10,
    "shareCount": 3,
    "viewCount": 123,
    "commentCount": 5,
    "hasLiked": true,
    "hasBookmarked": false,
    "hasShared": false,
    "hasViewed": true
  }
}
```

---

### 3. Batch Metadata

**Endpoint:** `POST /api/content/batch-metadata`

**Headers:**
```http
Authorization: Bearer <JWT>  // Optional, but required for user-specific flags
Content-Type: application/json
```

**Request Body:**
```json
{
  "contentIds": ["<id1>", "<id2>", ...],
  "contentType": "media" | "ebook" | "devotional" | "podcast" | "artist" | "merch"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "<id1>",
      "likeCount": 42,
      "commentCount": 5,
      "shareCount": 1,
      "bookmarkCount": 3,
      "viewCount": 100,
      "hasLiked": true,
      "hasBookmarked": false,
      "hasShared": false,
      "hasViewed": true
    },
    {
      "id": "<id2>",
      "likeCount": 7,
      "commentCount": 0,
      "shareCount": 0,
      "bookmarkCount": 0,
      "viewCount": 20,
      "hasLiked": false,
      "hasBookmarked": false,
      "hasShared": false,
      "hasViewed": false
    }
  ]
}
```

---

## Response Formats

### Toggle Like Response

```typescript
interface ToggleLikeResponse {
  success: boolean;
  message: string;
  data: {
    contentId: string;  // For reconciliation
    liked: boolean;    // Final state after toggle
    likeCount: number; // Updated total count
  };
}
```

### Metadata Response

Both single and batch metadata use a flat structure:

```typescript
interface ContentMetadata {
  id: string;
  likeCount: number;
  bookmarkCount: number;
  shareCount: number;
  viewCount: number;
  commentCount: number;
  hasLiked: boolean;
  hasBookmarked: boolean;
  hasShared: boolean;
  hasViewed: boolean;
}
```

---

## Like Flow

### Complete Flow Diagram

```
User Taps Like Icon
    ↓
Frontend: Optimistic Update → Call POST /like → Reconcile with backend response
    ↓
Backend: Process Toggle → Return { contentId, liked, likeCount }
    ↓
Frontend: Update store with backend data (source of truth)
```

### Frontend Requirements

1. **Optimistic update** – flip icon and count immediately
2. **Call backend** – `POST /api/content/{type}/{id}/like` with auth
3. **Reconcile** – use `result.data.liked` and `result.data.likeCount` as source of truth
4. **Rollback** – on error, revert optimistic update

---

## Metadata Endpoints

- **Initial load**: Use `GET /metadata` for content detail screens
- **List preload**: Use `POST /batch-metadata` when loading a list
- **Refresh**: After navigation or app resume

**Consistency:** After `POST /like` returns `liked: true`, the next metadata call will return `hasLiked: true`.

---

## Content Type Mapping

| Frontend Type | Backend Type |
|--------------|--------------|
| video, videos, audio, music, live | media |
| sermon, sermons | devotional |
| ebook, e-books, books, image | ebook |
| podcast | podcast |
| merch | merch |
| artist | artist |

---

## Error Handling

- **401**: Redirect to login
- **404**: Content not found
- **500**: Show error, rollback optimistic update

---

## Summary

- ✅ Use optimistic updates, reconcile with backend
- ✅ Backend is source of truth
- ✅ Batch metadata can return array or object; frontend handles both
- ✅ Support all content types including devotional
