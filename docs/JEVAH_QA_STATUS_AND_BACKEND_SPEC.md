## Jevah App – QA Status & Backend Integration Spec

### 1. Scope of This Document

- **Goal**: Summarize current behavior vs QA findings and outline **backend contracts / adjustments** needed to fully pass the test cases.
- **Audience**: Backend + mobile engineers.
- **Source**: QA report (TC001–TC020) and current React Native/Expo frontend implementation.

---

## 2. Media Playback (Video & Audio)

### 2.1 Video fullscreen & scroll behavior (TC001–TC003)

- **Current frontend behavior**
  - Videos are rendered via `VideoCard` in the unified feed (`AllContentTikTok`).
  - A **fullscreen / expand** control on each `VideoCard` opens the reels-style viewer (full-screen playback).
  - Scroll logic in `AllContentTikTok`:
    - Automatically **pauses videos** that fall below ~20% visible height.
    - Automatically **pauses music** cards that are mostly out of view.
  - Play/pause icons on the card are **bound to global playback state** (no longer drift out of sync).

- **Backend requirements**
  - None for basic playback/scroll behavior.
  - Ensure video `fileUrl` values are:
    - Stable HTTPS URLs.
    - Long-lived enough for user sessions (or backed by a quick refresh endpoint).

---

## 3. Comment System (Facebook/Instagram-style)

### 3.1 UX/logic goals

- **Single, global comment experience**:
  - Opened from content cards (video, audio, ebook, etc.).
  - Instant-feel modal (Instagram-style) with:
    - Top-level comments and threaded replies.
    - Optimistic inserts.
    - Real-time updates from Socket.IO.

### 3.2 Current frontend behavior

- Centralized via `CommentModalContext` + `CommentModalV2` modal.
- **Fetching & pagination**
  - `GET /api/content/:contentType/:contentId/comments?page=&limit=`
  - The frontend expects payload shape like:
    - `data.comments` **or** `data.items` **or** `data.data`, each item:
      - `_id` / `id`
      - `content` or `comment` (the text)
      - `createdAt` / `timestamp`
      - `likesCount` (or a similar numeric like count)
      - `user` / `author` object with `firstName`, `lastName`, `username`, `avatar` (if available)
      - Optional `replies` array with the same shape.
- **Create comment**
  - `POST /api/comments`
  - Frontend sends:
    - `contentId` (string, Mongo ObjectId format when possible)
    - `contentType` (mapped to `media` / `devotional` / `ebook` etc.)
    - `content` (comment text)
    - Optional `parentCommentId` for replies.
  - Expects response:
    - `{ success, message, data: { id/_id, content, createdAt, likesCount, user: { ... } } }`
  - The app:
    - Inserts an optimistic temp comment.
    - Replaces it with the canonical `data` from the server (to avoid duplication).
    - Then refreshes from server and merges by `id`.
- **Like a comment**
  - `POST /api/comments/:commentId/like`
  - Expects response: `{ data: { liked, likesCount | totalLikes | reactionsCount } }`.
- **Real-time updates**
  - Socket.IO connection (via `SocketManager`) listening to `content-comment` events:
    - When `data.contentId` matches the open content:
      - Frontend refreshes comments (page 1) and stats.
  - This allows **multi-device real-time comment counts** and up-to-date comment lists.

### 3.3 Backend contracts and adjustments

- **Endpoints (expected)**
  - `POST /api/comments`
  - `GET /api/content/:contentType/:contentId/comments?page=&limit=`
  - `POST /api/comments/:commentId/like`
  - Socket event: `content-comment` with at least `{ contentId, totalComments }`.

- **Important details**
  - `contentId` is assumed to be a **24-char Mongo ObjectId** where possible.
    - If not valid, frontend falls back to local-only behavior (no server calls).
  - For `GET`:
    - Return comments in descending order by `createdAt` by default (newest first).
    - Provide:
      - `comments` (array)
      - `total` / `totalCount`
      - `hasMore` boolean.
  - For `POST /api/comments`:
    - Always respond with the **canonical record** in `data`.
    - Include normalized `user` info so the frontend can show `"First Last"` or `username`.

- **QA issues addressed**
  - **TC004 (comments deleted)**: comments are not deleted; new ones are merged.
  - **TC005 (duplicates)**: fixed by replacing temp IDs with canonical server IDs, then merging by `id`.

---

## 4. Downloads & Offline Access

