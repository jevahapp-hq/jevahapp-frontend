# Community Feature Backend Implementation Guide

## Overview

This document outlines the complete backend implementation requirements for the Jevah Community feature, including Prayer Wall, Forum, Polls/Surveys, and Groups functionality.

## Table of Contents

1. [Database Schema](#database-schema)
2. [API Endpoints](#api-endpoints)
3. [Authentication & Authorization](#authentication--authorization)
4. [Prayer Wall System](#prayer-wall-system)
5. [Forum System](#forum-system)
6. [Polls & Surveys System](#polls--surveys-system)
7. [Groups System](#groups-system)
8. [Real-time Features](#real-time-features)
9. [File Upload System](#file-upload-system)
10. [Search & Filtering](#search--filtering)
11. [Notification System](#notification-system)
12. [Implementation Priority](#implementation-priority)

---

## Database Schema

### Core Tables

#### Users Table (Existing)

```sql
-- Extend existing users table with community-specific fields
ALTER TABLE users ADD COLUMN community_joined_at TIMESTAMP;
ALTER TABLE users ADD COLUMN prayer_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN forum_posts_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN groups_count INTEGER DEFAULT 0;
```

#### Prayer Requests Table

```sql
CREATE TABLE prayer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    color VARCHAR(7) NOT NULL, -- Hex color code
    shape VARCHAR(20) NOT NULL, -- 'square', 'circle', 'scalloped', etc.
    is_anonymous BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'answered', 'archived'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP NULL,
    prayer_count INTEGER DEFAULT 0, -- Number of people who prayed for this
    comment_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_prayer_requests_user_id ON prayer_requests(user_id);
CREATE INDEX idx_prayer_requests_created_at ON prayer_requests(created_at DESC);
CREATE INDEX idx_prayer_requests_status ON prayer_requests(status);
```

#### Prayer Interactions Table

```sql
CREATE TABLE prayer_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_id UUID REFERENCES prayer_requests(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) NOT NULL, -- 'prayed', 'commented'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(prayer_id, user_id, interaction_type)
);
```

#### Forum Posts Table

```sql
CREATE TABLE forum_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_type VARCHAR(20), -- 'text', 'video', 'image'
    media_url VARCHAR(500),
    media_thumbnail VARCHAR(500),
    media_title VARCHAR(200),
    media_description TEXT,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_forum_posts_user_id ON forum_posts(user_id);
CREATE INDEX idx_forum_posts_created_at ON forum_posts(created_at DESC);
CREATE INDEX idx_forum_posts_is_pinned ON forum_posts(is_pinned);
```

#### Forum Interactions Table

```sql
CREATE TABLE forum_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) NOT NULL, -- 'like', 'comment', 'share'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id, interaction_type)
);
```

#### Polls Table

```sql
CREATE TABLE polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'closed', 'draft'
    total_votes INTEGER DEFAULT 0,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_polls_user_id ON polls(user_id);
CREATE INDEX idx_polls_status ON polls(status);
CREATE INDEX idx_polls_created_at ON polls(created_at DESC);
```

#### Poll Options Table

```sql
CREATE TABLE poll_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    text VARCHAR(200) NOT NULL,
    vote_count INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Poll Votes Table

```sql
CREATE TABLE poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
    option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, user_id)
);
```

#### Groups Table

```sql
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon name for frontend
    color VARCHAR(7), -- Hex color code
    member_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Group Members Table

```sql
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member', -- 'admin', 'moderator', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);
```

---

## API Endpoints

### Base URL Structure

```
/api/v1/community/
```

### Prayer Wall Endpoints

#### Get Prayer Requests

```http
GET /api/v1/community/prayers
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- search: string (optional)
- status: string (optional) - 'active', 'answered', 'archived'
- user_id: UUID (optional) - filter by user
```

**Response:**

```json
{
  "success": true,
  "data": {
    "prayers": [
      {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "name": "ABIDEMI JOHN",
          "avatar": "url"
        },
        "content": "Prayer for my job interview...",
        "color": "#A16CE5",
        "shape": "square",
        "is_anonymous": false,
        "status": "active",
        "prayer_count": 15,
        "comment_count": 3,
        "created_at": "2024-01-15T06:00:00Z",
        "time_display": "6am",
        "date_display": "Today"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### Create Prayer Request

```http
POST /api/v1/community/prayers
Authorization: Bearer <token>

Body:
{
  "content": "Prayer for my job interview today...",
  "color": "#A16CE5",
  "shape": "square",
  "is_anonymous": false
}
```

#### Pray for a Request

```http
POST /api/v1/community/prayers/{prayer_id}/pray
Authorization: Bearer <token>
```

#### Get Prayer Details

```http
GET /api/v1/community/prayers/{prayer_id}
Authorization: Bearer <token>
```

### Forum Endpoints

#### Get Forum Posts

```http
GET /api/v1/community/forum/posts
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- search: string (optional)
- user_id: UUID (optional)
```

#### Create Forum Post

```http
POST /api/v1/community/forum/posts
Authorization: Bearer <token>

Body:
{
  "content": "Post content here...",
  "media_type": "video", // optional
  "media_url": "https://...", // optional
  "media_thumbnail": "https://...", // optional
  "media_title": "Video Title", // optional
  "media_description": "Video description" // optional
}
```

#### Like/Unlike Post

```http
POST /api/v1/community/forum/posts/{post_id}/like
DELETE /api/v1/community/forum/posts/{post_id}/like
Authorization: Bearer <token>
```

### Polls Endpoints

#### Get Polls

```http
GET /api/v1/community/polls
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- status: string (optional) - 'active', 'closed'
```

#### Create Poll

```http
POST /api/v1/community/polls
Authorization: Bearer <token>

Body:
{
  "title": "What is your favorite time to pray?",
  "description": "Help us understand the community's prayer habits",
  "options": [
    "Early morning (5-7 AM)",
    "Mid-morning (8-10 AM)",
    "Evening (6-8 PM)",
    "Late night (9-11 PM)"
  ],
  "expires_at": "2024-02-15T23:59:59Z" // optional
}
```

#### Vote on Poll

```http
POST /api/v1/community/polls/{poll_id}/vote
Authorization: Bearer <token>

Body:
{
  "option_id": "uuid"
}
```

### Groups Endpoints

#### Get Groups

```http
GET /api/v1/community/groups
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- search: string (optional)
- user_id: UUID (optional) - get user's groups
```

#### Create Group

```http
POST /api/v1/community/groups
Authorization: Bearer <token>

Body:
{
  "name": "Gospel Music Trends",
  "description": "Gospel music, Lyrics, songs that elevate your spirit...",
  "icon": "musical-notes",
  "color": "#FF6B6B",
  "is_public": true
}
```

#### Join Group

```http
POST /api/v1/community/groups/{group_id}/join
Authorization: Bearer <token>
```

#### Leave Group

```http
DELETE /api/v1/community/groups/{group_id}/leave
Authorization: Bearer <token>
```

---

## Authentication & Authorization

### JWT Token Requirements

- All community endpoints require valid JWT token
- Token should include user_id, email, and permissions
- Implement rate limiting per user

### Permission Levels

1. **User**: Can create prayers, posts, vote on polls, join groups
2. **Moderator**: Can moderate content, manage group members
3. **Admin**: Full access to all community features

---

## Prayer Wall System

### Features to Implement

#### 1. Prayer Creation Flow

- User writes prayer text (max 500 characters)
- Selects color from predefined palette
- Selects shape from available options
- Option to post anonymously
- Auto-generate time/date display

#### 2. Prayer Display Logic

- Show prayers in chronological order (newest first)
- Implement pagination for performance
- Support search functionality
- Filter by status (active, answered, archived)

#### 3. Prayer Interactions

- "Pray for this" button increments prayer count
- One prayer per user per request (prevent spam)
- Track who prayed for what (for analytics)

#### 4. Prayer Status Management

- Users can mark prayers as "answered"
- Auto-archive old prayers (configurable timeframe)
- Admin can moderate inappropriate content

### Color Palette (Predefined)

```javascript
const availableColors = [
  "#A16CE5", // Purple
  "#1078B2", // Blue
  "#6360DE", // Indigo
  "#DFCC21", // Yellow
  "#FF69B4", // Pink
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Light Blue
];
```

### Shape Types

```javascript
const availableShapes = [
  "rectangle",
  "circle",
  "scalloped",
  "square",
  "square2",
  "square3",
  "square4",
];
```

---

## Forum System

### Features to Implement

#### 1. Post Creation

- Rich text content support
- Media attachment (images, videos)
- Video thumbnail generation
- Content moderation

#### 2. Post Interactions

- Like/Unlike functionality
- Comment system (implement separately)
- Share functionality
- Pin important posts

#### 3. Content Moderation

- Auto-detect inappropriate content
- User reporting system
- Admin moderation tools
- Content filtering

#### 4. Media Handling

- Image upload and optimization
- Video upload and processing
- Thumbnail generation
- CDN integration for media delivery

---

## Polls & Surveys System

### Features to Implement

#### 1. Poll Creation

- Multiple choice questions
- Option to set expiration date
- Real-time vote counting
- Percentage calculations

#### 2. Voting System

- One vote per user per poll
- Prevent vote changing (or allow with audit trail)
- Real-time results update
- Anonymous voting option

#### 3. Poll Management

- Draft, active, closed states
- Auto-close expired polls
- Poll analytics and insights
- Export poll results

---

## Groups System

### Features to Implement

#### 1. Group Management

- Public and private groups
- Group creation and customization
- Member management (admin, moderator, member roles)
- Group discovery and search

#### 2. Group Activities

- Group-specific prayers
- Group discussions
- Group polls
- Group events

#### 3. Group Analytics

- Member growth tracking
- Activity metrics
- Popular groups
- Group recommendations

---

## Real-time Features

### WebSocket Implementation

```javascript
// WebSocket events for real-time updates
const events = {
  // Prayer Wall
  "prayer:created": "New prayer posted",
  "prayer:prayed": "Someone prayed for a request",
  "prayer:answered": "Prayer marked as answered",

  // Forum
  "forum:post_created": "New forum post",
  "forum:post_liked": "Post liked/unliked",
  "forum:comment_added": "New comment on post",

  // Polls
  "poll:created": "New poll created",
  "poll:voted": "New vote cast",
  "poll:closed": "Poll closed",

  // Groups
  "group:joined": "User joined group",
  "group:left": "User left group",
  "group:post_created": "New group post",
};
```

### Implementation Priority

1. **High Priority**: Prayer count updates, new prayer notifications
2. **Medium Priority**: Forum post likes, poll vote updates
3. **Low Priority**: Group activity notifications

---

## File Upload System

### Requirements

- Support for images (JPEG, PNG, WebP)
- Support for videos (MP4, MOV, AVI)
- File size limits: Images (5MB), Videos (100MB)
- Automatic image optimization
- Video thumbnail generation
- CDN integration

### Upload Endpoints

```http
POST /api/v1/community/upload/image
POST /api/v1/community/upload/video
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "url": "https://cdn.example.com/uploads/image.jpg",
    "thumbnail": "https://cdn.example.com/uploads/thumb_image.jpg",
    "file_id": "uuid"
  }
}
```

---

## Search & Filtering

### Search Implementation

- Full-text search on prayer content
- Search forum posts by content
- Search groups by name/description
- Implement search suggestions
- Search result ranking

### Filtering Options

- Date range filters
- User-specific filters
- Status filters (active, answered, etc.)
- Category filters for groups
- Popularity-based sorting

---

## Notification System

### Notification Types

1. **Prayer Notifications**

   - Someone prayed for your request
   - Your prayer was answered
   - New prayers in your groups

2. **Forum Notifications**

   - Someone liked your post
   - New comment on your post
   - New posts in your groups

3. **Poll Notifications**

   - New poll created
   - Poll results available
   - Poll closing soon

4. **Group Notifications**
   - New member joined
   - New group post
   - Group invitation

### Notification Delivery

- In-app notifications
- Push notifications (mobile)
- Email notifications (optional)
- Real-time WebSocket updates

---

## Implementation Priority

### Phase 1 (MVP - 2 weeks)

1. ✅ Prayer Wall CRUD operations
2. ✅ Basic forum post creation
3. ✅ Simple poll creation and voting
4. ✅ Basic group management
5. ✅ Authentication integration

### Phase 2 (Enhanced Features - 2 weeks)

1. ✅ Real-time updates (WebSocket)
2. ✅ File upload system
3. ✅ Search functionality
4. ✅ Notification system
5. ✅ Content moderation

### Phase 3 (Advanced Features - 2 weeks)

1. ✅ Advanced analytics
2. ✅ Recommendation system
3. ✅ Mobile push notifications
4. ✅ Performance optimization
5. ✅ Advanced moderation tools

---

## Technical Considerations

### Performance

- Implement database indexing
- Use Redis for caching
- Implement pagination for all lists
- Optimize media delivery with CDN
- Use database connection pooling

### Security

- Input validation and sanitization
- Rate limiting per user
- Content moderation and filtering
- Secure file upload handling
- SQL injection prevention

### Scalability

- Horizontal scaling with load balancers
- Database read replicas
- Microservices architecture consideration
- Caching strategy implementation
- Queue system for background jobs

### Monitoring

- API response time monitoring
- Error rate tracking
- User activity analytics
- Database performance monitoring
- Real-time feature usage tracking

---

## Testing Requirements

### Unit Tests

- API endpoint testing
- Database operation testing
- Business logic validation
- Authentication/authorization testing

### Integration Tests

- End-to-end user flows
- Real-time feature testing
- File upload testing
- Search functionality testing

### Performance Tests

- Load testing for high traffic
- Database query optimization
- Real-time feature performance
- Media upload/download testing

---

## Deployment Checklist

### Database

- [ ] Create all required tables
- [ ] Set up proper indexes
- [ ] Configure database backups
- [ ] Set up monitoring

### API

- [ ] Deploy API endpoints
- [ ] Configure rate limiting
- [ ] Set up API documentation
- [ ] Configure CORS settings

### Real-time

- [ ] Deploy WebSocket server
- [ ] Configure Redis for sessions
- [ ] Set up load balancing
- [ ] Configure SSL certificates

### Media

- [ ] Set up CDN
- [ ] Configure file storage
- [ ] Set up image processing
- [ ] Configure video processing

### Monitoring

- [ ] Set up logging
- [ ] Configure error tracking
- [ ] Set up performance monitoring
- [ ] Configure alerting

---

This documentation provides a comprehensive guide for implementing the community features. The backend team should prioritize Phase 1 features for the MVP, then gradually implement the enhanced and advanced features based on user feedback and business requirements.
