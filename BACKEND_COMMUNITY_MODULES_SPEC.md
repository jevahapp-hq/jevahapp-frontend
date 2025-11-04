## Community Modules API Contract

### Overview

This endpoint drives the Community screen cards dynamically. The frontend renders cards using this response, preserving the existing UI. Only the data source is dynamic.

### Endpoint

- Method: GET
- Path: `/api/community/modules`
- Auth: Bearer token (optional; return public modules if unauthenticated)

### Request

- Headers:
  - `Authorization: Bearer <token>` (optional)
- Query params: none

### Response: 200 OK

```json
{
  "success": true,
  "modules": [
    {
      "id": "mod_prayer_wall",
      "key": "prayer_wall",
      "title": "Prayer Wall",
      "color": "#279CCA",
      "order": 1,
      "visible": true,
      "route": "/screens/PrayerWallScreen"
    },
    {
      "id": "mod_forum",
      "key": "forum",
      "title": "Forum",
      "color": "#CC1CC0",
      "order": 2,
      "visible": true,
      "route": "/screens/ForumScreen"
    },
    {
      "id": "mod_polls",
      "key": "polls",
      "title": "Polls/Surveys",
      "color": "#DF930E",
      "order": 3,
      "visible": true,
      "route": "/screens/PollsScreen"
    },
    {
      "id": "mod_groups",
      "key": "groups",
      "title": "Groups",
      "color": "#666AF6",
      "order": 4,
      "visible": true,
      "route": "/screens/GroupsScreen"
    }
  ]
}
```

### Field Definitions

- `id` (string): stable identifier for the module
- `key` (enum): one of `prayer_wall | forum | polls | groups`
- `title` (string): label shown on the card
- `color` (string, optional): hex color. If omitted, frontend falls back by `key`.
- `order` (number, optional): ascending order for display (default 0)
- `visible` (boolean, optional): if `false`, module is hidden
- `route` (string, optional): explicit frontend route. If missing, frontend maps by `key`:
  - `prayer_wall` → `/screens/PrayerWallScreen`
  - `forum` → `/screens/ForumScreen`
  - `polls` → `/screens/PollsScreen`
  - `groups` → `/screens/GroupsScreen`

### Error Responses

- 401 Unauthorized (if you require auth):

```json
{ "success": false, "message": "Unauthorized" }
```

- 5xx Internal errors:

```json
{ "success": false, "message": "Internal Server Error" }
```

### Status Codes

- 200 OK: Successful response with `modules` array
- 400 Bad Request: Validation error
- 401 Unauthorized: Missing/invalid token (if auth enforced)
- 403 Forbidden: Authenticated but not permitted
- 404 Not Found: Resource not found
- 409 Conflict: Duplicates or conflicting state
- 500 Internal Server Error: Unexpected failure

### Caching

Recommend: `Cache-Control: public, max-age=60` and ETag support.

### Notes on Frontend Behavior

- Loading spinner shows while fetching; inline error message on failure.
- Modules are filtered where `visible !== false`, then sorted by `order`.
- Routing prefers `route`; otherwise uses the `key` mapping above.

## Community Tab Architecture and Navigation Flow

### High-level UX

- User taps the `Community` tab in the bottom navigation.
- The screen shows a header and a grid of cards (Prayer Wall, Forum, Polls/Surveys, Groups).
- Cards are driven by the `/api/community/modules` response. The UI layout and styling are fixed and unchanged.

### Components involved

- `app/categories/HomeScreen.tsx` — hosts main tabs; selecting `Community` renders `CommunityScreen`.
- `app/screens/CommunityScreen.tsx` — renders header and cards grid; fetches modules dynamically.
- `app/services/communityService.ts` — thin client for `/api/community/modules`.
- `app/utils/api.ts` — axios/fetch helpers and auth header management.
- `app/components/layout/BottomNavOverlay.tsx` — bottom navigation overlay.

### Control flow (sequence)

1. Bottom nav selects `Community` → `CommunityScreen` mounts.
2. On mount, `CommunityScreen` calls `communityService.fetchModules()`.
3. While awaiting response, UI shows a small centered spinner.
4. On success, the screen:
   - Filters modules where `visible !== false`.
   - Sorts modules by `order` ascending.
   - Maps each module to a card with `title` and `color` (fallback by `key` if missing).
5. On error, a small inline error text appears (UI stays intact).
6. When a card is tapped, navigation occurs using:
   - `module.route` if provided by backend; otherwise
   - default route by `key` (see Routing table below).

### Data contract the screen relies on

- Endpoint: `GET /api/community/modules`
- Response shape: see contract above (`modules[]` list)
- Optional auth: `Authorization: Bearer <token>`

### Routing table (fallbacks used if `route` not provided)

