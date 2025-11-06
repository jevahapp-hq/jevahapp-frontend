# Community Section Backend API Documentation

This document provides comprehensive API endpoint specifications for implementing the Community section features in the JevahApp frontend. The Community section includes four main modules: Prayer Wall, Forum, Groups, and Polls.

---

## Table of Contents

1. [Prayer Wall API](#prayer-wall-api)
2. [Forum API](#forum-api)
3. [Groups API](#groups-api)
4. [Polls API](#polls-api)
5. [Common Response Formats](#common-response-formats)
6. [Authentication](#authentication)
7. [Error Handling](#error-handling)

---

## Authentication

All endpoints require authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

**Note**: The frontend retrieves tokens from AsyncStorage or SecureStore. The backend should validate the token and extract the user ID from it.

---

## Prayer Wall API

### Overview

The Prayer Wall allows users to create prayer requests with customizable card colors and shapes, and search for prayers using AI integration.

### Data Models

#### Prayer Request

```typescript
interface PrayerRequest {
  _id: string;
  userId: string; // User who created the prayer
  prayerText: string; // The prayer content/points
  verse?: {
    text: string; // Bible verse text (optional)
    reference: string; // e.g., "John 3:16"
  };
  color: string; // Hex color code (e.g., "#A16CE5")
  shape: string; // Shape type: "rectangle" | "circle" | "scalloped" | "square" | "square2" | "square3" | "square4"
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  likesCount: number; // Number of likes
  commentsCount: number; // Number of comments
  userLiked?: boolean; // Whether current user liked (populated in responses)
  author: {
    // Populated user info
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}
```

### Endpoints

#### 1. Create Prayer Request

**POST** `/api/community/prayer-wall/create`

**Request Body:**

```json
{
  "prayerText": "Prayer for my job interview today. That I find favour in the sight of the employers",
  "verse": {
    "text": "For I know the plans I have for you...",
    "reference": "Jeremiah 29:11"
  },
  "color": "#A16CE5",
  "shape": "square"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "507f191e810c19729de860ea",
    "prayerText": "Prayer for my job interview today...",
    "verse": {
      "text": "For I know the plans I have for you...",
      "reference": "Jeremiah 29:11"
    },
    "color": "#A16CE5",
    "shape": "square",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "likesCount": 0,
    "commentsCount": 0,
    "userLiked": false,
    "author": {
      "_id": "507f191e810c19729de860ea",
      "username": "abidemi_john",
      "firstName": "Abidemi",
      "lastName": "John",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  }
}
```

**Validation Rules:**

- `prayerText`: Required, string, min 1 character, max 2000 characters
- `verse`: Optional object with `text` (string) and `reference` (string)
- `color`: Required, string, must be valid hex color code
- `shape`: Required, string, must be one of: "rectangle", "circle", "scalloped", "square", "square2", "square3", "square4"

---

#### 2. Get Prayer Requests (Paginated)

**GET** `/api/community/prayer-wall`

**Query Parameters:**

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page
- `sortBy` (optional, default: "createdAt"): Sort field - "createdAt" | "likesCount" | "commentsCount"
- `sortOrder` (optional, default: "desc"): Sort order - "asc" | "desc"

**Response:**

```json
{
  "success": true,
  "data": {
    "prayers": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "userId": "507f191e810c19729de860ea",
        "prayerText": "Prayer for my job interview...",
        "verse": {
          "text": "For I know the plans...",
          "reference": "Jeremiah 29:11"
        },
        "color": "#A16CE5",
        "shape": "square",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "likesCount": 5,
        "commentsCount": 2,
        "userLiked": false,
        "author": {
          "_id": "507f191e810c19729de860ea",
          "username": "abidemi_john",
          "firstName": "Abidemi",
          "lastName": "John",
          "avatarUrl": "https://example.com/avatar.jpg"
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

---

#### 3. Search Prayer Requests (AI-Enhanced)

**GET** `/api/community/prayer-wall/search`

**Query Parameters:**

- `query` (required): Search query (words or sentences)
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Description:**
This endpoint uses AI integration (already available in the backend) to search prayers by:

- Keywords in prayer text
- Semantic meaning (sentence-based search)
- Verse references
- Contextual understanding

**Response:**

```json
{
  "success": true,
  "data": {
    "prayers": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "prayerText": "Prayer for my job interview...",
        "verse": {
          "text": "For I know the plans...",
          "reference": "Jeremiah 29:11"
        },
        "color": "#A16CE5",
        "shape": "square",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "likesCount": 5,
        "commentsCount": 2,
        "userLiked": false,
        "author": {
          "_id": "507f191e810c19729de860ea",
          "username": "abidemi_john",
          "avatarUrl": "https://example.com/avatar.jpg"
        },
        "relevanceScore": 0.95
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2,
      "hasMore": true
    }
  }
}
```

**AI Integration Notes:**

- Use existing AI/ML service to analyze query intent
- Perform semantic search on prayer text
- Consider verse references and context
- Return relevance scores for ranking

---

#### 4. Like/Unlike Prayer Request

**POST** `/api/community/prayer-wall/{prayerId}/like`

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

---

#### 5. Get Prayer Comments

**GET** `/api/community/prayer-wall/{prayerId}/comments`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response:**

```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "userId": "507f191e810c19729de860eb",
        "content": "Praying with you! 🙏",
        "createdAt": "2024-01-15T11:00:00.000Z",
        "likesCount": 3,
        "userLiked": false,
        "author": {
          "_id": "507f191e810c19729de860eb",
          "username": "user123",
          "avatarUrl": "https://example.com/avatar2.jpg"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

---

#### 6. Add Comment to Prayer

**POST** `/api/community/prayer-wall/{prayerId}/comments`

**Request Body:**

```json
{
  "content": "Praying with you! 🙏"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "userId": "507f191e810c19729de860eb",
    "content": "Praying with you! 🙏",
    "createdAt": "2024-01-15T11:00:00.000Z",
    "likesCount": 0,
    "userLiked": false,
    "author": {
      "_id": "507f191e810c19729de860eb",
      "username": "user123",
      "avatarUrl": "https://example.com/avatar2.jpg"
    }
  }
}
```

---

#### 7. Update Prayer Request

**PUT** `/api/community/prayer-wall/{prayerId}`

**Request Body:** (All fields optional - only send fields to update)

```json
{
  "prayerText": "Updated prayer text...",
  "color": "#1078B2",
  "shape": "circle"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "prayerText": "Updated prayer text...",
    "color": "#1078B2",
    "shape": "circle",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

**Authorization:** Only the creator can update their prayer.

---

#### 8. Delete Prayer Request

**DELETE** `/api/community/prayer-wall/{prayerId}`

**Response:**

```json
{
  "success": true,
  "message": "Prayer request deleted successfully"
}
```

**Authorization:** Only the creator can delete their prayer.

---

## Forum API

### Overview

The Forum allows admins to create forum topics, and users can create conversation threads (posts) with embedded links, like posts, and comment on them.

### Data Models

#### Forum

```typescript
interface Forum {
  _id: string;
  title: string; // Forum title
  description: string; // Forum description
  createdBy: string; // Admin user ID
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  postsCount: number; // Total number of posts
  participantsCount: number; // Number of unique users who posted
}
```

#### Forum Post (Conversation Thread)

```typescript
interface ForumPost {
  _id: string;
  forumId: string; // Reference to Forum
  userId: string; // User who created the post
  content: string; // Post content/text
  embeddedLinks?: Array<{
    // Optional embedded links
    url: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    type: "video" | "article" | "resource" | "other";
  }>;
  createdAt: string;
  updatedAt: string;
  likesCount: number;
  commentsCount: number;
  userLiked?: boolean;
  author: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
  };
}
```

#### Forum Comment

```typescript
interface ForumComment {
  _id: string;
  postId: string; // Reference to ForumPost
  userId: string;
  content: string;
  parentCommentId?: string; // For nested replies
  createdAt: string;
  likesCount: number;
  userLiked?: boolean;
  replies?: ForumComment[]; // Nested replies
  author: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
}
```

### Endpoints

#### 1. Create Forum (Admin Only)

**POST** `/api/community/forum/create`

**Request Body:**

```json
{
  "title": "General Discussion",
  "description": "A place for community members to share thoughts and engage in discussions"
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
    "participantsCount": 0
  }
}
```

**Authorization:** Requires admin role.

**Validation Rules:**

- `title`: Required, string, min 3 characters, max 100 characters
- `description`: Required, string, min 10 characters, max 500 characters

---

#### 2. Get All Forums

**GET** `/api/community/forum`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)

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
        "createdAt": "2024-01-15T10:00:00.000Z",
        "postsCount": 150,
        "participantsCount": 45
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

---

#### 3. Get Forum Posts (Conversations)

**GET** `/api/community/forum/{forumId}/posts`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `sortBy` (optional, default: "createdAt"): "createdAt" | "likesCount" | "commentsCount"
- `sortOrder` (optional, default: "desc"): "asc" | "desc"

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
        "createdAt": "2024-01-15T10:30:00.000Z",
        "likesCount": 1200,
        "commentsCount": 1200,
        "userLiked": false,
        "author": {
          "_id": "507f191e810c19729de860eb",
          "username": "joseph_eluwa",
          "firstName": "Joseph",
          "lastName": "Eluwa",
          "avatarUrl": "https://example.com/avatar.jpg"
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

---

#### 4. Create Forum Post (Start Conversation)

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
  ]
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
    "embeddedLinks": [
      {
        "url": "https://www.tevah.com/watch?v=0omiX-5T5xk",
        "title": "God is Good by Apostle Emmanuel Iren",
        "description": "Accelerate Conference 2025",
        "thumbnail": "https://example.com/thumb.jpg",
        "type": "video"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "likesCount": 0,
    "commentsCount": 0,
    "userLiked": false,
    "author": {
      "_id": "507f191e810c19729de860eb",
      "username": "joseph_eluwa",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  }
}
```

**Validation Rules:**

- `content`: Required, string, min 1 character, max 5000 characters
- `embeddedLinks`: Optional array, max 5 links per post
  - `url`: Required, must be valid URL
  - `title`: Optional, string, max 200 characters
  - `description`: Optional, string, max 500 characters
  - `thumbnail`: Optional, must be valid URL
  - `type`: Required, one of: "video", "article", "resource", "other"

**Link Embedding Logic:**

- Backend should validate URL format
- Optionally fetch metadata (OG tags) for links if not provided
- Store thumbnail URLs if available
- Validate link accessibility

---

#### 5. Like/Unlike Forum Post

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

---

#### 6. Get Post Comments

**GET** `/api/community/forum/posts/{postId}/comments`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `includeReplies` (optional, default: true): Include nested replies

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

---

#### 7. Add Comment to Post

**POST** `/api/community/forum/posts/{postId}/comments`

**Request Body:**

```json
{
  "content": "Great post! Thanks for sharing.",
  "parentCommentId": null
}
```

**For nested replies:**

```json
{
  "content": "You're welcome!",
  "parentCommentId": "507f1f77bcf86cd799439022"
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

**Validation Rules:**

- `content`: Required, string, min 1 character, max 2000 characters
- `parentCommentId`: Optional, must be valid comment ID if provided
- Maximum nesting depth: 3 levels (comment -> reply -> reply to reply)

**Comment Input Logic:**

- Support multiline text input
- Allow rich text formatting (if needed)
- Sanitize HTML/script tags
- Validate comment length
- Support mention notifications (if needed)

---

#### 8. Like/Unlike Comment

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

---

#### 9. Update Forum Post

**PUT** `/api/community/forum/posts/{postId}`

**Request Body:** (All fields optional)

```json
{
  "content": "Updated post content",
  "embeddedLinks": [...]
}
```

**Authorization:** Only the creator can update their post.

---

#### 10. Delete Forum Post

**DELETE** `/api/community/forum/posts/{postId}`

**Authorization:** Only the creator or admin can delete posts.

---

## Groups API

### Overview

Users can create groups with profile images, names, descriptions, and privacy settings. They can add members to groups.

### Data Models

#### Group

```typescript
interface Group {
  _id: string;
  name: string; // Group name
  description: string; // Group description
  profileImageUrl?: string; // Group profile image URL
  createdBy: string; // User ID of creator
  isPublic: boolean; // Public or private group
  membersCount: number; // Number of members
  createdAt: string;
  updatedAt: string;
  members: Array<{
    // Populated member info
    _id: string;
    userId: string;
    role: "admin" | "member"; // Creator is admin, others are members
    joinedAt: string;
    user: {
      _id: string;
      username: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };
  }>;
  creator: {
    // Populated creator info
    _id: string;
    username: string;
    avatarUrl?: string;
  };
}
```

### Endpoints

#### 1. Create Group

**POST** `/api/community/groups/create`

**Request Body (Form Data):**

```
name: "Gospel Music Trends"
description: "Gospel music, Lyrics, songs that elevate your spirit on a daily basis"
isPublic: true
profileImage: <file> (optional, image file)
```

**Or JSON with base64 image:**

```json
{
  "name": "Gospel Music Trends",
  "description": "Gospel music, Lyrics, songs that elevate your spirit on a daily basis",
  "isPublic": true,
  "profileImage": "data:image/jpeg;base64,/9j/4AAQSkZJRg..." // Optional base64 encoded image
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439030",
    "name": "Gospel Music Trends",
    "description": "Gospel music, Lyrics, songs that elevate your spirit...",
    "profileImageUrl": "https://example.com/group-images/507f1f77bcf86cd799439030.jpg",
    "createdBy": "507f191e810c19729de860ea",
    "isPublic": true,
    "membersCount": 1,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "members": [
      {
        "_id": "507f1f77bcf86cd799439031",
        "userId": "507f191e810c19729de860ea",
        "role": "admin",
        "joinedAt": "2024-01-15T10:00:00.000Z",
        "user": {
          "_id": "507f191e810c19729de860ea",
          "username": "user123",
          "avatarUrl": "https://example.com/avatar.jpg"
        }
      }
    ],
    "creator": {
      "_id": "507f191e810c19729de860ea",
      "username": "user123",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  }
}
```

**Validation Rules:**

- `name`: Required, string, min 3 characters, max 100 characters
- `description`: Required, string, min 10 characters, max 500 characters
- `isPublic`: Required, boolean
- `profileImage`: Optional, must be valid image file (jpg, png, webp), max 5MB
- Image dimensions: Recommended 1:1 aspect ratio (square), min 200x200px

**Image Upload Logic:**

- Accept multipart/form-data or base64 encoded image
- Validate image type and size
- Resize/optimize image if needed
- Store in cloud storage (S3, etc.)
- Return public URL

---

#### 2. Get User's Groups (My Groups)

**GET** `/api/community/groups/my-groups`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)

**Response:**

```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "_id": "507f1f77bcf86cd799439030",
        "name": "Gospel Music Trends",
        "description": "Gospel music, Lyrics...",
        "profileImageUrl": "https://example.com/group-images/507f1f77bcf86cd799439030.jpg",
        "isPublic": true,
        "membersCount": 1900,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "role": "admin",
        "joinedAt": "2024-01-15T10:00:00.000Z"
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

---

#### 3. Explore Public Groups

**GET** `/api/community/groups/explore`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `search` (optional): Search by name or description
- `sortBy` (optional, default: "membersCount"): "membersCount" | "createdAt" | "name"
- `sortOrder` (optional, default: "desc"): "asc" | "desc"

**Response:**

```json
{
  "success": true,
  "data": {
    "groups": [
      {
        "_id": "507f1f77bcf86cd799439030",
        "name": "Gospel Music Trends",
        "description": "Gospel music, Lyrics...",
        "profileImageUrl": "https://example.com/group-images/507f1f77bcf86cd799439030.jpg",
        "isPublic": true,
        "membersCount": 1900,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "creator": {
          "_id": "507f191e810c19729de860ea",
          "username": "user123",
          "avatarUrl": "https://example.com/avatar.jpg"
        },
        "isMember": false
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "totalPages": 3,
      "hasMore": true
    }
  }
}
```

**Note:** Only returns public groups. `isMember` indicates if the current user is already a member.

---

#### 4. Get Group Details

**GET** `/api/community/groups/{groupId}`

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439030",
    "name": "Gospel Music Trends",
    "description": "Gospel music, Lyrics, songs that elevate your spirit...",
    "profileImageUrl": "https://example.com/group-images/507f1f77bcf86cd799439030.jpg",
    "createdBy": "507f191e810c19729de860ea",
    "isPublic": true,
    "membersCount": 1900,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    "members": [
      {
        "_id": "507f1f77bcf86cd799439031",
        "userId": "507f191e810c19729de860ea",
        "role": "admin",
        "joinedAt": "2024-01-15T10:00:00.000Z",
        "user": {
          "_id": "507f191e810c19729de860ea",
          "username": "user123",
          "firstName": "John",
          "lastName": "Doe",
          "avatarUrl": "https://example.com/avatar.jpg"
        }
      }
    ],
    "creator": {
      "_id": "507f191e810c19729de860ea",
      "username": "user123",
      "avatarUrl": "https://example.com/avatar.jpg"
    },
    "isMember": true,
    "userRole": "admin"
  }
}
```

**Authorization:** Private groups only accessible to members.

---

#### 5. Add Members to Group

**POST** `/api/community/groups/{groupId}/members`

**Request Body:**

```json
{
  "userIds": ["507f191e810c19729de860eb", "507f191e810c19729de860ec"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "addedMembers": [
      {
        "_id": "507f1f77bcf86cd799439032",
        "userId": "507f191e810c19729de860eb",
        "role": "member",
        "joinedAt": "2024-01-15T11:00:00.000Z",
        "user": {
          "_id": "507f191e810c19729de860eb",
          "username": "user456",
          "avatarUrl": "https://example.com/avatar2.jpg"
        }
      }
    ],
    "failedUsers": []
  }
}
```

**Authorization:** Only group admins can add members.

**Validation Rules:**

- `userIds`: Required array, max 50 users per request
- Users must exist and not already be members
- For private groups, admins can directly add users
- For public groups, consider allowing join requests

---

#### 6. Join Group (Public Groups)

**POST** `/api/community/groups/{groupId}/join`

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439032",
    "userId": "507f191e810c19729de860eb",
    "groupId": "507f1f77bcf86cd799439030",
    "role": "member",
    "joinedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

**Note:** Only works for public groups. Private groups require admin approval.

---

#### 7. Leave Group

**POST** `/api/community/groups/{groupId}/leave`

**Response:**

```json
{
  "success": true,
  "message": "Left group successfully"
}
```

**Note:** Group creator (admin) cannot leave. Must transfer ownership or delete group.

---

#### 8. Remove Member from Group

**DELETE** `/api/community/groups/{groupId}/members/{userId}`

**Authorization:** Only group admins can remove members (except themselves).

---

#### 9. Update Group

**PUT** `/api/community/groups/{groupId}`

**Request Body:** (All fields optional)

```json
{
  "name": "Updated Group Name",
  "description": "Updated description",
  "isPublic": false,
  "profileImage": "data:image/jpeg;base64,..."
}
```

**Authorization:** Only group admins can update.

---

#### 10. Delete Group

**DELETE** `/api/community/groups/{groupId}`

**Authorization:** Only group creator can delete.

---

## Polls API

### Overview

Admins can create polls with multiple options. Users can vote on polls and see results.

### Data Models

#### Poll

```typescript
interface Poll {
  _id: string;
  title: string; // Poll question/title
  description?: string; // Optional description
  createdBy: string; // Admin user ID
  options: Array<{
    _id: string;
    text: string; // Option text
    votesCount: number; // Number of votes
    percentage: number; // Percentage of total votes (calculated)
  }>;
  totalVotes: number; // Total number of votes
  createdAt: string;
  expiresAt?: string; // Optional expiration date
  isActive: boolean; // Whether poll is still active
  userVoted?: boolean; // Whether current user voted
  userVoteOptionId?: string; // Which option user voted for
  createdByUser: {
    // Populated admin info
    _id: string;
    username: string;
    avatarUrl?: string;
  };
}
```

### Endpoints

#### 1. Create Poll (Admin Only)

**POST** `/api/community/polls/create`

**Request Body:**

```json
{
  "title": "What is your favorite time to pray?",
  "description": "Help us understand the community's prayer habits",
  "options": [
    "Early morning (5-7 AM)",
    "Mid-morning (8-10 AM)",
    "Evening (6-8 PM)",
    "Late night (9-11 PM)"
  ],
  "expiresAt": "2024-02-15T23:59:59.000Z"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439040",
    "title": "What is your favorite time to pray?",
    "description": "Help us understand the community's prayer habits",
    "createdBy": "507f191e810c19729de860ea",
    "options": [
      {
        "_id": "507f1f77bcf86cd799439041",
        "text": "Early morning (5-7 AM)",
        "votesCount": 0,
        "percentage": 0
      },
      {
        "_id": "507f1f77bcf86cd799439042",
        "text": "Mid-morning (8-10 AM)",
        "votesCount": 0,
        "percentage": 0
      },
      {
        "_id": "507f1f77bcf86cd799439043",
        "text": "Evening (6-8 PM)",
        "votesCount": 0,
        "percentage": 0
      },
      {
        "_id": "507f1f77bcf86cd799439044",
        "text": "Late night (9-11 PM)",
        "votesCount": 0,
        "percentage": 0
      }
    ],
    "totalVotes": 0,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "expiresAt": "2024-02-15T23:59:59.000Z",
    "isActive": true,
    "userVoted": false,
    "createdByUser": {
      "_id": "507f191e810c19729de860ea",
      "username": "admin_user",
      "avatarUrl": "https://example.com/avatar.jpg"
    }
  }
}
```

**Validation Rules:**

- `title`: Required, string, min 5 characters, max 200 characters
- `description`: Optional, string, max 500 characters
- `options`: Required array, min 2 options, max 10 options
  - Each option must be a non-empty string, max 200 characters
- `expiresAt`: Optional, must be future date if provided

**Authorization:** Requires admin role.

---

#### 2. Get All Polls

**GET** `/api/community/polls`

**Query Parameters:**

- `page` (optional, default: 1)
- `limit` (optional, default: 20)
- `status` (optional): "active" | "expired" | "all" (default: "active")
- `sortBy` (optional, default: "createdAt"): "createdAt" | "totalVotes"
- `sortOrder` (optional, default: "desc"): "asc" | "desc"

**Response:**

```json
{
  "success": true,
  "data": {
    "polls": [
      {
        "_id": "507f1f77bcf86cd799439040",
        "title": "What is your favorite time to pray?",
        "description": "Help us understand the community's prayer habits",
        "options": [
          {
            "_id": "507f1f77bcf86cd799439041",
            "text": "Early morning (5-7 AM)",
            "votesCount": 89,
            "percentage": 36
          },
          {
            "_id": "507f1f77bcf86cd799439042",
            "text": "Mid-morning (8-10 AM)",
            "votesCount": 67,
            "percentage": 27
          },
          {
            "_id": "507f1f77bcf86cd799439043",
            "text": "Evening (6-8 PM)",
            "votesCount": 54,
            "percentage": 22
          },
          {
            "_id": "507f1f77bcf86cd799439044",
            "text": "Late night (9-11 PM)",
            "votesCount": 35,
            "percentage": 15
          }
        ],
        "totalVotes": 245,
        "createdAt": "2024-01-15T10:00:00.000Z",
        "expiresAt": "2024-02-15T23:59:59.000Z",
        "isActive": true,
        "userVoted": true,
        "userVoteOptionId": "507f1f77bcf86cd799439042",
        "createdByUser": {
          "_id": "507f191e810c19729de860ea",
          "username": "admin_user",
          "avatarUrl": "https://example.com/avatar.jpg"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1,
      "hasMore": false
    }
  }
}
```

**Note:**

- Percentages are calculated server-side based on total votes
- If user hasn't voted, percentages are hidden (return 0) until they vote
- If user has voted, show all percentages
- `isActive` is false if `expiresAt` has passed

---

#### 3. Get Poll Details

**GET** `/api/community/polls/{pollId}`

**Response:** Same structure as poll object in list response.

---

#### 4. Vote on Poll

**POST** `/api/community/polls/{pollId}/vote`

**Request Body:**

```json
{
  "optionId": "507f1f77bcf86cd799439041"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439040",
    "title": "What is your favorite time to pray?",
    "options": [
      {
        "_id": "507f1f77bcf86cd799439041",
        "text": "Early morning (5-7 AM)",
        "votesCount": 90,
        "percentage": 37
      },
      {
        "_id": "507f1f77bcf86cd799439042",
        "text": "Mid-morning (8-10 AM)",
        "votesCount": 67,
        "percentage": 27
      },
      {
        "_id": "507f1f77bcf86cd799439043",
        "text": "Evening (6-8 PM)",
        "votesCount": 54,
        "percentage": 22
      },
      {
        "_id": "507f1f77bcf86cd799439044",
        "text": "Late night (9-11 PM)",
        "votesCount": 35,
        "percentage": 14
      }
    ],
    "totalVotes": 246,
    "userVoted": true,
    "userVoteOptionId": "507f1f77bcf86cd799439041"
  }
}
```

**Validation Rules:**

- `optionId`: Required, must be valid option ID for this poll
- User can only vote once per poll
- Poll must be active (not expired)
- If user tries to vote again, return error or update vote (specify behavior)

**Voting Logic:**

- One vote per user per poll
- Track user's vote in database
- Recalculate percentages after each vote
- Update `totalVotes` count
- If user changes vote, update previous option count

---

#### 5. Update Poll (Admin Only)

**PUT** `/api/community/polls/{pollId}`

**Request Body:** (All fields optional)

```json
{
  "title": "Updated poll title",
  "description": "Updated description",
  "expiresAt": "2024-03-15T23:59:59.000Z",
  "isActive": false
}
```

**Authorization:** Only admin can update polls.

**Note:** Cannot update options after poll is created (to maintain data integrity). Consider allowing option updates only if no votes have been cast.

---

#### 6. Delete Poll (Admin Only)

**DELETE** `/api/community/polls/{pollId}`

**Response:**

```json
{
  "success": true,
  "message": "Poll deleted successfully"
}
```

**Authorization:** Only admin can delete polls.

---

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... } // Optional additional error details
}
```

### Pagination Object

```json
{
  "page": 1,
  "limit": 20,
  "total": 100,
  "totalPages": 5,
  "hasMore": true
}
```

---

## Authentication

All endpoints require authentication. The frontend sends the token in the Authorization header:

```
Authorization: Bearer <token>
```

The backend should:

1. Validate the token
2. Extract user ID from token payload
3. Check user permissions (for admin-only endpoints)
4. Return 401 if token is invalid or expired
5. Return 403 if user doesn't have required permissions

---

## Error Handling

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data/validation error
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User doesn't have permission to perform action
- `404 Not Found`: Resource not found
- `409 Conflict`: Conflict (e.g., user already voted, already a member)
- `500 Internal Server Error`: Server error

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field that caused error",
    "message": "Field-specific error message"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `ALREADY_EXISTS`: Resource already exists (e.g., already voted, already a member)
- `EXPIRED`: Resource has expired (e.g., poll expired)
- `INVALID_IMAGE`: Invalid image file format or size
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## Implementation Notes

### Database Considerations

1. **Indexes**: Create indexes on frequently queried fields:

   - `userId` in prayer requests, forum posts, group members
   - `forumId` in forum posts
   - `postId` in forum comments
   - `groupId` in group members
   - `pollId` in poll votes
   - `createdAt` for sorting

2. **Relationships**: Use proper foreign key relationships and populate user data efficiently.

3. **Caching**: Consider caching for:
   - Popular prayers/posts (with AI search results)
   - Group member lists
   - Poll results (with real-time updates)

### Performance Optimizations

1. **Pagination**: Always implement pagination for list endpoints
2. **Lazy Loading**: Load nested data (comments, replies) on demand
3. **Batch Operations**: Support batch member addition for groups
4. **Image Optimization**: Resize and compress images before storage

### Security Considerations

1. **Input Validation**: Validate and sanitize all user inputs
2. **Authorization Checks**: Verify user permissions for all operations
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **File Upload Security**: Validate file types, sizes, and scan for malware
5. **SQL Injection**: Use parameterized queries
6. **XSS Prevention**: Sanitize user-generated content (especially in comments)

### AI Integration

For the prayer wall search feature:

- Use existing AI/ML service in backend
- Implement semantic search capabilities
- Consider caching search results for common queries
- Return relevance scores for ranking results

### Real-time Updates (Optional)

Consider implementing WebSocket or Server-Sent Events for:

- Real-time poll vote counts
- New comments/posts notifications
- Group member updates

---

## Testing Checklist

- [ ] Create prayer request with all fields
- [ ] Search prayers using AI (words and sentences)
- [ ] Like/unlike prayers
- [ ] Comment on prayers
- [ ] Create forum (admin only)
- [ ] Create forum post with embedded links
- [ ] Like/unlike forum posts
- [ ] Comment on forum posts (with nested replies)
- [ ] Create group with image upload
- [ ] Add members to group
- [ ] Join/leave public groups
- [ ] Create poll (admin only)
- [ ] Vote on poll
- [ ] View poll results with percentages
- [ ] Pagination works correctly
- [ ] Authentication and authorization work
- [ ] Error handling returns proper status codes
- [ ] Image upload and validation work

---

## Frontend Integration Notes

The frontend expects:

- Consistent response format across all endpoints
- User information populated in responses (author, creator, etc.)
- Pagination metadata for list endpoints
- Boolean flags for user interactions (userLiked, userVoted, isMember, etc.)
- Proper error messages for display

---

## Questions or Clarifications

If you need clarification on any endpoint or feature, please refer to the frontend code in:

- `app/screens/PrayerWallScreen.tsx` - Prayer Wall UI
- `app/screens/PostAPrayer.tsx` - Create Prayer UI
- `app/screens/ForumScreen.tsx` - Forum UI
- `app/screens/GroupsScreen.tsx` - Groups UI
- `app/screens/CreateGroupScreen.tsx` - Create Group UI
- `app/screens/PollsScreen.tsx` - Polls UI

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Author:** Frontend Team
