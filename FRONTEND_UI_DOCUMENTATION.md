# Frontend UI Documentation for Backend Integration

## 🎯 **Overview**

This document provides comprehensive details about the existing frontend UI structure, interaction patterns, and API integration points. The backend engineer should use this to align their architecture with the current frontend implementation.

## 🏗️ **Current Frontend Architecture**

### **Technology Stack**
- **Framework**: React Native with Expo
- **State Management**: Zustand stores
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Font**: Rubik font family (as per user preference)
- **Environment Management**: Dynamic switching between local and production APIs

### **Environment Configuration**
```typescript
// Current API endpoints
Local: http://10.156.136.168:4000
Production: https://jevahapp-backend.onrender.com
```

## 🎨 **UI Components Structure**

### **1. Interaction Buttons Component** (`app/components/InteractionButtons.tsx`)

**Purpose**: Main social interaction component with like, comment, save, and share functionality.

**Current Implementation**:
```typescript
interface InteractionButtonsProps {
  contentId: string;
  contentType: 'video' | 'audio' | 'ebook' | 'sermon' | 'live';
  contentTitle: string;
  contentUrl?: string;
  layout?: 'vertical' | 'horizontal';
  iconSize?: number;
  showCounts?: boolean;
  onCommentPress?: () => void;
}
```

**Features**:
- **Like Button**: Heart icon with red color when liked, outline when not
- **Comment Button**: Chat bubble icon with comment count
- **Save Button**: Bookmark icon with orange color when saved, outline when not
- **Share Button**: Share icon with share count
- **Layout Options**: Vertical (for reels/videos) and horizontal (for feed views)

### **2. Comment Icon Component** (`app/components/CommentIcon.tsx`)

**Purpose**: Dedicated comment interaction component with modal integration.

**Current Implementation**:
```typescript
interface CommentIconProps {
  comments: CommentData[];
  size?: number;
  color?: string;
  showCount?: boolean;
  count?: number;
  layout?: 'horizontal' | 'vertical';
}
```

**Features**:
- Comment count display
- Modal integration for comment viewing
- Flexible layout options

### **3. Media Cards** (Various Components)

**Components**:
- `VideoComponent.tsx` - Video content with interaction buttons
- `SermonComponent.tsx` - Audio content with interaction buttons
- `EbookComponent.tsx` - Ebook content with interaction buttons
- `Allcontent.tsx` - General content display

**Common Features**:
- Right-side interaction buttons (vertical layout)
- Content type indicators
- User verification badges
- Live streaming indicators

## 🔄 **Current API Integration Points**

### **1. Content Interaction API** (`app/utils/contentInteractionAPI.ts`)

**Base Endpoints Currently Used**:
```typescript
// Like functionality
POST /api/interactions/media/{contentId}/like
Body: { contentType: string }

// Save functionality  
POST /api/interactions/media/{contentId}/save
Body: { contentType: string }

// Share functionality
POST /api/interactions/media/{contentId}/share
Body: { contentType: string, shareMethod?: string }

// View tracking
POST /api/interactions/media/{contentId}/view
Body: { contentType: string, duration?: number }

// Save status check
GET /api/interactions/media/{contentId}/saved-status
```

**Response Structure Expected**:
```typescript
// Like response
{
  liked: boolean;
  totalLikes: number;
}

// Save response
{
  saved: boolean;
  totalSaves: number;
}

// Share response
{
  shared: boolean;
  totalShares: number;
}
```

### **2. Content Stats Structure**

**Current Frontend Expects**:
```typescript
interface ContentStats {
  contentId: string;
  likes: number;
  saves: number;
  shares: number;
  views: number;
  comments: number;
  userInteractions: {
    liked: boolean;
    saved: boolean;
    shared: boolean;
    viewed: boolean;
  };
}
```

## 📱 **UI Layout Patterns**

### **1. Vertical Layout (Reels/Videos)**
```
┌─────────────────────────────────┐
│ [Content]                    [❤️] │
│                              [💬] │
│                              [🔖] │
│                              [📤] │
└─────────────────────────────────┘
```

**Used In**:
- Video reels (`app/reels/Reelsviewscroll.tsx`)
- Video cards (`app/categories/VideoComponent.tsx`)
- Audio cards (`app/categories/SermonComponent.tsx`)

