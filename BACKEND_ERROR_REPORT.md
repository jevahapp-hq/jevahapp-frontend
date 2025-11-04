# Backend Error Report: Comment API 500 Error

## Issue Summary

The frontend is receiving a **500 Internal Server Error** when attempting to add comments. The error originates from the backend API endpoint.

**Status:** Frontend is following the documented API specification correctly. The 500 error indicates a backend server-side issue.

## Error Details

### Error Message

```
HTTP error! status: 500
```

### Where Error Occurs (Backend)

**Endpoint:** `POST /api/content/media/{contentId}/comment`

According to the **Frontend Comment Integration Guide** provided by backend, this endpoint should be fully implemented and working.

### Frontend Request Details

**Method:** `POST`  
**URL Pattern:** `/api/content/{contentType}/{contentId}/comment`  
**Content Type:** `application/json`  
**Authorization:** `Bearer <token>` (includes auth token)

**Request Body Format (matching backend spec):**

```json
{
  "content": "User's comment text here",
  "parentCommentId": "optional-parent-id-for-replies"
}
```

**Actual Frontend Request (from `app/utils/contentInteractionAPI.ts`):**

```typescript
POST ${baseURL}/api/content/${backendContentType}/${contentId}/comment
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
Body: JSON.stringify({
  content: comment,        // ✅ Matches spec
  parentCommentId          // ✅ Optional, undefined/null for top-level
})
```

**Content Type Mapping:**

- Frontend correctly maps types using `mapContentTypeToBackend()`
- Video/Audio → `"media"` ✅
- Devotional → `"devotional"` ✅
- All mappings match backend expectations

### Expected Response (Success Case)

According to the **Frontend Comment Integration Guide**, the response should be:

```json
{
  "success": true,
  "message": "Comment added successfully",
  "data": {
    "_id": "newCommentId",
    "id": "newCommentId",
    "content": "User's comment text here",
    "authorId": "userId456",
    "userId": "userId456",
    "author": {
      "_id": "userId456",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://..."
    },
    "user": {
      "_id": "userId456",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": "https://..."
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "timestamp": "2024-01-15T10:30:00Z",
    "reactionsCount": 0,
    "likes": 0,
    "replyCount": 0,
    "replies": []
  }
}
```

## What to Check on Backend

**Important:** According to the **Frontend Comment Integration Guide** you provided, this endpoint is documented as "✅ Updated & Ready for Frontend Integration". The frontend is following the spec exactly, so this is a backend implementation issue.

### Critical Areas to Investigate:

1. **Endpoint Route Handler**

   - Check the route handler for `POST /api/content/:contentType/:contentId/comment`
   - Verify the route is actually implemented (guide says it should be working)
   - Check if route parameters (`:contentType`, `:contentId`) are being parsed correctly

2. **Request Body Parsing**

   - Ensure `content` field is being parsed correctly from `req.body`
   - Check if `parentCommentId` is handled when `undefined`, `null`, or omitted
   - Verify `body-parser` / JSON parsing middleware is working
   - **Potential issue:** If `parentCommentId` is `undefined`, some parsers may fail

3. **Authentication Middleware**

   - Verify token is being extracted from `Authorization: Bearer <token>` header
   - Check if `req.user` or `req.userId` is being set correctly
   - Ensure token validation errors return 401/403, not 500
   - **Check:** Is user ID being extracted and available for `authorId`?

4. **Database Operations**

   - Check if content ID (`68e583dac69b7b9e04dbfe0d`) exists in database
   - Verify comment insertion query/operation isn't throwing errors
   - Check for database connection issues
   - **Critical:** Verify `authorId` is being set from authenticated user (not from request body)

5. **Content Type Validation**

   - Frontend sends `contentType: "media"` for videos/audio (per guide)
   - Verify backend accepts `"media"` as valid content type
   - Check if content type validation is throwing 500 instead of 400

6. **Unhandled Exceptions**

   - Look for try/catch blocks that might be catching and swallowing errors
   - Check for async/await issues (unhandled promise rejections)
   - Verify Mongoose/model save operations have error handling
   - **Check backend logs for stack traces**

7. **Response Formatting**
   - Ensure response includes all required fields per guide
   - Check if response transformation is causing errors

## Debugging Steps

1. **Check Backend Logs**

   - Look for stack traces related to comment creation
   - Check for database query errors
   - Look for authentication errors

2. **Test Endpoint Directly**

   - Test the endpoint with Postman/curl
   - Use a valid auth token
   - Try with and without `parentCommentId`

3. **Verify Data Types**
   - Ensure `content` is a string
   - Verify `parentCommentId` can be null/undefined for top-level comments
   - Check content ID format matches expected (MongoDB ObjectId format)

## Additional Context

- **Frontend Location:** `app/utils/contentInteractionAPI.ts` (line 672-682)
- **Frontend Action:** `ContentInteractionService.addComment()`
- **Content Types Supported:** `media`, `video`, `audio`, `ebook`, `sermon`, `live`
- **Current Error:** All comment submissions are failing with 500 error

## Expected Behavior

1. Frontend sends POST request with `{ content, parentCommentId }`
2. Backend validates auth token
3. Backend extracts user ID from token
4. Backend creates comment record with:
   - `content` from request body
   - `authorId` from authenticated user
   - `contentId` from URL parameter
   - `parentCommentId` if provided (for replies)
5. Backend returns 200 with created comment object

## Related Documentation

- **Backend Guide:** See the **Frontend Comment Integration Guide** you provided (says endpoint is "✅ Updated & Ready")
- **Frontend Spec:** `BACKEND_COMMENT_IMPLEMENTATION_GUIDE.md`
- **Frontend Code:** `app/utils/contentInteractionAPI.ts` (lines 659-682)

## Verification Checklist

Please verify the backend implementation matches the guide:

- [ ] Route handler exists for `POST /api/content/:contentType/:contentId/comment`
- [ ] Request body parsing accepts `{ content, parentCommentId }`
- [ ] `parentCommentId` is optional (handles `undefined`/`null`)
- [ ] Auth middleware extracts user from Bearer token
- [ ] `authorId` is set from authenticated user (not from body)
- [ ] Content ID validation (MongoDB ObjectId format)
- [ ] Content type `"media"` is accepted for videos/audio
- [ ] Database comment insertion works
- [ ] Response includes all fields per guide (with aliases)

---

**Action Needed:**

The frontend is following the documented API specification exactly. Please:

1. **Check backend logs** for the specific error causing the 500
2. **Test the endpoint directly** with Postman/curl using the exact request format above
3. **Verify the route handler** is implemented and matches the guide you provided
4. **Check for unhandled exceptions** in the comment creation logic

The error is occurring on **every comment submission**, so it's likely a systematic issue (missing route, authentication failure, or database error).
