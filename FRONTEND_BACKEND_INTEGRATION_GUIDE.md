# 📱 Frontend-Backend Integration Guide

## Complete Frontend Architecture Documentation for Backend Team

---

## 🎯 **Overview**

This document provides a comprehensive overview of the **Jevah App Frontend** architecture, API integration patterns, and how the frontend expects to communicate with the backend. Use this to ensure backend endpoints align with frontend expectations.

---

## 🏗️ **Frontend Technology Stack**

- **Framework**: React Native with Expo Router
- **Language**: TypeScript
- **State Management**: Zustand (global state), React Context (feature-level)
- **HTTP Client**: Axios (with interceptors)
- **Routing**: Expo Router (file-based routing)
- **Authentication**: Clerk (with custom token management)
- **Navigation**: Expo Router Navigation

---

## 📁 **Frontend Project Structure**

```
jevahapp_frontend/
├── app/                          # Main application directory (Expo Router)
│   ├── _layout.tsx              # Root layout with providers
│   ├── index.tsx                # Entry point (Welcome/Auth screen)
│   ├── auth/                    # Authentication flows
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   ├── forgetPassword.tsx
│   │   └── ...
│   ├── categories/              # Main app screens
│   │   ├── HomeScreen.tsx       # Main tab navigation hub
│   │   ├── HomeTabContent.tsx   # Home feed
│   │   ├── VideoComponent.tsx   # Video content view
│   │   ├── SermonComponent.tsx  # Sermon content view
│   │   └── ...
│   ├── screens/                 # Screen components
│   │   ├── BibleScreen.tsx
│   │   ├── CommunityScreen.tsx
│   │   ├── LibraryScreen.tsx
│   │   └── ...
│   ├── components/              # Reusable UI components
│   │   ├── BottomNav.tsx
│   │   ├── Header.tsx
│   │   ├── bible/              # Bible-specific components
│   │   └── ...
│   ├── services/                # API service layer
│   │   ├── bibleApiService.ts
│   │   ├── authService.ts
│   │   ├── commentService.ts
│   │   └── ...
│   ├── store/                   # Zustand global state
│   │   ├── useGlobalVideoStore.tsx
│   │   ├── useMediaStore.tsx
│   │   ├── useLibraryStore.tsx
│   │   └── ...
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Utility functions
│   │   ├── api.ts              # Axios configuration
│   │   ├── environmentManager.ts
│   │   └── ...
│   └── types/                   # TypeScript type definitions
│
└── src/                         # Shared/modular code
    ├── core/
    │   └── api/                # Core API clients
    ├── features/
    │   └── media/              # Media feature modules
    └── shared/
        ├── components/         # Shared UI components
        ├── hooks/              # Shared hooks
        └── types/              # Shared types
```

---

## 🌐 **API Integration Architecture**

### **1. API Base URL Configuration**

The frontend uses a centralized API configuration:

**File**: `app/utils/api.ts`

```typescript
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || environmentManager.getCurrentUrl();

// Function to get API base URL (for use in services)
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
```

**Environment Support**:

- **Local**: `http://10.156.136.168:4000` (or `EXPO_PUBLIC_API_URL`)
- **Production**: `https://jevahapp-backend.onrender.com`

**Priority**: `EXPO_PUBLIC_API_URL` environment variable > Environment Manager default

---

### **2. Axios HTTP Client Setup**

**Location**: `app/utils/api.ts`

**Key Features**:

1. **Automatic Token Injection**: Adds `Authorization: Bearer <token>` to all requests
2. **Request/Response Interceptors**: Handles retries, errors, and token refresh
3. **Timeout**: 15 seconds default
4. **Retry Logic**: 3 retries with 1 second delay on failure
5. **Platform Headers**: Includes `expo-platform` header (ios/android)

**Token Storage**: Uses `AsyncStorage` with fallback keys:

- `token`
- `userToken`
- `authToken`

**Example Request**:

```typescript
import { apiAxios } from "../utils/api";

const response = await apiAxios.get("/api/endpoint");
```

---

### **3. Service Layer Pattern**

Each feature has a dedicated service file that encapsulates all API calls.

**Pattern**:

```typescript
// app/services/bibleApiService.ts
import { getApiBaseUrl } from "../utils/api";

const API_BASE_URL = getApiBaseUrl();

class BibleApiService {
  private async makeRequest<T>(endpoint: string): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    return await response.json();
  }

  async getAllBooks(): Promise<BibleBook[]> {
    const response = await this.makeRequest<BibleBook[]>("/api/bible/books");
    return response.data;
  }
}

export const bibleApiService = new BibleApiService();
```

**Service Files**:

- `app/services/bibleApiService.ts` - Bible endpoints
- `app/services/authService.ts` - Authentication
- `app/services/commentService.ts` - Comments
- `app/services/NotificationService.ts` - Notifications
- ... and more

---

## 📡 **Expected API Response Format**

### **Standard Success Response**