### 4.1 Current frontend behavior (logical downloads only)

- Download flow uses:
  - `useDownloadHandler` → `useDownloadStore` (AsyncStorage-backed).
  - When user taps “Download”:
    - The app **does not** write a file to device storage.
    - It **stores metadata** only:
      - `id`, `title`, `description`, `author`, `contentType`
      - `fileUrl`, `thumbnailUrl`, `duration`, `size`, `downloadedAt`, `status`.
  - `DownloadsScreen` displays these items and:
    - For video/audio: streams from remote `fileUrl`.
    - For ebooks: shows thumbnail; no explicit “open file” yet.

### 4.2 Why QA saw “Download concluded but file not saved”

- The current implementation is a **“saved downloads list”**, not a true filesystem download.
- No binary file is written to device storage (Files app / Gallery), only metadata is persisted.

### 4.3 Required backend + frontend plan

- **Frontend (to implement)**
  - Integrate `expo-file-system` (or platform-specific FS) into `useDownloadHandler`:
    - Download `item.fileUrl` to a local path:
      - e.g. `FileSystem.documentDirectory + 'downloads/<id>.<ext>'`.
    - Update `DownloadItem` shape (and store) to include:
      - `localFilePath: string` (optional).
      - `status: 'DOWNLOADING' | 'DOWNLOADED' | 'FAILED'`.
    - Update `DownloadCard`:
      - Prefer `localFilePath` when present.
      - For ebooks: open the local PDF in your reader.
      - For video/audio: play from local URI when offline.

- **Backend (recommended guarantees)**
  - **Stable, long-lived URLs**:
    - `fileUrl` should not expire quickly; or
    - Provide a “refresh download URL” endpoint like:
      - `GET /api/content/:type/:id/download` → a fresh, valid URL for that asset.
  - Optional: Content-size header and MIME type stability to help the client:
    - Report expected file size / type for progress UI.

- **QA mapping**
  - **TC006 – “Download concluded but file not saved”**:
    - Will pass once local filesystem download + `localFilePath` are implemented.
  - **TC007 – “Downloads page not responsive”**:
    - Already addressed: downloads list is responsive and tappable; above steps will make it also handle true offline playback.

---

## 5. Music Section & Search

### 5.1 Copyright-free music

- **Frontend**
  - `Music` category and copyright-free:
    - `app/categories/music.tsx` → renders only `CopyrightFreeSongs`.
    - Copyright-free:
      - Loaded from backend via `copyrightFreeMusicAPI`.
      - Uses a unified global audio player for play/next/prev.
  - Music Library:
    - `MusicLibrary.tsx` shows user-saved music items only (type: `music/audio`).
    - Added a **search bar** that filters saved music by:
      - Title.
      - Speaker/artist name.

- **Backend**
  - Copyright-free:
    - Endpoint returning songs with:
      - `_id`, `title`, `singer`/`artist`, `fileUrl`, `thumbnailUrl`, `duration`, `category`.
  - Saved content:
    - Uses the bookmark endpoints (see interaction section) and is already integrated in the library store.

- **QA mapping**
  - **TC008 – Music folder shows audio only**: satisfied (Music views are scoped to audio content).
  - **TC009 – Search within Music folder**: satisfied for **saved music** via client-side filter.

---

## 6. Forum & Live Features

### 6.1 Forum (discussion board)

- **Current frontend**
  - `ForumScreen` + hooks `useForums`, `useForumPosts`:
    - Categories → Forums (discussions) → Posts.
    - Robust error/empty states:
      - If categories/forums/posts endpoints fail, user sees friendly error text instead of a crash.
  - Post operations:
    - `createPost`, `updatePost`, `deletePost`, `likePost`.
    - Each post supports:
      - Likes (`likesCount`, `userLiked`).
      - Comments count (`commentsCount`).
      - Navigation to a thread detail screen (for comments).

- **Backend expectations**
  - Categories:
    - `GET /api/forums/categories` → list with `_id`, `title`.
  - Discussions per category:
    - `GET /api/forums?categoryId=...` → list of forums with `_id`, `title`, `description`.
  - Posts per forum:
    - `GET /api/forums/:forumId/posts?page=&limit=`.
    - Each post should include:
      - `_id`, `content`, `createdAt`.
      - `likesCount`, `userLiked`, `commentsCount`.
      - `forum` reference (id + title).
      - `author`/`user`: name + avatar.
  - Mutations:
    - `POST /api/forums/:forumId/posts`
    - `PATCH /api/posts/:postId`
    - `DELETE /api/posts/:postId`
    - `POST /api/posts/:postId/like`