- `prayer_wall` → `/screens/PrayerWallScreen`
- `forum` → `/screens/ForumScreen`
- `polls` → `/screens/PollsScreen`
- `groups` → `/screens/GroupsScreen`

Backend may override any of these with a `route` field per module.

### Visual/styling invariants (do not break)

- Card grid: two columns, equal widths, fixed height; consistent rounded corners and drop shadow.
- Typography: uses Rubik font (e.g., `Rubik-Bold`).
- Colors: if backend omits `color`, frontend applies a stable color by `key`.
- Layout remains unchanged whether 1..N modules are returned; missing modules are just hidden.

### Error and loading behavior

- Loading: centered `ActivityIndicator` while fetching modules.
- Errors: inline red text with a generic message. No modals, no toasts.
- Partial failures: if the response is malformed, UI shows the error message and no cards.

### Performance and caching

- Recommended headers: `Cache-Control: public, max-age=60` and `ETag`.
- The call is lightweight; backend should aim for <100ms server compute where possible.

### Extensibility guidelines for backend

- Keep `key` stable; UI uses it for color fallback and routing fallback.
- Adding new modules: add a new `key` and provide `route` (recommended) and `color`.
- Hiding modules: set `visible: false` without removing the entry if you want to preserve order metadata.
- Reordering: adjust `order` only; UI sorts ascending.
- Multi-tenant or feature-flags: compute `modules` based on user/org and flags; UI will reflect the list automatically.

### Example end-to-end click path

1. Backend returns a `modules` array that includes `{ key: "forum", route: "/screens/ForumScreen" }`.
2. UI renders a `Forum` card.
3. User taps `Forum`.
4. Frontend checks `route` first, pushes `"/screens/ForumScreen"` via Expo Router.
5. Forum screen loads as it does today; no change required in its internal logic.

## Community Content Creation APIs (for user-generated posts)

These endpoints enable creating content within each module. They should follow the same auth and error patterns as above. Frontend screens already exist; wiring these endpoints will make creation functional.

Common requirements

- Auth: `Authorization: Bearer <token>` required
- Content-Type: `application/json` (use multipart if uploading files)
- Common fields: `title` (optional where noted), `content`/`body`, `media` (optional array of URLs), `tags` (optional array of strings)

### Prayer Wall

- POST `/api/community/prayer-wall/posts`
  - Body: `{ content: string, anonymous?: boolean, media?: string[] }`
  - 201 → `{ success: true, post: { id, content, ... } }`
- GET `/api/community/prayer-wall/posts`
  - Query: `page?, limit?, sort?=recent|popular`
  - 200 → `{ success: true, items: Post[], page, pageSize, total }`
- GET `/api/community/prayer-wall/posts/:id`
  - 200 → `{ success: true, post: Post }`

### Forum

- POST `/api/community/forum/threads`
  - Body: `{ title: string, body: string, tags?: string[] }`
  - 201 → `{ success: true, thread: { id, title, ... } }`
- GET `/api/community/forum/threads`
  - Query: `page?, limit?, sort?=recent|active`
  - 200 → `{ success: true, items: Thread[], page, pageSize, total }`
- GET `/api/community/forum/threads/:id`
  - 200 → `{ success: true, thread: Thread }`

### Polls / Surveys

- POST `/api/community/polls`
  - Body: `{ question: string, options: string[], multiSelect?: boolean, closesAt?: string }`
  - 201 → `{ success: true, poll: { id, question, options, ... } }`
- GET `/api/community/polls`
  - Query: `page?, limit?, status?=open|closed|all`
  - 200 → `{ success: true, items: Poll[], page, pageSize, total }`
- GET `/api/community/polls/:id`
  - 200 → `{ success: true, poll: Poll }`
- POST `/api/community/polls/:id/votes`
  - Body: `{ optionIndex: number | number[] }`
  - 200 → `{ success: true, poll: Poll }` (updated tallies)

### Groups

- POST `/api/community/groups`
  - Body: `{ name: string, description?: string, visibility?: 'public'|'private' }`
  - 201 → `{ success: true, group: { id, name, ... } }`
- GET `/api/community/groups`
  - Query: `page?, limit?, mine?: boolean`
  - 200 → `{ success: true, items: Group[], page, pageSize, total }`
- GET `/api/community/groups/:id`
  - 200 → `{ success: true, group: Group }`
- POST `/api/community/groups/:id/join`
  - 200 → `{ success: true, membership: {...} }`
- POST `/api/community/groups/:id/leave`
  - 200 → `{ success: true }`

Notes

- IDs should be stable strings.
- Timestamps: ISO 8601 in UTC.
- Pagination: 1-based `page`, integer `limit`.
- Rate limiting recommended on create endpoints.
