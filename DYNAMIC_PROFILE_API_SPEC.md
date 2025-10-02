### Dynamic Profile API Spec

Base URL: `/api/auth`

This spec defines a single, dynamic surface so the frontend can render the entire Profile screen from server-provided sections, with additional tab data fetched on demand.

---

### Public/Auth Endpoints

- POST `/register`

  - Body: `{ email: string, password: string (min 6), firstName: string, lastName: string }`
  - 201: `{ success, message, user }`

- POST `/login`

  - Body: `{ email: string, password: string }`
  - 200: `{ success, message, token, user }`
  - Errors: 400 invalid credentials; 403 email not verified

- POST `/verify-email`

  - Body: `{ email: string, code: string }`
  - 200: `{ success, message, user: { id, email, firstName, lastName, isEmailVerified, role } }`

- POST `/resend-verification-email`
  - Body: `{ email: string }`
  - 200: `{ success, message }`

---

### Profile Surface (Protected)

- GET `/me`

  - Returns the signed-in user’s complete profile surface used to render the Profile page dynamically.
  - 200 Response:

    - `success: boolean`
    - `user`: `{ id, email, firstName, lastName, username?, bio?, location?, avatarUrl?, bannerUrl?, section?, role, isEmailVerified, createdAt, updatedAt }`
    - `preferences`: `{ isKid, parentalControlEnabled, interests: string[], theme?: "light"|"dark", notifications: { email: boolean, push: boolean } }`
    - `stats`: `{ followers: number, following: number, posts: number, likes: number, saves: number, playlists: number, views: number }`
    - `badges`: `[{ id, name, iconUrl, earnedAt }]`
    - `links`: `[{ type: "instagram"|"twitter"|"youtube"|"tiktok"|"website", url }]`
    - `permissions`: `{ canEdit: boolean, canUpload: boolean, canGoLive: boolean, canCreatePlaylists: boolean }`
    - `sections`: ordered array describing what to render. Each section has a `type` and `payload`:
      - `{ type: "header", payload: { displayName, username, avatarUrl, bannerUrl, bio, location, badges } }`
      - `{ type: "quickActions", payload: [{ id: string, label: string }] }`
      - `{ type: "stats", payload: { followers, following, posts, likes, saves, playlists, views } }`
      - `{ type: "tabs", payload: [{ key: "posts"|"saved"|"playlists", label: string }] }`
      - `{ type: "grid", key: "posts", payload: { items: Content[] } }`
      - `{ type: "list", key: "saved", payload: { items: Content[] } }`
      - `{ type: "playlists", key: "playlists", payload: { items: Playlist[] } }`
      - `{ type: "activity", payload: { items: ActivityEvent[] } }`
      - `{ type: "settingsEntry", payload: { href: "/settings", label: "Settings" } }`

  - Types:
    - `Content`: `{ id, type: "video"|"music"|"ebook"|"image", title, thumbnailUrl, durationSec?, author, views, likes, saved, createdAt }`
    - `Playlist`: `{ id, title, coverUrl, itemsCount, createdAt, updatedAt }`
    - `ActivityEvent`: `{ id, type: "like"|"comment"|"follow"|"upload"|"save", title, targetId, timestamp }`

- PATCH `/complete-profile`

  - Body (any subset): `{ firstName?, lastName?, username?, bio?, location?, section?, isKid?, parentalControlEnabled?, interests?, theme?, notifications? }`
  - 200: same shape as GET `/me` for immediate UI refresh

- POST `/avatar` (multipart/form-data)
  - Field: `avatar` (png|jpg|gif ≤ 5MB), optional `crop?: { x,y,w,h }`
  - 200: `{ success, message, avatarUrl }`

---

### Supplemental User Data (Protected)

- GET `/user/content`

  - Query: `tab=posts|saved|playlists`, `page`, `limit`
  - 200: `{ items: Content[] | Playlist[], page, pageSize, total }`

- GET `/user/activity`

  - Query: `page`, `limit`
  - 200: `{ items: ActivityEvent[], page, pageSize, total }`

- POST `/user/profile-banner` (multipart/form-data)

  - Field: `banner` (image)
  - 200: `{ success, message, bannerUrl }`

- OPTIONAL Social Graph
  - GET `/user/followers?page&limit` → `{ items: [{ id, displayName, avatarUrl }], page, pageSize, total }`
  - GET `/user/following?page&limit` → same shape
  - POST `/user/follow/:targetUserId` and DELETE `/user/follow/:targetUserId`

---

### Error Contract

- Any error: `{ success: false, message, code? }` with appropriate HTTP status.

---

### Performance & UX

- Include cache headers (e.g., `etag`/`lastModified`) on GET `/me`.
- Keep `/me` sections lightweight; defer heavy lists to `/user/content` and `/user/activity`.
- Server controls `sections` order so the frontend renders purely from data.

---

### Example: GET `/me` (trimmed)

```json
{
  "success": true,
  "user": {
    "id": "u_123",
    "email": "user@example.com",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "username": "ada",
    "bio": "Building analytical engines.",
    "location": "London",
    "avatarUrl": "https://cdn/avatars/u_123.jpg",
    "bannerUrl": "https://cdn/banners/u_123.jpg",
    "section": "adults",
    "role": "user",
    "isEmailVerified": true,
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-10-01T00:00:00Z"
  },
  "preferences": {
    "isKid": false,
    "parentalControlEnabled": false,
    "interests": ["music", "sermons", "ebooks"],
    "theme": "light",
    "notifications": { "email": true, "push": true }
  },
  "stats": {
    "followers": 120,
    "following": 45,
    "posts": 32,
    "likes": 980,
    "saves": 210,
    "playlists": 5,
    "views": 15230
  },
  "badges": [
    {
      "id": "b_1",
      "name": "Early Adopter",
      "iconUrl": "https://cdn/badges/1.svg",
      "earnedAt": "2025-09-01T00:00:00Z"
    }
  ],
  "links": [{ "type": "website", "url": "https://example.com" }],
  "permissions": {
    "canEdit": true,
    "canUpload": true,
    "canGoLive": false,
    "canCreatePlaylists": true
  },
  "sections": [
    {
      "type": "header",
      "payload": {
        "displayName": "Ada Lovelace",
        "username": "ada",
        "avatarUrl": "https://cdn/avatars/u_123.jpg",
        "bannerUrl": "https://cdn/banners/u_123.jpg",
        "bio": "Building analytical engines.",
        "location": "London",
        "badges": [
          {
            "id": "b_1",
            "name": "Early Adopter",
            "iconUrl": "https://cdn/badges/1.svg",
            "earnedAt": "2025-09-01T00:00:00Z"
          }
        ]
      }
    },
    {
      "type": "quickActions",
      "payload": [
        { "id": "edit", "label": "Edit Profile" },
        { "id": "share", "label": "Share" }
      ]
    },
    {
      "type": "stats",
      "payload": {
        "followers": 120,
        "following": 45,
        "posts": 32,
        "likes": 980,
        "saves": 210,
        "playlists": 5,
        "views": 15230
      }
    },
    {
      "type": "tabs",
      "payload": [
        { "key": "posts", "label": "Posts" },
        { "key": "saved", "label": "Saved" },
        { "key": "playlists", "label": "Playlists" }
      ]
    }
  ]
}
```

If this contract is implemented as described, the frontend can render the entire Profile page dynamically and fetch heavy tab data only when needed.