- **QA mapping (TC010)**
  - The current React Native layer is defensive (uses states instead of throwing).
  - If QA still experiences app restarts, likely causes:
    - Unexpected response structure (e.g. missing `data` or `posts` arrays).
    - Runtime error inside the hooks that assume a specific backend format.
  - Actions:
    - Confirm backend returns stable shapes (lists vs single objects).
    - Ensure errors are consistently shaped: `{ error: string }` or `{ message: string }` so UI can render them.

### 6.2 Go Live (live streaming)

- **Current frontend state**
  - `GoLiveScreen` (`app/goLlive/GoLive.tsx`) is **UI only**:
    - Live badge UI.
    - Camera filter previews.
    - “Go Live” + “Upload” buttons.
  - **No streaming SDK or backend endpoints** are wired yet.

- **Backend & infra requirements**
  - Decide streaming architecture:
    - RTMP ingestion (to a media server) or WebRTC-based SDK.
  - Likely endpoints:
    - `POST /api/live/sessions` → returns `streamKey`, `ingestUrl`, `playbackUrl`.
    - `GET /api/live/sessions` → list active/past live sessions.
    - `PATCH /api/live/sessions/:id/end` → end stream, mark as archived.
  - Optional:
    - WebSocket/Socket.IO channel for:
      - Live chat.
      - Concurrent viewers count.

- **Frontend work once backend is ready**
  - Integrate chosen SDK:
    - Start/stop broadcast using the returned `streamKey`, `ingestUrl`.
  - Bind viewer count and chat to the backend’s real-time APIs.

---

## 7. eBooks, Hymns & Text-to-Speech

### 7.1 eBook behavior & performance

- **Current**
  - `EbookCard`:
    - Tapping opens `/reader/PdfViewer` with a `fileUrl` (PDF).
    - Records a “view” via `recordView(contentId, "ebook", ...)` after 5 seconds.
  - No explicit caching or prefetch; large PDFs may feel slow to open on poor networks.

- **Backend recommendations**
  - Ensure `fileUrl` is:
    - Fast to serve (CDN backed).
    - Stable HTTPS.
  - Optionally add:
    - `HEAD /pdf/:id` or `GET /api/ebooks/:id/metadata` for size/pages metadata.

### 7.2 Text-to-Voice (TTS) and audio for eBooks

- **Current**
  - `UnifiedMediaControls` intentionally **does not support** audio for eBooks yet:
    - Displays an error: “Audio playback not available for ebooks”.
  - Hymns currently use static JSON + screens, but there is no generalized TTS on ebooks.

- **Desired behavior (per QA)**
  - eBook pages/chapters should have an optional **“Read Aloud”** feature.
  - Hymn TTS is less critical; the priority is moving TTS ability to eBooks.

- **Backend spec for TTS**
  - Option 1 – Pre-generated audio:
    - `GET /api/ebooks/:id/audio` → returns a streamable audio URL (MP3/OGG).
    - Internally, the backend may generate this from the text (e.g. using a TTS engine).
  - Option 2 – On-demand generation:
    - `POST /api/ebooks/:id/tts` with:
      - `range` (chapter, page range).
      - `voice`, `speed`, etc.
    - Returns either:
      - Immediate audio URL; or
      - Job ID + later `GET` to poll for completion.

- **Frontend work**
  - Add a “Listen / Read aloud” button in the PDF/ebook viewer.
  - Integrate with:
    - Either backend audio URL via existing audio player; or
    - Local device TTS (for MVP, with fewer backend dependencies).

---

## 8. Global Interactions (Likes, Saves, Views, Shares)

### 8.1 Current integration

- Centralized in `contentInteractionAPI` and `useInteractionStore`.
- **Endpoints in use**
  - Likes:
    - `POST /api/content/:type/:id/like`
    - Expects: `{ data: { liked, likeCount } }`.
  - Saves (bookmarks):
    - `POST /api/bookmark/:id/toggle` → `{ data: { bookmarked, bookmarkCount } }`.
    - `GET /api/bookmark/:id/status` → `{ data: { isBookmarked, bookmarkCount } }`.
    - `GET /api/bookmark/user?...` for user’s saved content.
  - Views:
    - `POST /api/content/:type/:id/view` → `{ data: { viewCount, hasViewed } }`.
  - Shares:
    - `POST /api/interactions/share` with `{ contentId, contentType, platform }`.
  - Batch metadata:
    - `POST /api/content/batch-metadata` with `{ contentIds, contentType }`.
  - Content stats fallback:
    - `GET /api/content/:type/:id/metadata` (or stats), when batch metadata is not used.