### **2. Horizontal Layout (Feed Views)**
```
┌─────────────────────────────────┐
│ [Content]                      │
│ [👁️ 550] [📤 900] [🔖 480] [❤️ 600] │
└─────────────────────────────────┘
```

**Used In**:
- Feed views
- List views
- Search results

### **3. Mini Card Layout (Ebooks)**
```
┌─────────────────────────────────┐
│ [Content]                      │
│ [View Details] [Share] [Save]  │
└─────────────────────────────────┘
```

## 🎨 **Visual Design Specifications**

### **Colors**
```typescript
// Primary interaction colors
Like (Active): #D22A2A (Red)
Save (Active): #FEA74E (Orange)
Comment: #FFFFFF (White)
Share: #FFFFFF (White)

// Inactive states
Inactive: #FFFFFF (White outline)
Text: #FFFFFF (White)
```

### **Typography**
```typescript
// Font family
Primary: 'Rubik-SemiBold'
Secondary: 'Rubik'

// Font sizes
Count text: 10px
Button labels: 10px
```

### **Icon Specifications**
```typescript
// Default sizes
Vertical layout: 30px
Horizontal layout: 16px
Mini cards: 18px

// Icon libraries used
MaterialIcons: favorite, bookmark, visibility
Ionicons: chatbubble, share-outline
AntDesign: sharealt
```

## 🔧 **State Management Integration**

### **1. Interaction Store** (`app/store/useInteractionStore.tsx`)

**Current State Structure**:
```typescript
interface InteractionState {
  contentStats: Record<string, ContentStats>;
  loadingStats: Record<string, boolean>;
  loadingInteraction: Record<string, boolean>;
  comments: Record<string, CommentData[]>;
  savedContent: any[];
}
```

**Key Actions**:
- `toggleLike(contentId, contentType)`
- `toggleSave(contentId, contentType)`
- `recordShare(contentId, contentType, shareMethod)`
- `recordView(contentId, contentType, duration)`
- `addComment(contentId, comment)`

### **2. Library Store Integration**

**Save Functionality**:
- Integrates with local library store
- Syncs with backend save status
- Handles user-specific saved content

## 📊 **Data Flow Architecture**

### **1. Content Loading Flow**
```
1. Component mounts
2. Load content stats from store
3. If no stats, call loadContentStats()
4. API call to backend
5. Update store with response
6. UI re-renders with new data
```

### **2. Interaction Flow**
```
1. User taps interaction button
2. Optimistic UI update (immediate)
3. API call to backend
4. Backend processes interaction
5. Response updates store
6. UI syncs with server state
```

### **3. Error Handling Flow**
```
1. API call fails
2. Fallback to local storage
3. Show error alert to user
4. Revert optimistic update
5. Retry mechanism available
```

## 🎯 **Backend Integration Requirements**

### **1. Required Endpoints**

**Content Interactions**:
```typescript
// Like/Unlike
POST /api/interactions/media/{contentId}/like
Body: { contentType: string }
Response: { liked: boolean, totalLikes: number }

// Save/Unsave
POST /api/interactions/media/{contentId}/save
Body: { contentType: string }
Response: { saved: boolean, totalSaves: number }

// Share
POST /api/interactions/media/{contentId}/share
Body: { contentType: string, shareMethod?: string }
Response: { shared: boolean, totalShares: number }

// View tracking
POST /api/interactions/media/{contentId}/view
Body: { contentType: string, duration?: number }
Response: { viewed: boolean, totalViews: number }
```

**Status Queries**:
```typescript
// Get user interaction status
GET /api/interactions/media/{contentId}/status
Response: {
  liked: boolean,
  saved: boolean,
  shared: boolean,
  viewed: boolean
}

// Get content stats
GET /api/interactions/media/{contentId}/stats
Response: {
  likes: number,
  saves: number,
  shares: number,
  views: number,
  comments: number
}
```

### **2. Response Format Requirements**

