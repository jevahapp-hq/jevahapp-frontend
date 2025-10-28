# 🎯 Backend Team Integration Prompt

## Context

The Jevah App frontend is built with React Native (Expo) and TypeScript. We need the backend to align with frontend expectations for seamless integration.

## Key Requirements

### 1. API Response Format

**ALWAYS** return this format for all endpoints:

```json
{
  "success": true,
  "data": <actual_data>,
  "message": "Optional message"
}
```

**Error Response**:

```json
{
  "success": false,
  "message": "Error description here",
  "error": "Optional error details"
}
```

### 2. Authentication

- Return `token` in login/signup responses
- Frontend sends token as: `Authorization: Bearer <token>`
- Return `401` status for expired/invalid tokens
- Token stored in: `AsyncStorage` (React Native's local storage)

### 3. Bible API Endpoints

Frontend expects these exact routes:

- `GET /api/bible/books` - Returns all 66 books
- `GET /api/bible/books/testament/old` - Old Testament
- `GET /api/bible/books/testament/new` - New Testament
- `GET /api/bible/books/:bookName/chapters` - Chapters for book
- `GET /api/bible/books/:bookName/chapters/:chapterNumber/verses` - Verses for chapter

**Response Type for Books**:

```typescript
{
  _id: string;
  name: string;
  testament: "old" | "new";
  chapterCount: number;
  verseCount: number;
}
```

**IMPORTANT**: Currently getting "route not found" on `/api/bible/books` - please verify this endpoint exists and is accessible.

### 4. API Base URL

- **Local**: `http://10.156.136.168:4000` or `EXPO_PUBLIC_API_URL`
- **Production**: `https://jevahapp-backend.onrender.com`

Frontend uses `getApiBaseUrl()` from `app/utils/api.ts` which prioritizes `EXPO_PUBLIC_API_URL` env var.

### 5. HTTP Client Configuration

- **Timeout**: 15 seconds
- **Retry**: 3 attempts with 1s delay
- **Headers**: Automatically adds `Authorization: Bearer <token>` to all requests
- **Platform Header**: Includes `expo-platform` (ios/android)

### 6. CORS Configuration

Allow frontend origins:

- Local Expo: `http://localhost:19006`
- Production: (TBD)

### 7. Error Handling

- Use proper HTTP status codes (200, 400, 401, 404, 500)
- Always include `message` in error response
- Return JSON even for errors (not HTML)

### 8. Pagination

For list endpoints, include:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "hasMore": true
  }
}
```

## Critical Issues to Fix

1. ❌ **Bible API "Route Not Found"**

   - Frontend calls `GET /api/bible/books` but gets route not found
   - Verify endpoint exists at `/api/bible/books`
   - Check if route is registered in backend
   - Ensure no authentication required (or document if it is)

2. ⚠️ **Response Format Consistency**

   - Ensure ALL endpoints return `{ success, data, message }` format
   - Frontend expects this format across all APIs

3. ⚠️ **Token Format**
   - Login/signup must return: `{ success: true, data: { token, user } }`
   - Frontend stores token and auto-injects in headers

## What Frontend Does

1. **Automatic Token Injection**: All requests get `Authorization: Bearer <token>` header
2. **Error Logging**: Logs all API requests with URLs and responses
3. **Fallback Handling**: Bible API has fallback data if backend fails
4. **Retry Logic**: Automatically retries failed requests (3x)

## Service Layer Pattern

Frontend uses service classes for each feature:

- `bibleApiService.ts` - All Bible endpoints
- `authService.ts` - Authentication
- `commentService.ts` - Comments
- etc.

Each service:

1. Uses `getApiBaseUrl()` for base URL
2. Wraps API calls in try/catch
3. Returns typed responses
4. Handles errors consistently

## Testing Checklist

Before deploying, verify:

- [ ] `/api/bible/books` returns all 66 books
- [ ] All endpoints return standard `{ success, data, message }` format
- [ ] Authentication works with `Bearer` token in header
- [ ] CORS allows frontend origins
- [ ] Error responses include proper status codes
- [ ] Pagination works for list endpoints
- [ ] File uploads work for media content
- [ ] WebSocket connections (if any) are documented

## Questions to Answer

1. What is the exact base URL structure? (`/api/*` prefix?)
2. Are Bible endpoints publicly accessible (no auth)?
3. What's the token expiration time?
4. Is there a token refresh endpoint?
5. What file formats are supported for media uploads?
6. Are there any WebSocket endpoints?
7. What's the rate limiting configuration?

## Documentation Needed

Please provide:

1. Complete API endpoint list with request/response examples
2. Authentication flow diagram
3. Error code reference
4. Environment variable documentation
5. CORS configuration details
6. Rate limiting details
7. WebSocket connection details (if applicable)

---

**Reference**: See `FRONTEND_BACKEND_INTEGRATION_GUIDE.md` for complete frontend architecture documentation.
