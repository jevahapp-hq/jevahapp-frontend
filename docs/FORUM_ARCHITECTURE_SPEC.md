# Forum Architecture Specification

## Table of Contents

1. [Overview](#overview)
2. [Frontend Architecture](#frontend-architecture)
3. [User CRUD Operations](#user-crud-operations)
4. [API Consumption Flow](#api-consumption-flow)
5. [Backend Endpoint Design](#backend-endpoint-design)
6. [Data Models](#data-models)
7. [State Management](#state-management)
8. [Error Handling](#error-handling)
9. [Real-time Considerations](#real-time-considerations)

---

## Overview

The Forum system is a hierarchical discussion platform where:
- **Admins** create **Forums** (categories/topics)
- **Users** create **Posts** (conversation threads) within forums
- **Users** can **Comment** on posts with nested replies
- All entities support **Likes** and **Interactions**

### Hierarchy

```
Forum (Category)
  └── Post (Thread/Conversation)
      └── Comment
          └── Reply (Nested Comment)
```

---

## Frontend Architecture

### File Structure

```
app/
├── screens/
│   ├── ForumScreen.tsx          # Main forum list view
│   └── ThreadScreen.tsx         # Post detail view (legacy, being replaced)
├── hooks/
│   └── useForums.ts             # Custom hooks for forum operations
├── utils/
│   ├── communityAPI.ts          # API service layer
│   └── communityHelpers.ts      # Validation & utilities
└── components/
    └── (forum-specific components)
```

### Component Hierarchy

```
ForumScreen
├── CategorySelector (horizontal scroll)
├── DiscussionList (FlatList of forums/discussions)
│   └── ForumCard
│       ├── Title
│       ├── Description
│       ├── Stats (postsCount, participantsCount)
│       └── Action buttons
└── CreateForumModal

ThreadScreen (Post Detail)
├── PostHeader
│   ├── Author info
│   ├── Content
│   ├── Embedded links (if any)
│   └── Interaction bar (like, comment)
├── CommentsList (FlatList)
│   └── CommentItem
│       ├── Author info
│       ├── Content
│       ├── Like button
│       └── Replies (nested)
└── CommentInput
```

### Key Components

#### 1. `ForumScreen.tsx`
- **Purpose**: Main entry point for forums
- **Responsibilities**:
  - Display categories (forums marked as `isCategory: true`)
  - Display discussions (forums with `categoryId`)
  - Handle category selection
  - Show create forum modal
  - Navigate to post detail view

#### 2. `useForums.ts` Hook
- **Purpose**: Custom React hooks for forum data management
- **Exports**:
  - `useForums()`: Manages categories and discussions
  - `useForumPosts(forumId)`: Manages posts within a forum
  - `useForumPostComments(postId)`: Manages comments on a post

#### 3. `communityAPI.ts` Service
- **Purpose**: API communication layer
- **Responsibilities**:
  - HTTP request/response handling
  - Token management
  - Response normalization
  - Error handling

---

## User CRUD Operations

### 1. CREATE Operations

#### Create Forum (Admin Only)
```typescript
// Frontend: ForumScreen.tsx
const { createForum } = useForums();

await createForum({
  categoryId: selectedCategoryId, // null for top-level categories
  title: "New Forum Title",
  description: "Forum description"
});
```

**Flow**:
1. User fills form in `CreateForumModal`
2. Validation via `validateForumForm()` (from `communityHelpers.ts`)
3. Call `communityAPI.createForum(forumData)`
4. POST to `/api/community/forum/create`
5. On success, refresh categories/discussions list
6. Update local state optimistically

#### Create Post (User)
```typescript
// Frontend: ThreadScreen or Post creation modal
const { createPost } = useForumPosts(forumId);

await createPost({
  content: "Post content here",
  embeddedLinks: [
    {
      url: "https://example.com/video",
      title: "Video Title",
      description: "Description",
      thumbnail: "https://example.com/thumb.jpg",
      type: "video"
    }
  ],
  tags: ["tag1", "tag2"] // Optional
});
```

**Flow**:
1. User writes post content
2. Optionally adds embedded links (auto-detected or manual)
3. Validation via `validateForumPostForm()`
4. Call `communityAPI.createForumPost(forumId, postData)`
5. POST to `/api/community/forum/{forumId}/posts`
6. On success, add post to top of list (optimistic update)
7. Refresh posts list to get server response

#### Create Comment (User)
```typescript
// Frontend: ThreadScreen comment input
const { addComment } = useForumPostComments(postId);

// Top-level comment
await addComment({
  content: "Great post!",
  parentCommentId: undefined
});

// Nested reply
await addComment({
  content: "Thanks!",
  parentCommentId: "commentId123"
});
```

**Flow**:
1. User types comment in input field
2. Validation (min 1 char, max 2000 chars)
3. Call `communityAPI.commentOnForumPost(postId, commentData)`
4. POST to `/api/community/forum/posts/{postId}/comments`
5. On success, add comment to list (optimistic update)
6. Update comment count on post

### 2. READ Operations

#### Read Categories
```typescript
// Frontend: ForumScreen.tsx
const { categories, categoriesLoading, loadCategories } = useForums();

useEffect(() => {
  loadCategories(); // Auto-loads on mount
}, []);
```

**Flow**:
1. Component mounts
2. `useForums()` hook calls `loadCategories()`
3. GET `/api/community/forum?view=categories&page=1&limit=100`
4. Update `categories` state
5. Auto-select first category if none selected

#### Read Discussions (Posts List)
```typescript
// Frontend: ForumScreen.tsx
const { discussions, discussionsLoading, loadDiscussions } = useForums();

useEffect(() => {
  if (selectedCategoryId) {
    loadDiscussions(selectedCategoryId);
  }
}, [selectedCategoryId]);
```

**Flow**:
1. User selects a category
2. `selectedCategoryId` changes
3. `useEffect` triggers `loadDiscussions(categoryId)`
4. GET `/api/community/forum?view=discussions&categoryId={id}&page=1&limit=100`
5. Filter results where `isCategory !== true`
6. Update `discussions` state

#### Read Posts (Paginated)
```typescript
// Frontend: ThreadScreen or Post list
const { posts, loading, hasMore, loadMore, refresh } = useForumPosts(forumId);

// Initial load
useEffect(() => {
  if (forumId) {
    loadPosts(true); // reset = true
  }
}, [forumId]);

// Load more (infinite scroll)
const handleLoadMore = () => {
  if (hasMore && !loading) {
    loadMore();
  }
};
```

**Flow**:
1. Component mounts with `forumId`
2. GET `/api/community/forum/{forumId}/posts?page=1&limit=20&sortBy=createdAt&sortOrder=desc`
3. Update `posts` state
4. User scrolls to bottom
5. Call `loadMore()` → GET next page
6. Append to existing posts

#### Read Comments (Paginated with Replies)
```typescript
// Frontend: ThreadScreen
const { comments, loading, hasMore, loadMore } = useForumPostComments(postId);

useEffect(() => {
  if (postId) {
    loadComments(true); // reset = true
  }
}, [postId]);
```

**Flow**:
1. Post detail view opens
2. GET `/api/community/forum/posts/{postId}/comments?page=1&limit=20&includeReplies=true`
3. Backend returns nested structure:
   ```json
   {
     "comments": [
       {
         "_id": "comment1",
         "content": "Top comment",
         "replies": [
           {
             "_id": "reply1",
             "content": "Reply to comment",
             "parentCommentId": "comment1"
           }
         ]
       }
     ]
   }
   ```
4. Render nested tree structure

### 3. UPDATE Operations

#### Update Post (Creator Only)
```typescript
// Frontend: Post edit modal
const { updatePost } = useForumPosts(forumId);

await updatePost(postId, {
  content: "Updated content",
  embeddedLinks: [...], // Optional
  tags: [...] // Optional
});
```

**Flow**:
1. User clicks "Edit" on their post
2. Check ownership via `isForumPostOwner(post)`
3. Open edit modal with current content
4. User modifies content
5. Validation
6. PUT `/api/community/forum/posts/{postId}`
7. On success, update post in local state
8. Backend validates ownership

#### Update Forum (Admin Only)
```typescript
// Frontend: Admin panel
const { updateForum } = useForums(); // Would need to be added

await updateForum(forumId, {
  title: "Updated title",
  description: "Updated description"
});
```

**Flow**:
1. Admin opens edit modal
2. Validation
3. PUT `/api/community/forum/{forumId}` (endpoint to be implemented)
4. Refresh categories list

### 4. DELETE Operations

#### Delete Post (Creator Only)
```typescript
// Frontend: Post options menu
const { deletePost } = useForumPosts(forumId);

const handleDelete = async () => {
  const confirmed = await showConfirmDialog("Delete post?");
  if (confirmed) {
    await deletePost(postId);
    // Navigate back to forum list
  }
};
```

**Flow**:
1. User clicks "Delete" on their post
2. Show confirmation dialog
3. DELETE `/api/community/forum/posts/{postId}`
4. On success, remove post from local state
5. Navigate back if on post detail view
6. Backend validates ownership

#### Delete Comment (Creator Only)
```typescript
// Frontend: Comment options menu
const { deleteComment } = useForumPostComments(postId); // Would need to be added

await deleteComment(commentId);
```

**Flow**:
1. User clicks "Delete" on their comment
2. DELETE `/api/community/forum/comments/{commentId}` (endpoint to be implemented)
3. Remove from local state (handle nested replies)
4. Update comment count on post

---

## API Consumption Flow

### Request Flow Diagram

```
User Action
    ↓
React Component
    ↓
Custom Hook (useForums, useForumPosts, etc.)
    ↓
API Service (communityAPI.ts)
    ↓
HTTP Request (fetch)
    ↓
Backend API
    ↓
Response Handler
    ↓
State Update (Zustand/useState)
    ↓
UI Re-render
```

### Example: Creating a Post

```typescript
// 1. User Action (ThreadScreen.tsx)
<TouchableOpacity onPress={handleCreatePost}>
  <Text>Post</Text>
</TouchableOpacity>

// 2. Handler
const handleCreatePost = async () => {
  const postData = {
    content: inputText,
    embeddedLinks: detectedLinks
  };
  
  // 3. Hook Call
  const result = await createPost(postData);
  
  if (result) {
    // Success - post added to list
    setInputText("");
  } else {
    // Error - show error message
    Alert.alert("Error", "Failed to create post");
  }
};

// 4. Hook Implementation (useForums.ts)
const createPost = useCallback(async (postData) => {
  try {
    setLoading(true);
    setError(null);
    
    // 5. API Service Call
    const response = await communityAPI.createForumPost(forumId, postData);
    
    if (response.success && response.data) {
      // 6. Optimistic Update
      setPosts((prev) => [response.data, ...prev]);
      return response.data;
    } else {
      const apiError = ApiErrorHandler.handle(response);
      setError(apiError);
      return null;
    }
  } catch (err) {
    const apiError = ApiErrorHandler.handle(err);
    setError(apiError);
    return null;
  } finally {
    setLoading(false);
  }
}, [forumId]);

// 7. API Service (communityAPI.ts)
async createForumPost(forumId: string, postData: {...}) {
  const headers = await this.getAuthHeaders();
  const response = await fetch(
    `${this.baseURL}/api/community/forum/${forumId}/posts`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(postData)
    }
  );
  
  return await this.handleResponse<ForumPost>(response);
}
```

### Optimistic Updates

The frontend implements optimistic updates for better UX:

```typescript
// Like Post - Optimistic Update
const likePost = useCallback(async (postId, currentLiked, currentLikesCount) => {
  // 1. Immediately update UI
  setPosts((prev) =>
    prev.map((post) =>
      post._id === postId
        ? {
            ...post,
            userLiked: !currentLiked,
            likesCount: currentLiked ? currentLikesCount - 1 : currentLikesCount + 1
          }
        : post
    )
  );

  try {
    // 2. Make API call
    const response = await communityAPI.likeForumPost(postId);
    
    if (response.success && response.data) {
      // 3. Update with server response (may differ slightly)
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                userLiked: response.data.liked,
                likesCount: response.data.likesCount
              }
            : post
        )
      );
    } else {
      // 4. Revert on error
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                userLiked: currentLiked,
                likesCount: currentLikesCount
              }
            : post
        )
      );
    }
  } catch (err) {
    // Revert on error
    // ... (same revert logic)
  }
}, []);
```

---

## Backend Endpoint Design

### Base URL
```
/api/community/forum
```

### Endpoint Specifications

#### 1. Create Forum (Admin Only)

**POST** `/api/community/forum/create`

**Request Body:**
```json
{
  "categoryId": "507f1f77bcf86cd799439020", // Optional: null for top-level
  "title": "General Discussion",
  "description": "A place for community members to share thoughts"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "title": "General Discussion",
    "description": "A place for community members...",
    "createdBy": "507f191e810c19729de860ea",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "isActive": true,
    "postsCount": 0,
    "participantsCount": 0,
    "isCategory": false, // true if categoryId is null
    "categoryId": null
  }
}
```

**Validation:**
- `title`: Required, string, 3-100 chars
- `description`: Required, string, 10-500 chars
- `categoryId`: Optional, must be valid ObjectId if provided

**Authorization:**
- Requires admin role
- Extract userId from JWT token

---

#### 2. Get Forums (Categories or Discussions)

**GET** `/api/community/forum`

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page
- `view` (optional): `"categories"` | `"discussions"` | `"all"` (default: `"all"`)
- `categoryId` (optional): Filter discussions by category

**Response:**
```json
{
  "success": true,
  "data": {
    "forums": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "title": "General Discussion",
        "description": "A place for community members...",
        "createdBy": {
          "_id": "507f191e810c19729de860ea",
          "firstName": "Admin",
          "lastName": "User",
          "username": "admin_user"
        },
        "createdAt": "2024-01-15T10:00:00.000Z",
        "updatedAt": "2024-01-15T10:00:00.000Z",
        "isActive": true,
        "postsCount": 150,
        "participantsCount": 45,
        "isCategory": false,
        "categoryId": "507f1f77bcf86cd799439019",
        "category": {
          "_id": "507f1f77bcf86cd799439019",
          "title": "Main Category",
          "description": "Main category description"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

**Backend Logic:**
```javascript
// Pseudo-code
if (view === "categories") {
  // Return forums where isCategory === true OR categoryId is null
  query = { $or: [{ isCategory: true }, { categoryId: null }] };
} else if (view === "discussions") {
  // Return forums where isCategory !== true AND categoryId matches
  query = { isCategory: { $ne: true } };
  if (categoryId) {
    query.categoryId = categoryId;
  }
} else {
  // Return all forums
  query = {};
}

// Populate createdBy, category
// Sort by createdAt desc
// Paginate
```

---

#### 3. Get Forum Posts

**GET** `/api/community/forum/{forumId}/posts`

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `sortBy` (optional, default: `"createdAt"`): `"createdAt"` | `"likesCount"` | `"commentsCount"`
- `sortOrder` (optional, default: `"desc"`): `"asc"` | `"desc"`

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "_id": "507f1f77bcf86cd799439021",
        "forumId": "507f1f77bcf86cd799439020",
        "userId": "507f191e810c19729de860eb",
        "content": "Hey, Joseph here. I am willing to learn from you all",
        "embeddedLinks": [
          {
            "url": "https://www.tevah.com/watch?v=0omiX-5T5xk",
            "title": "God is Good by Apostle Emmanuel Iren",
            "description": "Accelerate Conference 2025",
            "thumbnail": "https://example.com/thumb.jpg",
            "type": "video"
          }
        ],
        "tags": ["learning", "community"],
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "likesCount": 1200,
        "commentsCount": 1200,
        "userLiked": false, // Based on current user
        "author": {
          "_id": "507f191e810c19729de860eb",
          "username": "joseph_eluwa",
          "firstName": "Joseph",
          "lastName": "Eluwa",
          "avatarUrl": "https://example.com/avatar.jpg"
        },
        "forum": {
          "_id": "507f1f77bcf86cd799439020",
          "title": "General Discussion"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasMore": true
    }
  }
}
```

**Backend Logic:**
```javascript
// Pseudo-code
const posts = await Post.find({ forumId })
  .populate("userId", "username firstName lastName avatarUrl")
  .populate("forumId", "title")
  .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
  .skip((page - 1) * limit)
  .limit(limit);

// Check if current user liked each post
const userId = req.user._id;
for (const post of posts) {
  const like = await Like.findOne({ postId: post._id, userId });
  post.userLiked = !!like;
}

// Calculate likesCount and commentsCount (aggregate or cached)
```

---

#### 4. Create Forum Post

**POST** `/api/community/forum/{forumId}/posts`

**Request Body:**
```json
{
  "content": "This message inspired me, thought to share",
  "embeddedLinks": [
    {
      "url": "https://www.tevah.com/watch?v=0omiX-5T5xk",
      "title": "God is Good by Apostle Emmanuel Iren",
      "description": "Accelerate Conference 2025",
      "thumbnail": "https://example.com/thumb.jpg",
      "type": "video"
    }
  ],
  "tags": ["inspiration", "video"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "forumId": "507f1f77bcf86cd799439020",
    "userId": "507f191e810c19729de860eb",
    "content": "This message inspired me, thought to share",
    "embeddedLinks": [...],
    "tags": ["inspiration", "video"],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "likesCount": 0,
    "commentsCount": 0,
    "userLiked": false,
    "author": {
      "_id": "507f191e810c19729de860eb",
      "username": "joseph_eluwa",
      "firstName": "Joseph",
      "lastName": "Eluwa",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  }
}
```

**Validation:**
- `content`: Required, string, 1-5000 chars
- `embeddedLinks`: Optional array, max 5 items
  - `url`: Required, valid URL
  - `title`: Optional, max 200 chars
  - `description`: Optional, max 500 chars
  - `thumbnail`: Optional, valid URL
  - `type`: Required, one of: `"video"`, `"article"`, `"resource"`, `"other"`
- `tags`: Optional array, max 10 items, each max 50 chars

**Backend Logic:**
```javascript
// Pseudo-code
const userId = req.user._id; // From JWT

// Validate forum exists and is active
const forum = await Forum.findById(forumId);
if (!forum || !forum.isActive) {
  return res.status(404).json({ success: false, error: "Forum not found" });
}

// Create post
const post = await Post.create({
  forumId,
  userId,
  content: req.body.content,
  embeddedLinks: req.body.embeddedLinks || [],
  tags: req.body.tags || []
});

// Increment postsCount on forum
await Forum.findByIdAndUpdate(forumId, { $inc: { postsCount: 1 } });

// Populate author
await post.populate("userId", "username firstName lastName avatarUrl");

return res.json({ success: true, data: post });
```

---

#### 5. Update Forum Post

**PUT** `/api/community/forum/posts/{postId}`

**Request Body:** (All fields optional)
```json
{
  "content": "Updated post content",
  "embeddedLinks": [...],
  "tags": ["updated", "tags"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "content": "Updated post content",
    "updatedAt": "2024-01-15T12:00:00.000Z",
    // ... other fields
  }
}
```

**Authorization:**
- Only post creator can update
- Check `post.userId === req.user._id`

**Backend Logic:**
```javascript
// Pseudo-code
const post = await Post.findById(postId);
if (!post) {
  return res.status(404).json({ success: false, error: "Post not found" });
}

// Check ownership
if (post.userId.toString() !== req.user._id) {
  return res.status(403).json({ success: false, error: "Forbidden" });
}

// Update
const updated = await Post.findByIdAndUpdate(
  postId,
  {
    ...req.body,
    updatedAt: new Date()
  },
  { new: true }
).populate("userId", "username firstName lastName avatarUrl");

return res.json({ success: true, data: updated });
```

---

#### 6. Delete Forum Post

**DELETE** `/api/community/forum/posts/{postId}`

**Response:**
```json
{
  "success": true,
  "message": "Post deleted successfully"
}
```

**Authorization:**
- Only post creator or admin can delete

**Backend Logic:**
```javascript
// Pseudo-code
const post = await Post.findById(postId);
if (!post) {
  return res.status(404).json({ success: false, error: "Post not found" });
}

// Check ownership or admin
const isOwner = post.userId.toString() === req.user._id;
const isAdmin = req.user.role === "admin";

if (!isOwner && !isAdmin) {
  return res.status(403).json({ success: false, error: "Forbidden" });
}

// Delete post (cascade delete comments and likes)
await Post.findByIdAndDelete(postId);
await Comment.deleteMany({ postId });
await Like.deleteMany({ postId: postId, type: "post" });

// Decrement postsCount on forum
await Forum.findByIdAndUpdate(post.forumId, { $inc: { postsCount: -1 } });

return res.json({ success: true, message: "Post deleted successfully" });
```

---

#### 7. Like/Unlike Forum Post

**POST** `/api/community/forum/posts/{postId}/like`

**Response:**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likesCount": 1201
  }
}
```

**Backend Logic:**
```javascript
// Pseudo-code
const userId = req.user._id;
const postId = req.params.postId;

// Check if already liked
const existingLike = await Like.findOne({ postId, userId, type: "post" });

if (existingLike) {
  // Unlike: delete like
  await Like.findByIdAndDelete(existingLike._id);
  await Post.findByIdAndUpdate(postId, { $inc: { likesCount: -1 } });
  
  const post = await Post.findById(postId);
  return res.json({
    success: true,
    data: { liked: false, likesCount: post.likesCount }
  });
} else {
  // Like: create like
  await Like.create({ postId, userId, type: "post" });
  await Post.findByIdAndUpdate(postId, { $inc: { likesCount: 1 } });
  
  const post = await Post.findById(postId);
  return res.json({
    success: true,
    data: { liked: true, likesCount: post.likesCount }
  });
}
```

---

#### 8. Get Forum Post Comments

**GET** `/api/community/forum/posts/{postId}/comments`

**Query Parameters:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `includeReplies` (optional, default: `true`): Include nested replies

**Response:**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "507f1f77bcf86cd799439022",
        "postId": "507f1f77bcf86cd799439021",
        "userId": "507f191e810c19729de860ec",
        "content": "Great post! Thanks for sharing.",
        "parentCommentId": null,
        "createdAt": "2024-01-15T11:00:00.000Z",
        "likesCount": 5,
        "userLiked": false,
        "replies": [
          {
            "_id": "507f1f77bcf86cd799439023",
            "postId": "507f1f77bcf86cd799439021",
            "userId": "507f191e810c19729de860eb",
            "content": "You're welcome!",
            "parentCommentId": "507f1f77bcf86cd799439022",
            "createdAt": "2024-01-15T11:05:00.000Z",
            "likesCount": 2,
            "userLiked": false,
            "replies": [],
            "author": {
              "_id": "507f191e810c19729de860eb",
              "username": "joseph_eluwa",
              "avatarUrl": "https://example.com/avatar.jpg"
            }
          }
        ],
        "author": {
          "_id": "507f191e810c19729de860ec",
          "username": "user456",
          "avatarUrl": "https://example.com/avatar2.jpg"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1200,
      "totalPages": 60,
      "hasMore": true
    }
  }
}
```

**Backend Logic:**
```javascript
// Pseudo-code
const postId = req.params.postId;
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 20;
const includeReplies = req.query.includeReplies !== "false";

// Get top-level comments (parentCommentId is null)
const comments = await Comment.find({ postId, parentCommentId: null })
  .populate("userId", "username firstName lastName avatarUrl")
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit);

// If includeReplies, fetch nested replies (max 3 levels deep)
if (includeReplies) {
  for (const comment of comments) {
    comment.replies = await getNestedReplies(comment._id, 3);
  }
}

// Check if current user liked each comment
const userId = req.user?._id;
for (const comment of comments) {
  const like = await Like.findOne({ commentId: comment._id, userId });
  comment.userLiked = !!like;
  
  // Check likes for replies too
  if (comment.replies) {
    for (const reply of comment.replies) {
      const replyLike = await Like.findOne({ commentId: reply._id, userId });
      reply.userLiked = !!replyLike;
    }
  }
}

// Calculate total count
const total = await Comment.countDocuments({ postId, parentCommentId: null });

return res.json({
  success: true,
  data: {
    comments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  }
});

// Helper function for nested replies
async function getNestedReplies(parentId, maxDepth, currentDepth = 0) {
  if (currentDepth >= maxDepth) return [];
  
  const replies = await Comment.find({ parentCommentId: parentId })
    .populate("userId", "username firstName lastName avatarUrl")
    .sort({ createdAt: 1 });
  
  for (const reply of replies) {
    reply.replies = await getNestedReplies(reply._id, maxDepth, currentDepth + 1);
  }
  
  return replies;
}
```

---

#### 9. Add Comment to Forum Post

**POST** `/api/community/forum/posts/{postId}/comments`

**Request Body:**
```json
{
  "content": "Great post! Thanks for sharing.",
  "parentCommentId": null // or "commentId123" for nested reply
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439022",
    "postId": "507f1f77bcf86cd799439021",
    "userId": "507f191e810c19729de860ec",
    "content": "Great post! Thanks for sharing.",
    "parentCommentId": null,
    "createdAt": "2024-01-15T11:00:00.000Z",
    "likesCount": 0,
    "userLiked": false,
    "replies": [],
    "author": {
      "_id": "507f191e810c19729de860ec",
      "username": "user456",
      "avatarUrl": "https://example.com/avatar2.jpg"
    }
  }
}
```

**Validation:**
- `content`: Required, string, 1-2000 chars
- `parentCommentId`: Optional, must be valid comment ID if provided
- Maximum nesting depth: 3 levels

**Backend Logic:**
```javascript
// Pseudo-code
const userId = req.user._id;
const postId = req.params.postId;
const { content, parentCommentId } = req.body;

// Validate post exists
const post = await Post.findById(postId);
if (!post) {
  return res.status(404).json({ success: false, error: "Post not found" });
}

// If parentCommentId provided, validate it exists and check depth
if (parentCommentId) {
  const parentComment = await Comment.findById(parentCommentId);
  if (!parentComment) {
    return res.status(404).json({ success: false, error: "Parent comment not found" });
  }
  
  // Check nesting depth (max 3 levels)
  const depth = await getCommentDepth(parentCommentId);
  if (depth >= 3) {
    return res.status(400).json({ 
      success: false, 
      error: "Maximum nesting depth reached" 
    });
  }
}

// Create comment
const comment = await Comment.create({
  postId,
  userId,
  content,
  parentCommentId: parentCommentId || null
});

// Increment commentsCount on post
await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

// Populate author
await comment.populate("userId", "username firstName lastName avatarUrl");

return res.json({ success: true, data: comment });

// Helper function to get comment depth
async function getCommentDepth(commentId) {
  let depth = 0;
  let currentId = commentId;
  
  while (currentId) {
    const comment = await Comment.findById(currentId);
    if (!comment || !comment.parentCommentId) break;
    currentId = comment.parentCommentId;
    depth++;
  }
  
  return depth;
}
```

---

#### 10. Like/Unlike Forum Comment

**POST** `/api/community/forum/comments/{commentId}/like`

**Response:**
```json
{
  "success": true,
  "data": {
    "liked": true,
    "likesCount": 6
  }
}
```

**Backend Logic:** (Similar to post like, but for comments)

---

## Data Models

### Forum Schema

```typescript
interface Forum {
  _id: string; // ObjectId
  title: string; // 3-100 chars
  description: string; // 10-500 chars
  createdBy: string; // ObjectId (admin user)
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean; // Default: true
  postsCount: number; // Cached count
  participantsCount: number; // Unique users who posted
  isCategory?: boolean; // true if top-level category
  categoryId?: string; // ObjectId of parent category
}
```

### Forum Post Schema

```typescript
interface ForumPost {
  _id: string; // ObjectId
  forumId: string; // ObjectId (reference to Forum)
  userId: string; // ObjectId (reference to User)
  content: string; // 1-5000 chars
  embeddedLinks?: Array<{
    url: string; // Valid URL
    title?: string; // Max 200 chars
    description?: string; // Max 500 chars
    thumbnail?: string; // Valid URL
    type: "video" | "article" | "resource" | "other";
  }>; // Max 5 links
  tags?: string[]; // Max 10 tags, each max 50 chars
  createdAt: Date;
  updatedAt: Date;
  likesCount: number; // Cached count
  commentsCount: number; // Cached count
}
```

### Forum Comment Schema

```typescript
interface ForumComment {
  _id: string; // ObjectId
  postId: string; // ObjectId (reference to ForumPost)
  userId: string; // ObjectId (reference to User)
  content: string; // 1-2000 chars
  parentCommentId?: string; // ObjectId (for nested replies, max 3 levels)
  createdAt: Date;
  likesCount: number; // Cached count
}
```

### Like Schema

```typescript
interface Like {
  _id: string; // ObjectId
  userId: string; // ObjectId
  postId?: string; // ObjectId (if liking a post)
  commentId?: string; // ObjectId (if liking a comment)
  type: "post" | "comment";
  createdAt: Date;
}
```

---

## State Management

### Frontend State Flow

```
Global State (Zustand - optional)
    ↓
Component State (useState)
    ↓
Custom Hooks (useForums, useForumPosts)
    ↓
API Service (communityAPI)
```

### State Structure

```typescript
// useForums hook state
{
  categories: Forum[];
  discussions: Forum[];
  selectedCategoryId: string | null;
  categoriesLoading: boolean;
  discussionsLoading: boolean;
  categoriesError: ApiError | null;
  discussionsError: ApiError | null;
}

// useForumPosts hook state
{
  posts: ForumPost[];
  loading: boolean;
  error: ApiError | null;
  hasMore: boolean;
  page: number;
}

// useForumPostComments hook state
{
  comments: ForumComment[];
  loading: boolean;
  error: ApiError | null;
  hasMore: boolean;
  page: number;
}
```

---

## Error Handling

### Frontend Error Handling

```typescript
// API Service (communityAPI.ts)
private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      code: errorData.code || "HTTP_ERROR",
      details: errorData.details
    };
  }
  
  const data = await response.json();
  return {
    success: true,
    data: data?.data || data,
    message: data?.message
  };
}
```

### Backend Error Responses

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "content",
    "message": "Content is required"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `ALREADY_EXISTS`: Resource already exists
- `MAX_DEPTH_REACHED`: Maximum nesting depth reached
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## Real-time Considerations

### WebSocket Events (Optional)

For real-time updates, consider implementing:

```typescript
// Socket.IO events
socket.on("forum:post:created", (post) => {
  // Add post to list
});

socket.on("forum:post:liked", ({ postId, likesCount }) => {
  // Update like count
});

socket.on("forum:comment:created", ({ postId, comment }) => {
  // Add comment to list
  // Update comment count
});
```

### Polling Alternative

If WebSockets aren't available, implement polling:

```typescript
// Poll for new posts every 30 seconds
useEffect(() => {
  const interval = setInterval(() => {
    if (!loading) {
      refresh(); // Reload posts
    }
  }, 30000);
  
  return () => clearInterval(interval);
}, [loading]);
```

---

## Summary

### Frontend Responsibilities

1. **UI Rendering**: Display forums, posts, comments
2. **User Interactions**: Handle clicks, form submissions
3. **State Management**: Manage local state via hooks
4. **Optimistic Updates**: Update UI immediately, sync with server
5. **Error Display**: Show user-friendly error messages
6. **Loading States**: Show loading indicators

### Backend Responsibilities

1. **Data Validation**: Validate all inputs
2. **Authorization**: Check user permissions
3. **Data Persistence**: Store in database
4. **Aggregations**: Calculate counts, percentages
5. **Pagination**: Implement efficient pagination
6. **Error Handling**: Return consistent error format

### Integration Points

1. **Authentication**: JWT token in Authorization header
2. **Response Format**: Consistent `{ success, data, error }` structure
3. **Pagination**: Standard pagination object
4. **User Data**: Populated author/creator objects
5. **Boolean Flags**: `userLiked`, `isMember`, etc.

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Author:** Frontend Team