**Success Response Structure**:
```typescript
{
  success: boolean;
  message?: string;
  data: {
    // Interaction-specific data
    liked?: boolean;
    saved?: boolean;
    shared?: boolean;
    viewed?: boolean;
    
    // Updated counts
    totalLikes?: number;
    totalSaves?: number;
    totalShares?: number;
    totalViews?: number;
  };
}
```

**Error Response Structure**:
```typescript
{
  success: false;
  error: string;
  message: string;
  statusCode: number;
}
```

### **3. Authentication Requirements**

**Token Format**:
```typescript
Headers: {
  'Authorization': 'Bearer {token}',
  'Content-Type': 'application/json'
}
```

**Token Sources** (in order of priority):
1. `AsyncStorage.getItem('userToken')`
2. `AsyncStorage.getItem('token')`
3. `SecureStore.getItemAsync('jwt')`

## 🚀 **Implementation Guidelines**

### **1. Backend Development Priority**

**Phase 1 - Core Interactions**:
1. Like/Unlike endpoint
2. Save/Unsave endpoint
3. Basic response structure

**Phase 2 - Enhanced Features**:
1. Share tracking
2. View tracking
3. Status queries

**Phase 3 - Optimization**:
1. Batch operations
2. Real-time updates
3. Analytics integration

### **2. Database Schema Considerations**

**Content Table**:
```sql
-- Ensure these fields exist for frontend compatibility
contentId: ObjectId
contentType: String (video|audio|ebook|sermon|live)
title: String
uploadedBy: ObjectId (reference to users)
viewCount: Number
likeCount: Number
commentCount: Number
shareCount: Number
saveCount: Number
isLive: Boolean
createdAt: Date
```

**User Interactions Table**:
```sql
-- Track individual user interactions
userId: ObjectId
contentId: ObjectId
interactionType: String (like|save|share|view)
timestamp: Date
metadata: Object (platform, duration, etc.)
```

### **3. Performance Considerations**

**Caching Strategy**:
- Cache content stats for 5-10 minutes
- Cache user interaction status for 1-2 minutes
- Implement batch loading for multiple content items

**Database Indexing**:
```sql
-- Recommended indexes
db.content.createIndex({ "contentType": 1, "createdAt": -1 })
db.userInteractions.createIndex({ "userId": 1, "contentId": 1 })
db.userInteractions.createIndex({ "contentId": 1, "interactionType": 1 })
```

## 🔍 **Testing & Validation**

### **1. Frontend Testing Points**

**Interaction Buttons**:
- Verify like/save state persistence
- Check count updates in real-time
- Validate error handling and fallbacks

**Data Synchronization**:
- Ensure UI updates match backend state
- Test offline/online scenarios
- Validate optimistic updates

### **2. Backend Testing Points**

**API Endpoints**:
- Test all CRUD operations
- Validate authentication requirements
- Check response format consistency

**Data Integrity**:
- Verify count accuracy
- Test concurrent interactions
- Validate user permission checks

## 📝 **Migration Notes**

### **1. Current Frontend State**

**Working Features**:
- ✅ Like/Unlike functionality
- ✅ Save/Unsave functionality
- ✅ Comment system integration
- ✅ Share tracking
- ✅ View counting

**Areas for Enhancement**:
- 🔄 Real-time count updates
- 🔄 Batch operations
- 🔄 Offline synchronization
- 🔄 Analytics integration

### **2. Backend Compatibility**

**Immediate Requirements**:
- Match existing endpoint structure
- Maintain current response format
- Support all content types
- Handle authentication properly

**Future Enhancements**:
- WebSocket integration for real-time updates
- Advanced analytics and reporting
- Content recommendation system
- Social features (following, notifications)

## 🎯 **Success Criteria**

### **1. Functional Requirements**
- All interaction buttons work without errors
- Counts update in real-time
- User states persist across sessions
- Error handling graceful and informative

### **2. Performance Requirements**
- Interaction response time < 500ms
- Count updates < 200ms
- Smooth UI animations
- Efficient data loading

### **3. User Experience Requirements**
- Intuitive interaction feedback
- Consistent visual design
- Responsive touch targets
- Accessible interaction patterns

---

**Note**: This documentation reflects the current frontend implementation as of the analysis date. The backend engineer should use this as a reference to ensure compatibility while implementing the required endpoints and data structures.