```typescript
{
  success: true,
  data: T,  // The actual data (array, object, etc.)
  message?: string  // Optional success message
}
```

### **Standard Error Response**

```typescript
{
  success: false,
  message: "Error description",
  error?: any  // Optional error details
}
```

### **Pagination Response**

```typescript
{
  success: true,
  data: T[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    hasMore: boolean
  }
}
```

---

## 🔐 **Authentication Flow**

### **Token Management**

1. **Login/Signup**: Backend returns token → Frontend stores in `AsyncStorage`
2. **Request Interceptor**: Automatically adds `Authorization: Bearer <token>` header
3. **Token Refresh**: (If implemented) Frontend expects refresh token endpoint

### **Expected Auth Endpoints**

```typescript
POST /api/auth/login
Body: { email, password }
Response: { success: true, data: { token, user } }

POST /api/auth/signup
Body: { email, password, name, ... }
Response: { success: true, data: { token, user } }

POST /api/auth/forgot-password
Body: { email }
Response: { success: true, message: "Reset link sent" }

POST /api/auth/reset-password
Body: { token, newPassword }
Response: { success: true, message: "Password reset" }
```

---

## 📖 **Bible API Integration**

**Service File**: `app/services/bibleApiService.ts`

**Base URL**: Uses `getApiBaseUrl()` (inherits from environment config)

### **Expected Endpoints** (From backend documentation):

✅ **Books**:

- `GET /api/bible/books` - Get all 66 books
- `GET /api/bible/books/testament/old` - Old Testament books
- `GET /api/bible/books/testament/new` - New Testament books
- `GET /api/bible/books/:bookName` - Specific book

✅ **Chapters**:

- `GET /api/bible/books/:bookName/chapters` - All chapters for book
- `GET /api/bible/books/:bookName/chapters/:chapterNumber` - Specific chapter

✅ **Verses**:

- `GET /api/bible/books/:bookName/chapters/:chapterNumber/verses` - All verses
- `GET /api/bible/books/:bookName/chapters/:chapterNumber/verses/:verseNumber` - Specific verse
- `GET /api/bible/verses/range/:reference` - Verse range (e.g., "John 3:16-18")

✅ **Search**:

- `GET /api/bible/search?q=query&book=bookName&testament=old|new&limit=50&offset=0`

✅ **Daily/Random**:

- `GET /api/bible/verses/daily` - Verse of the day
- `GET /api/bible/verses/random` - Random verse

### **Expected Response Types**

```typescript
BibleBook {
  _id: string;
  name: string;
  testament: "old" | "new";
  chapterCount: number;
  verseCount: number;
}

BibleChapter {
  _id: string;
  bookName: string;
  chapterNumber: number;
  verseCount: number;
}

BibleVerse {
  _id: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  text: string;
}
```

### **Error Handling**

If Bible API fails, frontend has **fallback data** (hardcoded books list) to ensure functionality.

---

## 🎬 **Media/Content API Integration**

### **State Management**

**Main Stores**:

- `useGlobalVideoStore.tsx` - Global video playback state
- `useMediaStore.tsx` - Media content management
- `useLibraryStore.tsx` - User library/saved content
- `useDownloadStore.tsx` - Download management

### **Video Playback Flow**

1. **Global State**: Only one video plays at a time
2. **Imperative Control**: `videoPlayerRegistry` pattern for immediate pause/play
3. **API Integration**: Uses `app/utils/allMediaAPI.ts` for content fetching

### **Expected Media Endpoints**

```typescript
GET /api/media/videos
GET /api/media/sermons
GET /api/media/audio
GET /api/media/live

Response: {
  success: true,
  data: MediaItem[]
}

MediaItem {
  _id: string;
  title: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  contentType: "video" | "sermon" | "audio" | "live";
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  stats: {
    views: number;
    likes: number;
    comments: number;
  };
  createdAt: string;
}
```

---

## 📱 **Navigation Structure**

### **Main Tabs** (Bottom Navigation)

1. **Home** (`HomeTabContent`)
2. **Community** (`CommunityScreen`)
3. **Library** (`LibraryScreen`)
4. **Bible** (`BibleScreen`)

### **File-Based Routing** (Expo Router)

Routes follow file structure:

- `/categories/HomeScreen` → Main app hub
- `/auth/login` → Login screen
- `/reels/Reelsviewscroll` → Reels view
- `/categories/upload` → Upload screen

---

## 🔄 **State Management Patterns**

### **Zustand Stores**

Global state for:

- Video playback across components
- User library/downloads
- Content caching
- User interactions (likes, comments, saves)

**Example Store Structure**:

```typescript
interface GlobalVideoStore {
  playingVideos: Record<string, boolean>;
  showOverlay: Record<string, boolean>;
  playVideoGlobally: (key: string) => void;
  pauseVideo: (key: string) => void;
  videoPlayerRegistry: Map<string, VideoPlayerRef>;
  registerVideoPlayer: (key: string, player: VideoPlayerRef) => void;
}
```

