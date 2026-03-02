# Reels: Show Uploader Name & Avatar

**Issue:** Reels shows "Unknown" for the person who uploaded a video, even though user data exists in the DB.

**Why only YOUR videos show author correctly:** Your profile is cached when you're logged in. Other users' names require the backend to either populate `uploadedBy` in media responses or expose `GET /api/users/:userId`.

**Frontend behavior:** The app fetches user profiles via `GET /api/users/:userId` to resolve names when the media API returns `uploadedBy` as an ID only.

---

## Option A: Populate uploadedBy in media response (RECOMMENDED)

When returning media/list content, **populate** `uploadedBy` so the frontend gets the full user object:

```json
{
  "_id": "mediaId123",
  "title": "Video Title",
  "uploadedBy": {
    "_id": "userId456",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://..."
  }
}
```

This eliminates extra API calls and makes names show immediately. Use your ORM's populate/select (e.g. Mongoose `.populate('uploadedBy', 'firstName lastName avatar')`).

---

## Option B: Ensure GET /api/users/:userId works

If media returns `uploadedBy` as ID only, the frontend fetches profiles via:

**`GET /api/users/:userId`**  
**Headers:** `Authorization: Bearer <token>`

**Expected response:**
```json
{
  "success": true,
  "user": {
    "_id": "userId456",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://...",
    "email": "optional"
  }
}
```

Alternative format: `{ "data": { "user": {...} } }` is also supported.

**Requirements:**
- Auth required (Bearer token)
- Must return at least `firstName` and/or `lastName` for display
- Public/minimal profile for content attribution (no sensitive data)

---

## Current frontend flow

1. User taps video → `enrichContentArrayBatch` fetches all uploader profiles
2. Reels receives list with `uploadedBy: { firstName, lastName, avatar }`
3. Name/avatar display correctly

If `GET /api/users/:id` returns 404 or wrong format, names stay "Unknown".
