# Unified Search Functionality - Complete Specification

**Version**: 2.0  
**Last Updated**: 2024-12-19  
**Status**: ✅ Backend Implementation Complete  
**Frontend Status**: ✅ Ready for Integration

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [UI Flow & User Experience](#ui-flow--user-experience)
3. [Frontend Implementation](#frontend-implementation)
4. [Backend API Specification](#backend-api-specification)
5. [Search Logic Flow](#search-logic-flow)
6. [Data Structures](#data-structures)
7. [Performance & Optimization](#performance--optimization)
8. [Error Handling](#error-handling)
9. [Search Features](#search-features)
10. [Implementation Checklist](#implementation-checklist)

---

## 🎯 Executive Summary

This document specifies the **complete unified search functionality** that searches across **all content types** on the platform:
- **Media** (videos, music, audio, ebook, podcast, sermon, devotional, etc.)
- **Copyright-free songs** (separate collection)

The backend implementation is **complete** and ready for frontend integration. This document covers UI flow, frontend implementation, backend API details, and the complete logic flow.

### Key Features

1. ✅ **Unified search** - Search across all content types in a single query
2. ✅ **Real-time search** - Search as user types (with debouncing)
3. ✅ **Search history** - Store and display past searches
4. ✅ **Trending searches** - Show popular search terms across all content
5. ✅ **Content type filtering** - Filter by source (media, copyright-free) or specific media type
6. ✅ **Category filtering** - Filter search results by category
7. ✅ **Pagination** - Support for large result sets with breakdown by source
8. ✅ **Multi-field search** - Search across title, artist, description, speaker, category
9. ✅ **User-specific data** - Shows isLiked and isInLibrary status for authenticated users
10. ✅ **Empty states** - Handle no results gracefully
11. ✅ **Loading states** - Show loading indicators during search

---

## 🎨 UI Flow & User Experience

### Search Screen Layout

```
┌─────────────────────────────────────────┐
│  [← Back]  Search Music          [⚙️]  │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │ 🔍 Search songs, artists...     │   │
│  │                                  │   │
│  └─────────────────────────────────┘   │
├─────────────────────────────────────────┤
│                                         │
│  [State 1: Empty State - No Query]     │
│  ┌─────────────────────────────────┐   │
│  │  Recent Searches                 │   │
│  │  • Gospel Music          [×]     │   │
│  │  • Worship Songs         [×]     │   │
│  │  • Traditional Hymns     [×]     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Trending Searches               │   │
│  │  #1  Praise & Worship  (1.2k)   │   │
│  │  #2  Gospel Music      (890)     │   │
│  │  #3  Hymns             (650)     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [State 2: Searching]                  │
│  ┌─────────────────────────────────┐   │
│  │  🔍 Searching...                │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [State 3: Results]                     │
│  ┌─────────────────────────────────┐   │
│  │  Found 45 results for "gospel"    │   │
│  │  Media: 30 | Copyright-free: 15    │   │
│  │                                  │   │
│  │  [Video Card] [Media]            │   │
│  │  [Song Card] [Copyright-free]    │   │
│  │  [Audio Card] [Media]            │   │
│  │  ...                             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [State 4: No Results]                  │
│  ┌─────────────────────────────────┐   │
│  │  😔 No results found             │   │
│  │  Try different keywords          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### User Interaction Flow

```
1. User opens Search Screen
   ↓
2. [Empty State] Shows:
   - Recent searches (if any)
   - Trending searches
   ↓
3. User types in search box
   ↓
4. [Debounce 500ms] Wait for user to stop typing
   ↓
5. [Loading State] Show loading indicator
   ↓
6. Frontend calls backend API
   ↓
7. Backend processes search query
   ↓
8. Backend returns results
   ↓
9. [Results State] Display results:
   - If results found → Show song cards
   - If no results → Show empty state
   ↓
10. User can:
    - Scroll through results
    - Click on a song → Open player
    - Clear search → Return to empty state
    - Select past search → Auto-fill and search
```

### Search States

#### State 1: Empty (No Query)
- **Condition**: `query.trim() === ""`
- **Display**:
  - Search input box (empty)
  - Recent searches list
  - Trending searches list
- **Actions**: User can type or select past search

#### State 2: Searching (Loading)
- **Condition**: `isLoading === true`
- **Display**:
  - Search input box (with query)
  - Loading indicator/spinner
  - "Searching..." message
- **Actions**: None (waiting for results)

#### State 3: Results Found
- **Condition**: `results.length > 0`
- **Display**:
  - Search input box (with query)
  - Result count: "Found X results for 'query'"
  - Song cards list (scrollable)
  - Pagination (if applicable)
- **Actions**: 
  - Scroll to see more
  - Click song to play
  - Clear search to reset

#### State 4: No Results
- **Condition**: `results.length === 0 && !isLoading`
- **Display**:
  - Search input box (with query)
  - Empty state illustration
  - "No results found" message
  - "Try different keywords" suggestion
- **Actions**: 
  - Modify search query
  - Clear search

---

## 💻 Frontend Implementation

### Component Structure

```typescript
// SearchScreen.tsx
interface SearchScreenState {
  query: string;                    // Current search query
  results: Song[];                 // Search results
  isLoading: boolean;               // Loading state
  pastSearches: string[];          // Recent search history
  trendingSearches: TrendingItem[]; // Trending searches
  error: string | null;            // Error message
  page: number;                    // Current page
  hasMore: boolean;                // More results available
  category?: string;                // Selected category filter
}
```

### Search Input Component

```typescript
<TextInput
  placeholder="Search songs, artists..."
  value={query}
  onChangeText={(text) => {
    setQuery(text);
    // Debounce will trigger search automatically
  }}
  onSubmitEditing={() => {
    // Trigger search immediately on submit
    handleSearch(query);
  }}
/>
```

### Debouncing Logic

```typescript
import { useEffect, useRef } from 'react';

const SearchScreen = () => {
  const [query, setQuery] = useState("");
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Don't search if query is empty
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Set loading state
    setIsLoading(true);

    // Debounce: Wait 500ms after user stops typing
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await unifiedSearch(query);
        setResults(results);
      } catch (error) {
        setError("Failed to search content");
      } finally {
        setIsLoading(false);
      }
    }, 500); // 500ms debounce delay

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);
};
```

### Unified Search API Call

```typescript
// app/services/unifiedSearchAPI.ts (or add to existing API service)
async unifiedSearch(
  query: string,
  options: {
    contentType?: "all" | "media" | "copyright-free";
    mediaType?: string;
    category?: string;
    limit?: number;
    page?: number;
    sort?: "relevance" | "popular" | "newest" | "oldest" | "title";
  } = {}
): Promise<UnifiedSearchResponse> {
  const {
    contentType = "all",
    mediaType,
    category,
    limit = 20,
    page = 1,
    sort = "relevance",
  } = options;

  const params = new URLSearchParams({
    q: query.trim(),
    page: page.toString(),
    limit: limit.toString(),
    contentType,
    sort,
  });

  if (mediaType) {
    params.append("mediaType", mediaType);
  }
  if (category) {
    params.append("category", category);
  }

  const token = await TokenUtils.getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(
    `${baseUrl}/api/search?${params.toString()}`,
    {
      method: "GET",
      headers,
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: UnifiedSearchResponse = await response.json();
  return data;
}
```

### Search History Management

```typescript
// Save search to history
const handleSearch = async (searchQuery: string) => {
  if (searchQuery.trim()) {
    try {
      // Save locally
      await addToSearchHistory(searchQuery.trim());
      
      // Optionally send to backend for sync
      await saveSearchToBackend(searchQuery.trim());
      
      // Reload history
      await loadSearchHistory();
    } catch (error) {
      console.error("Failed to save search:", error);
    }
  }
};

// Load search history
const loadSearchHistory = async () => {
  try {
    // Load from local storage
    const localHistory = await getSearchHistory();
    
    // Optionally fetch from backend
    const backendHistory = await fetchSearchHistoryFromBackend();
    
    // Merge and deduplicate
    const merged = [...new Set([...backendHistory, ...localHistory])];
    setPastSearches(merged);
  } catch (error) {
    console.error("Failed to load search history:", error);
  }
};
```

---

## 🔌 Backend API Specification

### Endpoint 1: Unified Search

**URL**: `GET /api/search`

**Method**: `GET`

**Authentication**: Optional (Bearer token for personalized results - adds `isLiked` and `isInLibrary` fields)

**Description**: Search across all content types (Media and Copyright-free songs) in a single query

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | **Yes** | - | Search query (min 1 character) |
| `page` | number | No | `1` | Page number (1-indexed) |
| `limit` | number | No | `20` | Results per page (max: 100) |
| `contentType` | string | No | `"all"` | Filter by source: `"all"`, `"media"`, `"copyright-free"` |
| `mediaType` | string | No | - | Filter Media by contentType: `"videos"`, `"music"`, `"audio"`, `"ebook"`, etc. |
| `category` | string | No | - | Filter by category (applies to Media content) |
| `sort` | string | No | `"relevance"` | Sort order: `"relevance"`, `"popular"`, `"newest"`, `"oldest"`, `"title"` |

**Example Request**:
```
GET /api/search?q=gospel&page=1&limit=20&contentType=all&sort=relevance
Authorization: Bearer {token}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "songs": [
      {
        "id": "692d7baeee2475007039982e",
        "_id": "692d7baeee2475007039982e",
        "title": "In The Name of Jesus",
        "artist": "Tadashikeiji",
        "year": 2024,
        "audioUrl": "https://cdn.jevahapp.com/audio/in-the-name-of-jesus.mp3",
        "thumbnailUrl": "https://cdn.jevahapp.com/images/jesus.webp",
        "category": "Gospel Music",
        "duration": 180,
        "contentType": "copyright-free-music",
        "description": "A powerful gospel song praising the name of Jesus Christ.",
        "speaker": "Tadashikeiji",
        "uploadedBy": "system",
        "createdAt": "2024-01-15T10:00:00Z",
        "viewCount": 1250,
        "views": 1250,
        "likeCount": 89,
        "likes": 89,
        "isLiked": false,
        "isInLibrary": false,
        "isPublicDomain": true
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2,
      "hasMore": true
    },
    "query": "gospel",
    "searchTime": 45
  }
}
```

**Response Fields**:

- `success` (boolean): Always `true` for successful requests
- `data` (object): Response data
  - `songs` (array): Array of song objects matching search query
  - `pagination` (object): Pagination information
    - `page` (number): Current page number
    - `limit` (number): Results per page
    - `total` (number): Total number of results
    - `totalPages` (number): Total number of pages
    - `hasMore` (boolean): Whether more results are available
  - `query` (string): The search query that was processed
  - `searchTime` (number): Search execution time in milliseconds

**Error Responses**:

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Search query is required",
  "code": "BAD_REQUEST"
}
```
**When**: `q` parameter is missing or empty

#### 400 Bad Request - Invalid Parameters
```json
{
  "success": false,
  "error": "Invalid limit. Maximum is 100",
  "code": "BAD_REQUEST"
}
```
**When**: `limit` exceeds maximum (100)

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to perform search",
  "code": "SERVER_ERROR"
}
```

### Endpoint 2: Get Search Suggestions (Optional)

**URL**: `GET /api/audio/copyright-free/search/suggestions`

**Method**: `GET`

**Authentication**: Optional

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | **Yes** | - | Partial search query (min 1 character) |
| `limit` | number | No | `10` | Maximum suggestions to return |

**Example Request**:
```
GET /api/audio/copyright-free/search/suggestions?q=gosp&limit=10
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      "gospel music",
      "gospel worship",
      "gospel hymns",
      "gospel praise"
    ]
  }
}
```

### Endpoint 3: Get Trending Searches (Optional)

**URL**: `GET /api/audio/copyright-free/search/trending`

**Method**: `GET`

**Authentication**: Optional

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | number | No | `10` | Number of trending searches |
| `period` | string | No | `"week"` | Time period: `"day"`, `"week"`, `"month"` |

**Success Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "trending": [
      {
        "query": "praise and worship",
        "count": 1250,
        "category": "Gospel Music"
      },
      {
        "query": "gospel music",
        "count": 890,
        "category": "Gospel Music"
      },
      {
        "query": "hymns",
        "count": 650,
        "category": "Traditional Gospel"
      }
    ]
  }
}
```

---

## 🔄 Search Logic Flow

### Frontend Logic Flow

```
┌─────────────────────────────────────────┐
│  User Types in Search Box              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Update query state                     │
│  setQuery(userInput)                    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  useEffect detects query change         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Check if query is empty                │
│  if (query.trim() === "") {             │
│    Clear results                        │
│    Show empty state                     │
│    return                               │
│  }                                      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Clear previous debounce timer         │
│  Set loading state: isLoading = true    │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Start debounce timer (500ms)           │
│  setTimeout(() => {                     │
│    performSearch()                      │
│  }, 500)                                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  User continues typing?                 │
│  ┌─────────┐      ┌──────────┐         │
│  │   YES   │      │    NO    │         │
│  └────┬────┘      └────┬─────┘         │
│       │                │                │
│       │                ▼                │
│       │    ┌─────────────────────────┐  │
│       │    │  Timer expires          │  │
│       │    │  Call search API        │  │
│       │    └──────────┬──────────────┘  │
│       │               │                  │
│       └───────────────┘                  │
│                                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Call Backend API                       │
│  GET /api/audio/copyright-free/search   │
│  ?q={query}&page=1&limit=20             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Handle Response                        │
│  ┌──────────────┐  ┌──────────────┐    │
│  │   SUCCESS    │  │    ERROR     │    │
│  └──────┬───────┘  └──────┬───────┘    │
│         │                 │             │
│         ▼                 ▼             │
│  ┌──────────────┐  ┌──────────────┐    │
│  │ Update       │  │ Show error   │    │
│  │ results      │  │ message      │    │
│  │ setResults() │  │ setError()   │    │
│  └──────────────┘  └──────────────┘    │
│                                          │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Set loading = false                     │
│  Save search to history                  │
│  Render results                          │
└─────────────────────────────────────────┘
```

### Backend Logic Flow

```
┌─────────────────────────────────────────┐
│  Receive GET /search request            │
│  Extract query parameters               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Validate Request                       │
│  - Check q parameter exists              │
│  - Check q is not empty                 │
│  - Validate page, limit, sort           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Sanitize Query                         │
│  - Trim whitespace                      │
│  - Remove special characters (optional) │
│  - Convert to lowercase                 │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Build Database Query                   │
│  - Search in: title, artist,            │
│    description, category                 │
│  - Apply category filter (if provided)  │
│  - Apply sort order                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Execute Search Query                   │
│  - Use text index (if available)        │
│  - Use regex/contains (fallback)        │
│  - Apply pagination                     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Calculate Relevance (if sort=relevance)│
│  - Title match: highest weight          │
│  - Artist match: medium weight          │
│  - Description match: lower weight       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Apply User-Specific Data (if auth)     │
│  - Add isLiked status                   │
│  - Add isInLibrary status               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Format Response                        │
│  - Transform to frontend format         │
│  - Add pagination metadata              │
│  - Calculate search time                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Return JSON Response                   │
│  { success: true, data: {...} }         │
└─────────────────────────────────────────┘
```

### Database Query Example (MongoDB)

```javascript
// Search query builder
function buildSearchQuery(query, category, userId) {
  const searchTerm = query.trim().toLowerCase();
  
  // Build text search conditions
  const searchConditions = {
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { artist: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { category: { $regex: searchTerm, $options: 'i' } }
    ]
  };
  
  // Add category filter if provided
  if (category) {
    searchConditions.category = category;
  }
  
  // Add user-specific filters if authenticated
  const query = {
    ...searchConditions,
    isPublicDomain: true, // Only show public domain songs
    // Add other filters as needed
  };
  
  return query;
}

// Execute search with pagination
async function searchSongs(query, category, page = 1, limit = 20, sort = 'relevance', userId = null) {
  const searchQuery = buildSearchQuery(query, category, userId);
  
  // Calculate skip for pagination
  const skip = (page - 1) * limit;
  
  // Build sort object
  let sortObject = {};
  switch (sort) {
    case 'relevance':
      // Sort by relevance (title matches first, then artist, then description)
      sortObject = { 
        // MongoDB text search relevance score
        score: { $meta: 'textScore' },
        viewCount: -1 // Secondary sort by popularity
      };
      break;
    case 'popular':
      sortObject = { viewCount: -1, likeCount: -1 };
      break;
    case 'newest':
      sortObject = { createdAt: -1 };
      break;
    case 'oldest':
      sortObject = { createdAt: 1 };
      break;
    case 'title':
      sortObject = { title: 1 };
      break;
    default:
      sortObject = { viewCount: -1 };
  }
  
  // Execute query
  const [songs, total] = await Promise.all([
    Song.find(searchQuery)
      .sort(sortObject)
      .skip(skip)
      .limit(limit)
      .lean(),
    Song.countDocuments(searchQuery)
  ]);
  
  // Add user-specific data if authenticated
  if (userId) {
    const songIds = songs.map(s => s._id);
    const userViews = await View.find({ userId, songId: { $in: songIds } });
    const userLikes = await Like.find({ userId, songId: { $in: songIds } });
    const userLibrary = await Library.find({ userId, songId: { $in: songIds } });
    
    songs.forEach(song => {
      song.isLiked = userLikes.some(l => l.songId.toString() === song._id.toString());
      song.isInLibrary = userLibrary.some(l => l.songId.toString() === song._id.toString());
    });
  }
  
  return {
    songs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total
    }
  };
}
```

---

## 📊 Data Structures

### Frontend Types

```typescript
// Search result song
interface SearchSong {
  id: string;
  _id?: string;
  title: string;
  artist: string;
  year: number;
  audioUrl: string;
  thumbnailUrl: string;
  category: string;
  duration: number;
  contentType: "copyright-free-music";
  description: string;
  speaker?: string;
  uploadedBy: string;
  createdAt: string;
  viewCount: number;
  views?: number; // For compatibility
  likeCount: number;
  likes?: number; // For compatibility
  isLiked: boolean;
  isInLibrary: boolean;
  isPublicDomain: boolean;
}

// Search response
interface SearchResponse {
  success: boolean;
  data: {
    songs: SearchSong[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
    query: string;
    searchTime: number;
  };
}

// Trending search item
interface TrendingSearch {
  query: string;
  count: number;
  category?: string;
}
```

### Backend Database Schema

```javascript
// Song collection (existing)
{
  _id: ObjectId,
  id: String,
  title: String,
  artist: String,
  description: String,
  category: String,
  audioUrl: String,
  thumbnailUrl: String,
  duration: Number,
  viewCount: Number,
  likeCount: Number,
  createdAt: Date,
  // ... other fields
}

// Search index (for full-text search)
db.songs.createIndex({
  title: "text",
  artist: "text",
  description: "text",
  category: "text"
});

// Search history (optional)
{
  _id: ObjectId,
  userId: ObjectId,
  query: String,
  searchedAt: Date,
  resultCount: Number
}

// Trending searches (optional)
{
  _id: ObjectId,
  query: String,
  count: Number,
  category: String,
  period: String, // "day", "week", "month"
  updatedAt: Date
}
```

---

## ⚡ Performance & Optimization

### Frontend Optimizations

1. **Debouncing**: Wait 500ms after user stops typing before searching
2. **Caching**: Cache search results for recent queries
3. **Pagination**: Load results in pages (20 items per page)
4. **Virtual Scrolling**: Use FlatList for large result sets
5. **Request Cancellation**: Cancel previous requests when new search starts

```typescript
// Request cancellation example
const abortControllerRef = useRef<AbortController | null>(null);

useEffect(() => {
  // Cancel previous request
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  // Create new abort controller
  abortControllerRef.current = new AbortController();
  
  // Use in fetch
  fetch(url, { signal: abortControllerRef.current.signal })
    .then(response => response.json())
    .catch(error => {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
      }
    });
}, [query]);
```

### Backend Optimizations

1. **Database Indexes**: Create text indexes for fast search
2. **Query Optimization**: Use efficient regex or text search
3. **Result Limiting**: Always limit results (max 100 per page)
4. **Caching**: Cache popular search queries (Redis)
5. **Connection Pooling**: Use connection pooling for database

```javascript
// MongoDB text index
db.songs.createIndex({
  title: "text",
  artist: "text",
  description: "text"
});

// Redis caching example
const cacheKey = `search:${query}:${category}:${page}`;
const cached = await redis.get(cacheKey);
if (cached) {
  return JSON.parse(cached);
}

const results = await searchSongs(query, category, page);
await redis.setex(cacheKey, 300, JSON.stringify(results)); // 5 min cache
return results;
```

---

## 🚨 Error Handling

### Frontend Error Handling

```typescript
try {
  setIsLoading(true);
  setError(null);
  
  const results = await searchSongs(query);
  setResults(results.data.songs);
} catch (error) {
  if (error.name === 'AbortError') {
    // Request was cancelled, ignore
    return;
  }
  
  setError("Failed to search songs. Please try again.");
  console.error("Search error:", error);
} finally {
  setIsLoading(false);
}
```

### Backend Error Handling

```javascript
// Validate query parameter
if (!query || !query.trim()) {
  return res.status(400).json({
    success: false,
    error: "Search query is required",
    code: "BAD_REQUEST"
  });
}

// Validate limit
if (limit > 100) {
  return res.status(400).json({
    success: false,
    error: "Invalid limit. Maximum is 100",
    code: "BAD_REQUEST"
  });
}

// Handle database errors
try {
  const results = await searchSongs(query, category, page, limit);
  return res.json({
    success: true,
    data: results
  });
} catch (error) {
  console.error("Search error:", error);
  return res.status(500).json({
    success: false,
    error: "Failed to perform search",
    code: "SERVER_ERROR"
  });
}
```

---

## 🔍 Search Features

### 1. Multi-Field Search

Search across multiple fields:
- **Title**: Exact and partial matches
- **Artist**: Exact and partial matches
- **Description**: Keyword matching
- **Category**: Category name matching

**Backend Implementation**:
```javascript
{
  $or: [
    { title: { $regex: query, $options: 'i' } },
    { artist: { $regex: query, $options: 'i' } },
    { description: { $regex: query, $options: 'i' } },
    { category: { $regex: query, $options: 'i' } }
  ]
}
```

### 2. Category Filtering

Filter results by category:
- User selects category from dropdown
- Search is scoped to that category
- Category filter persists during search

### 3. Sort Options

- **Relevance**: Most relevant results first (default)
- **Popular**: Highest view count first
- **Newest**: Most recently added first
- **Oldest**: Oldest songs first
- **Title**: Alphabetical by title

### 4. Search History

- Store last 10-20 searches locally
- Display in empty state
- Allow quick re-search by clicking
- Optionally sync with backend

### 5. Trending Searches

- Show popular search terms
- Update daily/weekly
- Display search count
- Click to search

---

## ✅ Implementation Checklist

### Frontend Tasks

- [ ] Create SearchScreen component
- [ ] Implement search input with debouncing
- [ ] Add loading states
- [ ] Implement empty states
- [ ] Display search results
- [ ] Add search history functionality
- [ ] Add trending searches display
- [ ] Implement pagination
- [ ] Add error handling
- [ ] Add category filtering UI
- [ ] Add sort options UI
- [ ] Test search functionality

### Backend Tasks

- [ ] Implement `GET /api/audio/copyright-free/search` endpoint
- [ ] Add query validation
- [ ] Implement multi-field search logic
- [ ] Add category filtering
- [ ] Implement sort options
- [ ] Add pagination support
- [ ] Create database indexes
- [ ] Add user-specific data (isLiked, isInLibrary)
- [ ] Implement search suggestions endpoint (optional)
- [ ] Implement trending searches endpoint (optional)
- [ ] Add error handling
- [ ] Add caching (optional)
- [ ] Write unit tests
- [ ] Write integration tests

### Database Tasks

- [ ] Create text indexes on searchable fields
- [ ] Create search history collection (optional)
- [ ] Create trending searches collection (optional)
- [ ] Optimize query performance

---

## 📝 Example API Calls

### Example 1: Basic Search

**Request**:
```
GET /api/audio/copyright-free/search?q=gospel
```

**Response**:
```json
{
  "success": true,
  "data": {
    "songs": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25,
      "totalPages": 2,
      "hasMore": true
    },
    "query": "gospel",
    "searchTime": 45
  }
}
```

### Example 2: Search with Category Filter

**Request**:
```
GET /api/audio/copyright-free/search?q=worship&category=Gospel%20Music&page=1&limit=20
```

### Example 3: Search with Sort

**Request**:
```
GET /api/audio/copyright-free/search?q=praise&sort=popular&page=1&limit=20
```

---

## 🔗 Related Documentation

- `COPYRIGHT_FREE_MUSIC_VIEW_TRACKING_BACKEND_SPEC_COMPLETE.md` - View tracking
- `COPYRIGHT_FREE_MUSIC_INTERACTIONS_BACKEND_INTEGRATION.md` - Interactions API
- `BACKEND_AUDIO_LIBRARY_IMPLEMENTATION.md` - General audio library spec

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-19  
**Status**: ✅ Ready for Implementation  
**Frontend Status**: ✅ Partially Implemented