---

## ⚠️ **Error Handling Patterns**

### **1. Network Errors**

Frontend expects:

- HTTP status codes (200, 400, 401, 404, 500, etc.)
- JSON error responses with `message` field
- Timeout handling (15s default)

### **2. Fallback Behavior**

- **Bible API**: Falls back to hardcoded books if API fails
- **Media Content**: Shows error state, allows retry
- **Auth**: Redirects to login on 401

### **3. Console Logging**

Frontend logs extensively:

- `📖 Bible API Request: <url>`
- `✅ Bible API Success: <url>`
- `❌ Bible API Error [status]: <error>`

---

## 🎨 **Component Architecture**

### **Shared Components** (`src/shared/components/`)

- `VideoCard.tsx` - Unified video player component
- `AudioCard.tsx` - Audio player component
- `PlayOverlay.tsx` - Play/pause overlay
- `InteractionButtons.tsx` - Like, comment, save buttons
- `Skeleton/` - Loading skeleton components

### **Feature Components** (`src/features/media/components/`)

- `VideoCard.tsx` - Main video card (consolidated)
- `MusicCard.tsx`
- `EbookCard.tsx`

**DRY Principle**: Single source of truth for each component type

---

## 🧪 **Testing & Development**

### **Environment Variables**

Create `.env.local` for local development:

```
EXPO_PUBLIC_API_URL=http://localhost:4000
```

### **API Testing**

Frontend includes logging for all API requests. Check console for:

- Request URLs
- Response data
- Error details

---

## 🔧 **Backend Recommendations**

### **1. Response Format Consistency**

Ensure all endpoints return:

```typescript
{
  success: boolean,
  data: T,
  message?: string
}
```

### **2. Error Handling**

Return proper HTTP status codes:

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Server Error

Include error message in response:

```json
{
  "success": false,
  "message": "Route not found",
  "error": "Additional error details"
}
```

### **3. CORS Configuration**

Allow frontend origins:

- Local: `http://localhost:19006` (Expo dev server)
- Production: Your production frontend URL

### **4. Rate Limiting**

Frontend expects rate limiting and handles 429 responses gracefully.

### **5. Pagination**

For list endpoints, provide pagination:

```typescript
{
  success: true,
  data: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 100,
    hasMore: true
  }
}
```

---

## 📝 **Key Integration Points**

### **1. Bible API**

**Issue**: "Route not found" when selecting "All Books"

**Solution**:

- Ensure `/api/bible/books` endpoint exists and returns all 66 books
- Verify endpoint is publicly accessible (no auth required)
- Check CORS allows frontend origin
- Validate response format matches expected structure

### **2. Media Content**

**Issue**: Videos not loading/playing

**Solution**:

- Ensure `fileUrl` is accessible (CORS, authentication)
- Validate `thumbnailUrl` exists
- Check video format compatibility (HLS, MP4, etc.)
- Verify `stats` object includes all required fields

### **3. Authentication**

**Issue**: Token expiration

**Solution**:

- Implement token refresh endpoint if needed
- Return clear 401 errors with messages
- Support logout endpoint to clear tokens

---

## 🚀 **Quick Reference**

### **API Base URL Function**

```typescript
import { getApiBaseUrl } from "./utils/api";
const API_URL = getApiBaseUrl();
```

### **Making API Calls**

```typescript
// With axios (auto-token injection)
import { apiAxios } from "./utils/api";
const response = await apiAxios.get("/api/endpoint");

// With fetch (manual token)
const token = await AsyncStorage.getItem("token");
const response = await fetch(`${API_URL}/api/endpoint`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### **Standard Service Pattern**

```typescript
class MyService {
  private API_BASE = getApiBaseUrl();

  async getData(): Promise<Data[]> {
    const res = await fetch(`${this.API_BASE}/api/endpoint`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    return json.data;
  }
}
```

---

## 📞 **Contact & Support**

For frontend integration issues:

1. Check console logs for API request/response details
2. Verify API base URL configuration
3. Test endpoints directly (Postman/curl)
4. Check CORS and authentication headers
5. Validate response format matches expected structure

---

## ✅ **Checklist for Backend Integration**

- [ ] All endpoints return standard `{ success, data, message }` format
- [ ] Error responses include HTTP status codes and messages
- [ ] CORS configured for frontend origins
- [ ] Authentication endpoints return `token` in response
- [ ] Token-based auth via `Authorization: Bearer <token>` header
- [ ] Pagination implemented for list endpoints
- [ ] Rate limiting with clear error messages
- [ ] Bible API endpoints match documented structure
- [ ] Media content URLs are accessible (CORS, CDN)
- [ ] File upload endpoints accept multipart/form-data
- [ ] WebSocket endpoints (if any) documented
- [ ] Environment variables documented
- [ ] API documentation up to date

---

**Last Updated**: 2024
**Frontend Version**: React Native + Expo Router
**Backend Version**: Check with backend team
