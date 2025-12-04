# Account & Profile Settings - Complete UI Flow & Backend Integration Specification

## Table of Contents

1. [Overview](#overview)
2. [UI Flow & Design](#ui-flow--design)
3. [Component Architecture](#component-architecture)
4. [API Endpoints Specification](#api-endpoints-specification)
5. [Data Models](#data-models)
6. [Backend Implementation Guide](#backend-implementation-guide)
7. [Frontend Integration Logic](#frontend-integration-logic)
8. [Error Handling](#error-handling)
9. [Testing Checklist](#testing-checklist)

---

## Overview

The Account & Profile Settings screen provides users with a comprehensive view of their profile, content, and analytics. It includes profile management, content browsing (posts, media, videos), and detailed analytics metrics.

### Key Features

- **Profile Display**: Avatar, name, bio, and section
- **Content Tabs**: Posts, Media (images), Videos, Analytics
- **Analytics Metrics**: Posts count, Likes, Live Sessions, Comments, Drafts, Shares
- **Profile Editing**: Edit profile information and bio
- **Logout**: Secure logout functionality

### Current Implementation Status

- ✅ UI Components implemented
- ✅ Tab navigation working
- ⚠️ Name display issue (showing only first name)
- ⚠️ Bio functionality needs API integration
- ⚠️ Content tabs showing placeholder data
- ⚠️ Analytics using hardcoded/default values

---

## UI Flow & Design

### Screen Layout Structure

```
┌─────────────────────────────────────────┐
│  Account Header                         │
│  ┌─────┐  [Name] [Section]  [⚙️][🔔][☰]│
│  │Avatar│                                │
│  └─────┘                                │
├─────────────────────────────────────────┤
│                                         │
│  Profile Summary Section                │
│  ┌─────────────────────────────────┐  │
│  │        [Large Avatar]           │  │
│  │                                 │  │
│  │         [Edit Button]           │  │
│  └─────────────────────────────────┘  │
│                                         │
│         [User First Name]               │
│         [+ Add bio]                     │
│         [Logout Button]                 │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Content Tabs                          │
│  ┌─────┬─────┬─────┬─────┐            │
│  │ 📊  │ 📷  │ ▶️  │ 📈  │            │
│  │Posts│Media│Video│Stats│            │
│  └─────┴─────┴─────┴─────┘            │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│  Content Section (Dynamic)              │
│                                         │
│  Tab 0 (Posts):                         │
│  ┌─────┬─────┬─────┐                   │
│  │ [ ] │ [ ] │ [ ] │                   │
│  │ [ ] │ [ ] │ [ ] │                   │
│  └─────┴─────┴─────┘                   │
│                                         │
│  Tab 1 (Media):                         │
│  ┌─────┬─────┬─────┐                   │
│  │ [ ] │ [ ] │ [ ] │                   │
│  │ [ ] │ [ ] │ [ ] │                   │
│  └─────┴─────┴─────┘                   │
│                                         │
│  Tab 2 (Videos):                        │
│  ┌─────┬─────┬─────┐                   │
│  │ [ ] │ [ ] │ [ ] │                   │
│  │ [ ] │ [ ] │ [ ] │                   │
│  └─────┴─────┴─────┘                   │
│                                         │
│  Tab 3 (Analytics):                     │
│  ┌─────────────────────────────┐       │
│  │ 📚 Posts         1,200      │       │
│  │    Total published posts    │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │ ❤️ Likes         16.8k      │       │
│  │    Number of "Like"         │       │
│  │    engagements on all posts  │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │ 📻 Live Sessions  32        │       │
│  │    Number of times you       │       │
│  │    went Live                 │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │ 💬 Comments       20k       │       │
│  │    Number of "comments"      │       │
│  │    on all posts              │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │ 📝 Drafts         25         │       │
│  │    Unpublished posts         │       │
│  └─────────────────────────────┘       │
│  ┌─────────────────────────────┐       │
│  │ 🔗 Shares         0          │       │
│  │    Number of times people    │       │
│  │    shared your contents      │       │
│  └─────────────────────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

### User Flow Steps

#### Step 1: Screen Load
1. User navigates to Account/Profile Settings
2. Screen loads user profile data
3. Display user avatar (or placeholder with initials)
4. Display user name (currently showing only first name - **needs fix**)
5. Show "+ Add bio" if bio is empty, or display bio if exists
6. Load default tab (Posts - index 0)

#### Step 2: Profile Section Interaction
- **Avatar Click**: Opens profile switch modal (if multiple profiles)
- **Edit Button**: Opens EditProfileSlideOver modal
- **+ Add Bio**: Opens bio editing interface
- **Logout Button**: Shows confirmation alert → Logs out user

#### Step 3: Tab Navigation
- User taps on any tab icon
- Tab highlights (dark background, white icon)
- Content section updates to show:
  - **Posts Tab**: Grid of user's posts (images)
  - **Media Tab**: Grid of user's uploaded images/photos
  - **Videos Tab**: Grid of user's uploaded videos
  - **Analytics Tab**: List of metrics with icons and values

#### Step 4: Content Interaction (Posts/Media/Videos)
- User scrolls through content grid
- Each item is tappable (navigates to detail view)
- Grid layout: 3 columns, responsive spacing

#### Step 5: Analytics View
- User taps Analytics tab
- Metrics displayed in card format:
  - Icon + Label + Value + Description
- Each metric shows:
  - Posts: Total published posts count
  - Likes: Total likes received across all content
  - Live Sessions: Number of live streaming sessions
  - Comments: Total comments received
  - Drafts: Unpublished content count
  - Shares: Total shares of user's content

---

## Component Architecture

### Component Hierarchy

```
AccountScreen
├── AccountHeader
│   ├── Avatar (with fallback)
│   ├── Name + Section
│   └── Action Buttons (Send, Notifications, Menu)
│
├── ProfileSummary
│   ├── Large Avatar
│   ├── Edit Button
│   ├── User Name Display
│   ├── Bio Section (+ Add bio / Bio text)
│   └── Logout Button
│
├── ContentTabs
│   ├── Posts Tab (grid icon)
│   ├── Media Tab (camera icon)
│   ├── Videos Tab (play icon)
│   └── Analytics Tab (stats icon)
│
└── ContentSection
    ├── Posts Grid (when tab 0 selected)
    ├── Media Grid (when tab 1 selected)
    ├── Videos Grid (when tab 2 selected)
    └── Analytics List (when tab 3 selected)
```

### Key Components

#### 1. AccountScreen (Main Container)
**File**: `app/screens/AccountScreen.tsx`

**State Management:**
```typescript
- activeTab: string
- showProfileModal: boolean
- selectedContentTab: number (0-3)
- isEditOpen: boolean
```

**Hooks Used:**
- `useUserProfile()` - User data and profile operations
- `useAccountContent()` - Content and analytics data

#### 2. ProfileSummary
**File**: `app/components/account/ProfileSummary.tsx`

**Props:**
```typescript
{
  user: User;
  getAvatarUrl: (user: User) => string | undefined;
  getFullName: (user: User) => string;
  onEdit: () => void;
  onLogout: () => void;
}
```

**Features:**
- Displays large avatar (96x96px)
- Shows user name (currently only first name - **issue to fix**)
- "+ Add bio" button or bio text
- Logout button with confirmation

#### 3. ContentTabs
**File**: `app/components/account/ContentTabs.tsx`

**Tabs Configuration:**
```typescript
const defaultTabs = [
  { icon: "grid-outline", label: "Posts" },      // Index 0
  { icon: "camera-outline", label: "Media" },    // Index 1
  { icon: "play-outline", label: "Videos" },     // Index 2
  { icon: "stats-chart-outline", label: "Analytics" }, // Index 3
];
```

#### 4. ContentSection
**File**: `app/components/account/ContentSection.tsx`

**Dynamic Rendering:**
- **Tab 0-2**: Grid layout with images/videos
- **Tab 3**: Analytics metrics list

**Analytics Metrics:**
```typescript
{
  icon: "albums-outline",
  label: "Posts",
  value: number | string,
  sub: "Total published posts"
}
```

---

## API Endpoints Specification

### 1. Get User Profile

**Endpoint:** `GET /api/auth/me`

**Authentication:** Required (Bearer token)

**Description:** Retrieves current authenticated user's profile information.

**Request Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "avatar": "https://example.com/avatars/user123.jpg",
    "avatarUpload": "https://example.com/uploads/user123.jpg",
    "bio": "This is my bio text",
    "section": "adult",
    "role": "learner",
    "isProfileComplete": true,
    "isEmailVerified": true,
    "isOnline": false,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Note:** The frontend expects `firstName` and `lastName` to be separate fields. Currently, the name display might be showing only `firstName`. Ensure both fields are returned.

---

### 2. Update User Profile (Including Bio)

**Endpoint:** `PATCH /api/users/me` or `PUT /api/auth/update-profile`

**Authentication:** Required (Bearer token)

**Description:** Updates user profile information including bio.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Updated bio text here",
  "section": "adult"
}
```

**Field Specifications:**
- `firstName` (optional): string, 1-50 characters
- `lastName` (optional): string, 1-50 characters
- `bio` (optional): string, max 500 characters
- `section` (optional): string, enum: "adult" | "youth" | "children"

**Success Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Updated bio text here",
    "updatedAt": "2024-01-15T12:00:00.000Z"
  },
  "message": "Profile updated successfully"
}
```

**Error Responses:**

**400 Bad Request:**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "bio": "Bio must be less than 500 characters"
  }
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

---

### 3. Get User Posts

**Endpoint:** `GET /api/users/{userId}/posts`

**Authentication:** Required (Bearer token)

**Description:** Retrieves paginated list of user's posts.

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page
- `sortBy` (optional, default: "createdAt"): Sort field
- `sortOrder` (optional, default: "desc"): Sort order

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "userId": "507f1f77bcf86cd799439011",
        "content": "Post content text",
        "media": [
          {
            "_id": "507f1f77bcf86cd799439021",
            "url": "https://example.com/media/post1.jpg",
            "type": "image",
            "thumbnail": "https://example.com/media/post1-thumb.jpg"
          }
        ],
        "likesCount": 15,
        "commentsCount": 5,
        "sharesCount": 2,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
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

**Post Object Structure:**
- `_id`: Post ID
- `userId`: User ID who created the post
- `content`: Post text content (optional)
- `media`: Array of media attachments
  - `url`: Media URL
  - `type`: Media type ("image" | "video")
  - `thumbnail`: Thumbnail URL for videos
- `likesCount`: Number of likes
- `commentsCount`: Number of comments
- `sharesCount`: Number of shares
- `createdAt`: Creation timestamp
- `updatedAt`: Update timestamp

---

### 4. Get User Media (Images)

**Endpoint:** `GET /api/users/{userId}/media`

**Authentication:** Required (Bearer token)

**Description:** Retrieves paginated list of user's uploaded images/photos.

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page
- `type` (optional): Filter by type ("image" | "video")

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "media": [
      {
        "_id": "507f1f77bcf86cd799439022",
        "userId": "507f1f77bcf86cd799439011",
        "url": "https://example.com/media/image1.jpg",
        "thumbnail": "https://example.com/media/image1-thumb.jpg",
        "type": "image",
        "width": 1920,
        "height": 1080,
        "size": 524288,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 75,
      "totalPages": 4,
      "hasMore": true
    }
  }
}
```

**Media Object Structure:**
- `_id`: Media ID
- `userId`: User ID who uploaded
- `url`: Full resolution media URL
- `thumbnail`: Thumbnail URL (for grid display)
- `type`: Media type ("image" | "video")
- `width`: Image/video width (pixels)
- `height`: Image/video height (pixels)
- `size`: File size in bytes
- `createdAt`: Upload timestamp

---

### 5. Get User Videos

**Endpoint:** `GET /api/users/{userId}/videos`

**Authentication:** Required (Bearer token)

**Description:** Retrieves paginated list of user's uploaded videos.

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Items per page

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "_id": "507f1f77bcf86cd799439023",
        "userId": "507f1f77bcf86cd799439011",
        "url": "https://example.com/videos/video1.mp4",
        "thumbnail": "https://example.com/videos/video1-thumb.jpg",
        "type": "video",
        "duration": 120,
        "width": 1920,
        "height": 1080,
        "size": 10485760,
        "title": "Video Title",
        "description": "Video description",
        "viewsCount": 150,
        "likesCount": 25,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 32,
      "totalPages": 2,
      "hasMore": true
    }
  }
}
```

**Video Object Structure:**
- `_id`: Video ID
- `userId`: User ID who uploaded
- `url`: Video file URL
- `thumbnail`: Video thumbnail URL (required for grid display)
- `type`: Always "video"
- `duration`: Video duration in seconds
- `width`: Video width (pixels)
- `height`: Video height (pixels)
- `size`: File size in bytes
- `title`: Video title (optional)
- `description`: Video description (optional)
- `viewsCount`: Number of views
- `likesCount`: Number of likes
- `createdAt`: Upload timestamp

---

### 6. Get User Analytics

**Endpoint:** `GET /api/users/{userId}/analytics`

**Authentication:** Required (Bearer token)

**Description:** Retrieves aggregated analytics metrics for the user.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "posts": {
      "total": 1200,
      "published": 1175,
      "drafts": 25
    },
    "likes": {
      "total": 16800,
      "received": 16800
    },
    "liveSessions": {
      "total": 32,
      "totalDuration": 14400
    },
    "comments": {
      "total": 20000,
      "received": 20000
    },
    "drafts": {
      "total": 25,
      "posts": 20,
      "videos": 5
    },
    "shares": {
      "total": 0,
      "received": 0
    },
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-15T23:59:59.000Z"
    }
  }
}
```

**Analytics Object Structure:**
- `posts`: Post-related metrics
  - `total`: Total posts count
  - `published`: Published posts count
  - `drafts`: Draft posts count
- `likes`: Like metrics
  - `total`: Total likes received
  - `received`: Same as total (for consistency)
- `liveSessions`: Live streaming metrics
  - `total`: Number of live sessions
  - `totalDuration`: Total duration in seconds
- `comments`: Comment metrics
  - `total`: Total comments received
  - `received`: Same as total
- `drafts`: Draft content metrics
  - `total`: Total drafts
  - `posts`: Draft posts count
  - `videos`: Draft videos count
- `shares`: Share metrics
  - `total`: Total shares received
  - `received`: Same as total
- `period`: Analytics period (optional)

**Note:** The frontend expects these specific field names. Values can be numbers or formatted strings (e.g., "16.8k" for 16800).

---

### 7. Logout

**Endpoint:** `POST /api/auth/logout`

**Authentication:** Required (Bearer token)

**Description:** Logs out the current user and invalidates the session token.

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** The frontend handles token clearing locally. The backend should invalidate the token on the server side.

---

## Data Models

### Frontend Types (TypeScript)

```typescript
// User Profile
interface User {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string | null;
  avatarUpload?: string | null;
  bio?: string;
  section?: string; // "adult" | "youth" | "children"
  role?: string;
  isProfileComplete?: boolean;
  isEmailVerified?: boolean;
  isOnline?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Post
interface Post {
  _id: string;
  userId: string;
  content?: string;
  media: MediaItem[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdAt: string;
  updatedAt: string;
}

// Media Item
interface MediaItem {
  _id: string;
  userId: string;
  url: string;
  thumbnail: string;
  type: "image" | "video";
  width?: number;
  height?: number;
  size?: number;
  duration?: number; // For videos
  title?: string; // For videos
  description?: string; // For videos
  viewsCount?: number; // For videos
  likesCount?: number; // For videos
  createdAt: string;
}

// Analytics
interface UserAnalytics {
  posts: {
    total: number;
    published: number;
    drafts: number;
  };
  likes: {
    total: number;
    received: number;
  };
  liveSessions: {
    total: number;
    totalDuration: number;
  };
  comments: {
    total: number;
    received: number;
  };
  drafts: {
    total: number;
    posts: number;
    videos: number;
  };
  shares: {
    total: number;
    received: number;
  };
  period?: {
    start: string;
    end: string;
  };
}

// API Response Wrapper
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

// Pagination
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}
```

### Backend Schema (Mongoose/Sequelize)

```javascript
// User Schema
const userSchema = new Schema({
  firstName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  avatar: String,
  avatarUpload: String,
  bio: {
    type: String,
    maxlength: 500,
    trim: true
  },
  section: {
    type: String,
    enum: ['adult', 'youth', 'children'],
    default: 'adult'
  },
  role: {
    type: String,
    default: 'learner'
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Post Schema
const postSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    maxlength: 5000,
    trim: true
  },
  media: [{
    url: String,
    type: {
      type: String,
      enum: ['image', 'video']
    },
    thumbnail: String
  }],
  likesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  commentsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  sharesCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Media Schema
const mediaSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: String,
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  width: Number,
  height: Number,
  size: Number,
  duration: Number, // For videos
  title: String, // For videos
  description: String, // For videos
  viewsCount: {
    type: Number,
    default: 0
  },
  likesCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Indexes
userSchema.index({ email: 1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ userId: 1, isPublished: 1 });
mediaSchema.index({ userId: 1, type: 1, createdAt: -1 });
```

---

## Backend Implementation Guide

### 1. User Profile Endpoint

#### GET /api/auth/me

```javascript
// Controller
async getCurrentUser(req, res) {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId)
      .select('-password -__v')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        code: "NOT_FOUND"
      });
    }
    
    // Ensure both firstName and lastName are present
    const userResponse = {
      ...user,
      id: user._id.toString(),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      bio: user.bio || null,
      avatar: user.avatar || null,
      avatarUpload: user.avatarUpload || null
    };
    
    res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
}
```

**Key Points:**
- Always return both `firstName` and `lastName` (even if empty strings)
- Return `bio` as `null` if not set (not undefined)
- Include both `avatar` and `avatarUpload` fields
- Use `id` as alias for `_id` for frontend compatibility

---

### 2. Update Profile Endpoint

#### PATCH /api/users/me

```javascript
// Controller
async updateProfile(req, res) {
  try {
    const userId = req.user._id;
    const updates = req.body;
    
    // Validation
    const allowedFields = ['firstName', 'lastName', 'bio', 'section'];
    const updateData = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'bio' && updates[field] && updates[field].length > 500) {
          return res.status(400).json({
            success: false,
            error: "Bio must be less than 500 characters",
            code: "VALIDATION_ERROR"
          });
        }
        updateData[field] = updates[field];
      }
    }
    
    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        code: "NOT_FOUND"
      });
    }
    
    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        bio: user.bio,
        section: user.section,
        updatedAt: user.updatedAt
      },
      message: "Profile updated successfully"
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
}
```

---

### 3. Get User Posts Endpoint

#### GET /api/users/:userId/posts

```javascript
// Controller
async getUserPosts(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    // Authorization: Users can only view their own posts
    if (userId !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: "You can only view your own posts",
        code: "FORBIDDEN"
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Build query
    const query = { userId: userId };
    
    // Get posts
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count
    const total = await Post.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        posts: posts.map(post => ({
          _id: post._id,
          userId: post.userId,
          content: post.content,
          media: post.media || [],
          likesCount: post.likesCount || 0,
          commentsCount: post.commentsCount || 0,
          sharesCount: post.sharesCount || 0,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + posts.length < total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user posts:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
}
```

---

### 4. Get User Media Endpoint

#### GET /api/users/:userId/media

```javascript
// Controller
async getUserMedia(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    // Authorization
    if (userId !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: "You can only view your own media",
        code: "FORBIDDEN"
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type; // "image" or "video"
    
    // Build query
    const query = { userId: userId };
    if (type) {
      query.type = type;
    }
    
    // Get media
    const media = await Media.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count
    const total = await Media.countDocuments(query);
    
    res.status(200).json({
      success: true,
      data: {
        media: media.map(item => ({
          _id: item._id,
          userId: item.userId,
          url: item.url,
          thumbnail: item.thumbnail || item.url,
          type: item.type,
          width: item.width,
          height: item.height,
          size: item.size,
          duration: item.duration,
          createdAt: item.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + media.length < total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user media:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
}
```

---

### 5. Get User Videos Endpoint

#### GET /api/users/:userId/videos

```javascript
// Controller
async getUserVideos(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    // Authorization
    if (userId !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: "You can only view your own videos",
        code: "FORBIDDEN"
      });
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // Get videos (type = "video")
    const videos = await Media.find({
      userId: userId,
      type: "video"
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count
    const total = await Media.countDocuments({
      userId: userId,
      type: "video"
    });
    
    res.status(200).json({
      success: true,
      data: {
        videos: videos.map(video => ({
          _id: video._id,
          userId: video.userId,
          url: video.url,
          thumbnail: video.thumbnail || video.url,
          type: video.type,
          duration: video.duration,
          width: video.width,
          height: video.height,
          size: video.size,
          title: video.title,
          description: video.description,
          viewsCount: video.viewsCount || 0,
          likesCount: video.likesCount || 0,
          createdAt: video.createdAt
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + videos.length < total
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user videos:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
}
```

---

### 6. Get User Analytics Endpoint

#### GET /api/users/:userId/analytics

```javascript
// Controller
async getUserAnalytics(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    // Authorization
    if (userId !== currentUserId.toString()) {
      return res.status(403).json({
        success: false,
        error: "You can only view your own analytics",
        code: "FORBIDDEN"
      });
    }
    
    // Aggregate analytics data
    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      totalLikes,
      totalComments,
      totalShares,
      liveSessions,
      draftPostsCount,
      draftVideosCount
    ] = await Promise.all([
      // Total posts
      Post.countDocuments({ userId }),
      // Published posts
      Post.countDocuments({ userId, isPublished: true }),
      // Draft posts
      Post.countDocuments({ userId, isPublished: false }),
      // Total likes received (aggregate from likes collection or post likesCount)
      Post.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: "$likesCount" } } }
      ]).then(result => result[0]?.total || 0),
      // Total comments received
      Post.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: "$commentsCount" } } }
      ]).then(result => result[0]?.total || 0),
      // Total shares received
      Post.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, total: { $sum: "$sharesCount" } } }
      ]).then(result => result[0]?.total || 0),
      // Live sessions count (from live sessions collection)
      LiveSession.countDocuments({ userId }),
      // Draft posts
      Post.countDocuments({ userId, isPublished: false }),
      // Draft videos
      Media.countDocuments({ userId, type: "video", isPublished: false })
    ]);
    
    // Calculate live sessions total duration
    const liveSessionsData = await LiveSession.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, totalDuration: { $sum: "$duration" } } }
    ]);
    const totalDuration = liveSessionsData[0]?.totalDuration || 0;
    
    res.status(200).json({
      success: true,
      data: {
        posts: {
          total: totalPosts,
          published: publishedPosts,
          drafts: draftPosts
        },
        likes: {
          total: totalLikes,
          received: totalLikes
        },
        liveSessions: {
          total: liveSessions,
          totalDuration: totalDuration
        },
        comments: {
          total: totalComments,
          received: totalComments
        },
        drafts: {
          total: draftPostsCount + draftVideosCount,
          posts: draftPostsCount,
          videos: draftVideosCount
        },
        shares: {
          total: totalShares,
          received: totalShares
        }
      }
    });
  } catch (error) {
    console.error("Error fetching user analytics:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR"
    });
  }
}
```

**Note:** Adjust aggregation queries based on your database schema. If you have separate collections for likes, comments, shares, query those instead.

---

## Frontend Integration Logic

### 1. Fix Name Display Issue

**Current Issue:** Only first name is displayed.

**Location:** `app/components/account/ProfileSummary.tsx` and `app/components/account/AccountHeader.tsx`

**Fix:**

```typescript
// In ProfileSummary.tsx, line 79-80
<Text className="text-2xl font-bold text-[#3B3B3B] mb-2">
  {user ? getFullName(user) : "Loading..."}
</Text>

// Ensure getFullName returns both names
// In useUserProfile.ts, line 195-197
const getFullName = (user: User) => {
  const firstName = user.firstName || "";
  const lastName = user.lastName || "";
  return `${firstName} ${lastName}`.trim() || "User";
};
```

**Backend Fix:** Ensure `/api/auth/me` always returns both `firstName` and `lastName` fields (even if empty strings).

---

### 2. Bio Functionality Integration

**Location:** `app/components/account/ProfileSummary.tsx`

**Current Code:**
```typescript
<TouchableOpacity className="mb-2">
  <Text className="text-[#FEA74E] font-medium">+ Add bio</Text>
</TouchableOpacity>
```

**Updated Code:**
```typescript
{user?.bio ? (
  <Text className="text-[#3B3B3B] text-sm mb-2 text-center px-4">
    {user.bio}
  </Text>
) : (
  <TouchableOpacity 
    className="mb-2"
    onPress={() => {
      // Open bio edit modal or navigate to bio edit screen
      Alert.prompt(
        "Add Bio",
        "Enter your bio (max 500 characters)",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: async (bioText) => {
              if (bioText && bioText.length <= 500) {
                try {
                  const response = await apiClient.updateUserProfile({ bio: bioText });
                  if (response.success) {
                    updateUserProfile({ bio: bioText });
                  }
                } catch (error) {
                  Alert.alert("Error", "Failed to update bio");
                }
              } else {
                Alert.alert("Error", "Bio must be less than 500 characters");
              }
            }
          }
        ],
        "plain-text"
      );
    }}
  >
    <Text className="text-[#FEA74E] font-medium">+ Add bio</Text>
  </TouchableOpacity>
)}
```

---

### 3. Content Tabs Data Fetching

**Location:** `app/hooks/useAccountContent.ts`

**Current Implementation:** Placeholder/TODO

**Updated Implementation:**

```typescript
import { useEffect, useState } from "react";
import { apiClient } from "../utils/dataFetching";

type AccountAnalytics = {
  total?: number;
  likes?: number;
  liveSessions?: number;
  comments?: number;
  drafts?: number;
  shares?: number;
};

type UseAccountContentResult = {
  posts: any[];
  media: any[];
  videos: any[];
  analytics: AccountAnalytics;
  loading: boolean;
  error: string | null;
};

export function useAccountContent(): UseAccountContentResult {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AccountAnalytics>({
    total: 0,
    likes: 0,
    liveSessions: 0,
    comments: 0,
    drafts: 0,
    shares: 0,
  });

  useEffect(() => {
    let cancelled = false;
    
    async function loadContent() {
      try {
        setLoading(true);
        setError(null);
        
        // Get user ID from profile
        const userProfile = await apiClient.getUserProfile();
        const userId = userProfile.user._id || userProfile.user.id;
        
        if (!userId) {
          throw new Error("User ID not found");
        }
        
        // Fetch all data in parallel
        const [postsRes, mediaRes, videosRes, analyticsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/users/${userId}/posts?limit=20`),
          fetch(`${API_BASE_URL}/api/users/${userId}/media?type=image&limit=20`),
          fetch(`${API_BASE_URL}/api/users/${userId}/videos?limit=20`),
          fetch(`${API_BASE_URL}/api/users/${userId}/analytics`)
        ]);
        
        if (cancelled) return;
        
        // Parse responses
        const postsData = await postsRes.json();
        const mediaData = await mediaRes.json();
        const videosData = await videosRes.json();
        const analyticsData = await analyticsRes.json();
        
        if (postsData.success) {
          setPosts(postsData.data.posts || []);
        }
        
        if (mediaData.success) {
          setMedia(mediaData.data.media || []);
        }
        
        if (videosData.success) {
          setVideos(videosData.data.videos || []);
        }
        
        if (analyticsData.success) {
          setAnalytics({
            total: analyticsData.data.posts?.total || 0,
            likes: analyticsData.data.likes?.total || 0,
            liveSessions: analyticsData.data.liveSessions?.total || 0,
            comments: analyticsData.data.comments?.total || 0,
            drafts: analyticsData.data.drafts?.total || 0,
            shares: analyticsData.data.shares?.total || 0,
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to load content");
          console.error("Error loading account content:", err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    loadContent();
    
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    posts,
    media,
    videos,
    analytics,
    loading,
    error,
  };
}
```

---

### 4. Content Section Rendering

**Location:** `app/components/account/ContentSection.tsx`

**Update to use real data:**

```typescript
type ContentSectionProps = {
  selectedIndex: number;
  posts?: any[];
  media?: any[];
  videos?: any[];
  analytics?: Analytics;
};

export default function ContentSection({
  selectedIndex,
  posts = [],
  media = [],
  videos = [],
  analytics,
}: ContentSectionProps) {
  // ... existing code ...

  // Render content based on selected tab
  if (selectedIndex === 0) {
    // Posts grid
    return (
      <View className="flex-row flex-wrap justify-between px-4">
        {posts.map((post, index) => (
          <View key={post._id || index} className="w-[32%] mb-2">
            <TouchableOpacity
              onPress={() => {
                // Navigate to post detail
              }}
            >
              <Image
                source={{ uri: post.media?.[0]?.thumbnail || post.media?.[0]?.url }}
                className="w-full aspect-square rounded-lg"
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  }

  if (selectedIndex === 1) {
    // Media grid
    return (
      <View className="flex-row flex-wrap justify-between px-4">
        {media.map((item, index) => (
          <View key={item._id || index} className="w-[32%] mb-2">
            <TouchableOpacity
              onPress={() => {
                // Navigate to media detail
              }}
            >
              <Image
                source={{ uri: item.thumbnail || item.url }}
                className="w-full aspect-square rounded-lg"
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  }

  if (selectedIndex === 2) {
    // Videos grid
    return (
      <View className="flex-row flex-wrap justify-between px-4">
        {videos.map((video, index) => (
          <View key={video._id || index} className="w-[32%] mb-2 relative">
            <TouchableOpacity
              onPress={() => {
                // Navigate to video player
              }}
            >
              <Image
                source={{ uri: video.thumbnail || video.url }}
                className="w-full aspect-square rounded-lg"
                resizeMode="cover"
              />
              <View className="absolute inset-0 items-center justify-center">
                <Ionicons name="play-circle" size={40} color="white" />
              </View>
              {video.duration && (
                <View className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded">
                  <Text className="text-white text-xs">
                    {formatDuration(video.duration)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  }

  // Analytics (selectedIndex === 3)
  // ... existing analytics rendering code ...
}
```

---

## Error Handling

### Frontend Error Handling

```typescript
// In useAccountContent.ts
try {
  // API calls
} catch (err: any) {
  if (err.message?.includes("401") || err.message?.includes("Unauthorized")) {
    // Handle authentication error
    // Redirect to login or refresh token
  } else if (err.message?.includes("403")) {
    // Handle forbidden error
    Alert.alert("Error", "You don't have permission to view this content");
  } else if (err.message?.includes("Network")) {
    // Handle network error
    Alert.alert("Network Error", "Please check your internet connection");
  } else {
    // Generic error
    console.error("Error:", err);
    setError(err.message || "An error occurred");
  }
}
```

### Backend Error Handling

```javascript
// Standard error response format
{
  "success": false,
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    // Optional additional details
  }
}

// Common error codes
- VALIDATION_ERROR
- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- INTERNAL_ERROR
```

---

## Testing Checklist

### Frontend Testing

- [ ] User profile loads correctly
- [ ] Avatar displays (or shows initials fallback)
- [ ] Full name displays (both first and last name)
- [ ] Bio displays when set
- [ ] "+ Add bio" button works
- [ ] Bio editing saves correctly
- [ ] Logout works with confirmation
- [ ] Tab navigation works
- [ ] Posts tab shows user's posts
- [ ] Media tab shows user's images
- [ ] Videos tab shows user's videos
- [ ] Analytics tab shows correct metrics
- [ ] Content grids load and display correctly
- [ ] Pagination works (if implemented)
- [ ] Error handling works for API failures
- [ ] Loading states display correctly

### Backend Testing

- [ ] GET /api/auth/me returns user with firstName and lastName
- [ ] PATCH /api/users/me updates bio correctly
- [ ] GET /api/users/:userId/posts returns paginated posts
- [ ] GET /api/users/:userId/media returns paginated media
- [ ] GET /api/users/:userId/videos returns paginated videos
- [ ] GET /api/users/:userId/analytics returns correct metrics
- [ ] Authorization checks work (users can only view own data)
- [ ] Validation errors return proper status codes
- [ ] Pagination metadata is correct
- [ ] Empty results return empty arrays (not errors)

### Integration Testing

- [ ] End-to-end profile display flow
- [ ] End-to-end bio update flow
- [ ] End-to-end content tabs loading
- [ ] End-to-end analytics display
- [ ] Error scenarios (network, auth, validation)

---

## Summary

This specification provides a complete guide for implementing the Account & Profile Settings screen with seamless frontend-backend integration. Key points:

1. **Name Display Fix**: Ensure backend returns both `firstName` and `lastName`, and frontend displays both
2. **Bio Integration**: Add API endpoint for bio updates and integrate with frontend
3. **Content Tabs**: Implement endpoints for posts, media, videos, and analytics
4. **Analytics**: Aggregate metrics from various sources (posts, likes, comments, etc.)
5. **Error Handling**: Consistent error responses and frontend error handling
6. **Authorization**: Users can only view their own content and analytics

The backend should implement:
- Standardized response formats
- Proper authorization checks
- Pagination for content endpoints
- Aggregated analytics calculations
- Bio field in user schema

The frontend expects:
- Consistent API responses
- Proper error messages
- Pagination support
- Real-time data updates

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Author:** Frontend & Backend Teams