### 8.2 Expectations & mapping

- `contentType` mapping (frontend → backend):
  - `"videos"`, `"audio"`, `"music"`, `"live"` → `"media"`.
  - `"sermon"`, `"devotional"` → `"devotional"`.
  - `"ebook"`, `"e-books"`, `"books"`, `"image"` → `"ebook"`.
- Backend should:
  - Normalize all responses under `data` whenever possible.
  - Provide accurate counters:
    - `likeCount`, `bookmarkCount`, `shareCount`, `viewCount`, `commentCount`.
  - Provide user interaction booleans:
    - `hasLiked`, `hasBookmarked`, `hasShared`, `hasViewed`.

### 8.3 QA mapping

- **Likes not persisting (TC015)**:
  - Now backed by server + AsyncStorage fallback.
  - Any remaining issues will likely come from:
    - Inconsistent endpoint shapes.
    - Server not persisting `hasLiked` or `likeCount` correctly.
- **View counts static (TC019)**:
  - Frontend posts view events with:
    - `durationMs`, `progressPct`, `isComplete`.
  - Uniqueness rules (**per unique user/session/device**) are strictly a **backend concern**; frontend is already sending events.

---

## 9. Gospel-Content Verification (TC020)

### 9.1 Desired behavior

- All uploaded content (video, audio, text) should be automatically screened to confirm:
  - Alignment with gospel standards.
  - Absence of explicit/unsafe material.

### 9.2 Recommended backend design

- At upload time (or shortly after), run content through an AI moderation pipeline:
  - **Text input**:
    - Titles, descriptions, any transcribed audio text (if available).
  - **Outputs**:
    - `isGospel: boolean`.
    - `category: enum('gospel', 'uncertain', 'not_gospel')`.
    - `flags: { explicitLanguage: boolean, violence: boolean, hateful: boolean, etc. }`.
    - `reviewStatus: enum('pending', 'approved', 'rejected')`.
- Expose results via metadata on content endpoints:
  - `GET /api/content/:type/:id` → includes `reviewStatus`, `isGospel`, `flags`.

### 9.3 Frontend behavior once available

- Hide or label content based on `reviewStatus` and `isGospel`:
  - Non-approved content can be:
    - Hidden from public feeds.
    - Shown with a “Pending review” badge to the uploader only.

---

## 10. Notifications & Profile Management (High-Level)

### 10.1 Notifications (TC016)

- Frontend relies on push payloads (FCM/APNs) for notification content.
- To show high-quality previews:
  - **Backend** should:
    - Include `title`, `body`, `image`, `deepLink` in notification payloads.
    - Use consistent types (`contentType`, `contentId`) so the app can deep-link into appropriate screens.

### 10.2 Profile editing/switching (TC017)

- For robust profile management:
  - Backend endpoints:
    - `GET /api/auth/me` (already used for profile header in Downloads).
    - `PATCH /api/users/me` → update profile fields.
    - Optional: `POST /api/auth/switch-profile` for multi-profile accounts.
  - Frontend:
    - Dedicated profile screen with edit + switch logic.

---

## 11. Summary of What’s Already Done vs Needed

- **Implemented & stable on frontend**
  - Video playback with scroll-based auto-pause and explicit fullscreen entry.
  - Global comment system with optimistic updates and duplication fixed.
  - Global like/save/view/share APIs integrated with backend + AsyncStorage fallback.
  - Music category + Music Library showing only audio; search within saved music.
  - Forum UI with robust error/empty states, post CRUD, and like counts.

- **Requires backend and/or new feature work**
  - True filesystem downloads (TC006) + offline playback for videos/audio/ebooks.
  - Live streaming (Go Live) – SDK + endpoints for live sessions.
  - eBook TTS/audio (TC013–TC014) – pre-generated or on-demand audio endpoints.
  - Gospel content verification (TC020) – AI moderation pipeline and metadata.
  - Improved push notification payloads for richer previews.
  - Profile edit/switch endpoints and UI.




