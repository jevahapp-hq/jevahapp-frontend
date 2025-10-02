### Dynamic Profile Tabs API

Purpose: Enable a fully dynamic Profile screen with tabs for user Photos (camera/gallery), Posts, Videos, and Audios. Backend controls tab availability and ordering; frontend renders from data.

Base: `/api`

Auth: All endpoints require `Authorization: Bearer <token>` unless noted.

---

### 1) Surface: Profile Tabs Descriptor

- GET `/user/tabs`
  - Returns the available tabs and counts for the signed-in user (or specified user via `?userId=` if viewing another profile).
  - Query: `userId?` (optional; defaults to current user)
  - Response:
    ```json
    {
      "success": true,
      "user": {
        "id": "u_123",
        "displayName": "Ada Lovelace",
        "avatarUrl": "https://..."
      },
      "tabs": [
        { "key": "photos", "label": "Photos", "count": 124 },
        { "key": "posts", "label": "Posts", "count": 32 },
        { "key": "videos", "label": "Videos", "count": 18 },
        { "key": "audios", "label": "Audios", "count": 12 }
      ]
    }
    ```

Notes:

- `tabs` order is the rendering order.
- Omit a tab if not applicable (e.g., no uploads, restricted permissions).

---

### 2) Content Listing by Tab (Paginated)

Common query params: `userId?`, `page=1`, `limit=20`, `sort?` (e.g., `recent|popular`).

- GET `/user/photos`

  - Returns camera/gallery images the user uploaded.
  - Each item:
    ```json
    {
      "id": "ph_1",
      "type": "photo",
      "url": "https://.../image.jpg",
      "thumbnailUrl": "https://.../thumb.jpg",
      "createdAt": "2025-10-01T00:00:00Z",
      "likes": 12,
      "comments": 3
    }
    ```

- GET `/user/posts`

  - Returns text/image posts.
  - Each item:
    ```json
    {
      "id": "po_1",
      "type": "post",
      "title": "Sunday reflections",
      "body": "...",
      "imageUrl": "https://...",
      "createdAt": "...",
      "likes": 5,
      "comments": 1
    }
    ```

- GET `/user/videos`

  - Returns user videos.
  - Each item:
    ```json
    {
      "id": "vi_1",
      "type": "video",
      "title": "Worship Set",
      "fileUrl": "https://.../video.mp4",
      "thumbnailUrl": "https://.../video.jpg",
      "durationSec": 210,
      "createdAt": "...",
      "views": 1020,
      "likes": 88,
      "comments": 14
    }
    ```

- GET `/user/audios`
  - Returns user audios.
  - Each item:
    ```json
    {
      "id": "au_1",
      "type": "audio",
      "title": "Morning Devotional",
      "fileUrl": "https://.../audio.mp3",
      "durationSec": 600,
      "createdAt": "...",
      "plays": 504,
      "likes": 31,
      "comments": 6
    }
    ```

Paginated response shape:

```json
{
  "success": true,
  "items": [
    /* array of items for that tab */
  ],
  "page": 1,
  "pageSize": 20,
  "total": 132
}
```

---

### 3) Single Item Fetch (Optional)

- GET `/user/content/:id`
  - Returns a single content item (photo/post/video/audio) regardless of tab.
  - Response: `{ success, item }` where `item` matches the shapes above and includes any extra metadata needed (e.g., `description`, `tags`, `exif` for photos, etc.).

---

### 4) Interactions (Optional but Recommended)

- POST `/user/content/:id/like` and DELETE `/user/content/:id/like`
- POST `/user/content/:id/save` and DELETE `/user/content/:id/save`
- GET `/user/content/:id/comments?page&limit`
- POST `/user/content/:id/comments` `{ text }`

Response for mutations:

```json
{ "success": true, "counts": { "likes": 99, "comments": 12 } }
```

---

### 5) Upload (Future)

- POST `/user/upload/photo|video|audio|post` (multipart/form-data for media)
  - Returns `{ success, item }` with the newly created item matching the shapes above.

---

### 6) Performance & Caching

- Support `etag`/`lastModified` on listing endpoints for client caching.
- Include lightweight `items` in the tabs surface (optional) as a `preview` field to avoid an extra round trip, e.g.:
  ```json
  {
    "key": "photos",
    "label": "Photos",
    "count": 124,
    "preview": [{ "id": "ph_1", "thumbnailUrl": "https://..." }]
  }
  ```
- Prefer CDNs for media URLs; return `thumbnailUrl` for videos/images for fast grid rendering.

---

### 7) Errors

Error shape:

```json
{ "success": false, "message": "...", "code": "OPTIONAL_CODE" }
```

Use relevant HTTP codes (400/401/403/404/429/500).

---

### 8) Example

GET `/user/tabs`:

```json
{
  "success": true,
  "user": {
    "id": "u_123",
    "displayName": "Ada Lovelace",
    "avatarUrl": "https://.../u_123.jpg"
  },
  "tabs": [
    { "key": "photos", "label": "Photos", "count": 124 },
    { "key": "posts", "label": "Posts", "count": 32 },
    { "key": "videos", "label": "Videos", "count": 18 },
    { "key": "audios", "label": "Audios", "count": 12 }
  ]
}
```

GET `/user/videos?page=1&limit=20`:

```json
{
  "success": true,
  "items": [
    {
      "id": "vi_1",
      "type": "video",
      "title": "Worship Set",
      "fileUrl": "https://cdn/vi_1.mp4",
      "thumbnailUrl": "https://cdn/vi_1.jpg",
      "durationSec": 210,
      "createdAt": "2025-09-20T10:00:00Z",
      "views": 1020,
      "likes": 88,
      "comments": 14
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 18
}
```

With these endpoints, the frontend can render profile tabs dynamically and fetch content per tab efficiently.
