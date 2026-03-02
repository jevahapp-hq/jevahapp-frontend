# Backend JSON Expectations: Author Name & Avatar

**Purpose:** This doc tells the backend team exactly what JSON structures the frontend expects for author/uploader display (Reels, feed cards, comments). Use it to verify your API responses.

---

## Summary

| Where | Issue | Frontend Fix |
|-------|-------|--------------|
| **Media list** (`/api/media/*`) | `uploadedBy` as ID only | Frontend calls `GET /api/users/:id` to resolve names |
| **GET /api/users/:id** | 404 or wrong format | Author shows "Unknown" for everyone except current user |
| **Media list** (recommended) | Populate `uploadedBy` in media response | No extra calls, names show immediately |

---

## 1. Media / Content APIs

**Endpoints used:**
- `GET /api/media/public/all-content` (public)
- `GET /api/media/all-content` (authenticated)

**Expected response shape (one of):**
```json
{
  "media": [...],
  "total": 100,
  "pagination": { "page": 1, "limit": 50, "total": 100 }
}
```
or
```json
{
  "data": {
    "media": [...],
    "total": 100
  }
}
```

### Per media item – `uploadedBy` (author/uploader)

**Option A: Populated object (recommended – no extra API calls)**  
Frontend displays name and avatar immediately.

```json
{
  "_id": "media123",
  "title": "Video Title",
  "fileUrl": "https://...",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "uploadedBy": {
    "_id": "user456",
    "id": "user456",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://cdn.example.com/avatars/user456.jpg"
  }
}
```

**Field names the frontend understands:**

| Field | Supported names (checked in order) |
|-------|-----------------------------------|
| ID | `_id`, `id` |
| First name | `firstName`, `first_name` |
| Last name | `lastName`, `last_name` |
| Full name (fallback) | `name` (split into first/last if needed) |
| Avatar | `avatar`, `avatarUpload`, `avatarUrl`, `imageUrl`, `profileImage`, `profilePicture` |

**Option B: ID only (requires `GET /api/users/:id`)**  
Frontend will call `GET /api/users/:userId` to fetch the profile.

```json
{
  "_id": "media123",
  "title": "Video Title",
  "uploadedBy": "674a1b2c3d4e5f6789012345"
}
```

If that endpoint returns 404 or wrong format → author shows **"Unknown"**.

---

## 2. GET /api/users/:userId

**When used:** When media returns `uploadedBy` as an ID (string) only.

**Request:**
```
GET {API_BASE_URL}/api/users/{userId}
Headers: Authorization: Bearer <JWT>
```

Example: `GET https://api.jevahapp.com/api/users/674a1b2c3d4e5f6789012345`

**Expected response (Option 1):**
```json
{
  "success": true,
  "user": {
    "_id": "674a1b2c3d4e5f6789012345",
    "id": "674a1b2c3d4e5f6789012345",
    "firstName": "John",
    "lastName": "Doe",
    "avatar": "https://cdn.example.com/avatars/xxx.jpg",
    "email": "john@example.com"
  }
}
```

**Alternative format (Option 2):**
```json
{
  "data": {
    "user": {
      "_id": "674a1b2c3d4e5f6789012345",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://..."
    }
  }
}
```

**How the frontend chooses the user object:**
```javascript
user = data.success && data.user ? data.user : data.data?.user;
```

**Field mapping (camelCase or snake_case):**

| Display purpose | Accepted fields |
|-----------------|-----------------|
| Name | `firstName` + `lastName`, or `first_name` + `last_name`, or `name` (split on space) |
| Avatar | `avatar`, `avatarUpload`, `profileImage` |

**Minimal required for name display:**
- At least one of: `firstName`, `lastName`, `name`

**Auth:** Bearer token required. Returns public/minimal profile (no sensitive data needed).

---

## 3. Other author-related fields (optional)

The frontend also checks these on content items if `uploadedBy` is missing or empty:

| Field | Purpose |
|-------|---------|
| `author` | Devotional/ebook content; same shape as `uploadedBy` |
| `authorInfo` | Alternative author object; same shape |
| `speaker` | Legacy string for audio/sermons; can be a name or ID |

---

## 4. Quick diagnostic checklist

For the backend team to verify:

- [ ] **Media APIs:** Do media items have `uploadedBy` populated with `firstName`, `lastName`, `avatar`?
- [ ] **If ID-only:** Does `GET /api/users/:userId` exist and return 200?
- [ ] **Response shape:** Is it `{ success: true, user: {...} }` or `{ data: { user: {...} } }`?
- [ ] **Name fields:** Are `firstName`/`lastName` (or `first_name`/`last_name` or `name`) present?
- [ ] **Avatar:** Is it a full URL (e.g. `https://...`) if provided?

---

## 5. Mongoose populate example

If using Mongoose, populate `uploadedBy` when fetching media:

```javascript
Media.find()
  .populate('uploadedBy', 'firstName lastName avatar')
  .exec();
```

Or with `select`:
```javascript
.populate({
  path: 'uploadedBy',
  select: 'firstName lastName avatar'
})
```

---

## 6. Test URLs

| Endpoint | Method | Notes |
|----------|--------|-------|
| `/api/media/public/all-content` | GET | Public feed |
| `/api/media/all-content` | GET | Auth required |
| `/api/users/:userId` | GET | Auth required, returns user profile |

Base URL: `https://api.jevahapp.com` (or your configured `EXPO_PUBLIC_API_URL`).
