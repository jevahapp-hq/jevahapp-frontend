# 🚀 BACKEND URL SIMPLIFICATION REQUEST

## **Problem Statement**

The frontend is receiving signed URLs with AWS signature parameters that are causing unnecessary complexity and potential playback issues. For MVP purposes, we need simple, direct public URLs.

## **Current Issue**

Backend is returning URLs like this:

```
https://870e0e55f75d0d9434531d7518f57e92.r2.cloudflarestorage.com/jevah/jevah/media-music/kefee_thank-you-my-god.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=92dafeb76f86a6bb3e5dbcc37f4c1a1c%2F20250918%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250918T030724Z&X-Amz-Expires=3600&X-Amz-Signature=4e10192f590450735a81bece35bd5ff27324ed5b56f9bde8d746136e478167c7&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject
```

## **What We Need**

Simple, clean URLs like this:

```
https://870e0e55f75d0d9434531d7518f57e92.r2.cloudflarestorage.com/jevah/jevah/media-music/kefee_thank-you-my-god.mp3
```

## **Requested Changes**

### 1. **Remove Signed URL Generation**

- Stop generating signed URLs with AWS signature parameters
- Use direct public URLs instead
- Remove all query parameters (`?X-Amz-Algorithm=...` etc.)

### 2. **Update Upload Process**

When users upload files, store the **public URL** directly:

```javascript
// Instead of generating signed URLs
const signedUrl = generateSignedUrl(fileKey);

// Use direct public URL
const publicUrl = `https://${bucketName}.r2.cloudflarestorage.com/${bucketPath}/${fileKey}`;
```

### 3. **Update API Response Format**

Ensure all endpoints return clean URLs:

**Current Response:**

```json
{
  "mediaUrl": "https://bucket.r2.cloudflarestorage.com/path/file.mp3?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "thumbnailUrl": "https://bucket.r2.cloudflarestorage.com/path/thumb.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&..."
}
```

**Desired Response:**

```json
{
  "mediaUrl": "https://bucket.r2.cloudflarestorage.com/path/file.mp3",
  "thumbnailUrl": "https://bucket.r2.cloudflarestorage.com/path/thumb.jpg"
}
```

### 4. **Affected Endpoints**

- `/api/content/all` - TikTok-style all content endpoint
- `/api/content/default` - Default content endpoint
- `/api/content/upload` - File upload endpoint
- Any other endpoints returning media URLs

## **Benefits**

1. **Simplified Frontend**: No need for URL conversion logic
2. **Better Performance**: Smaller response payloads
3. **Easier Debugging**: Clean, readable URLs
4. **MVP Focus**: No unnecessary security complexity
5. **Direct Playback**: Media players can handle URLs directly

## **Security Note**

For MVP, we're prioritizing functionality over security. Signed URLs can be re-implemented later when we need access control.

## **Implementation Priority**

**HIGH PRIORITY** - This is blocking audio/video playback functionality.

---

## **Frontend Changes After Backend Update**

Once backend provides clean URLs, frontend will:

1. Remove `convertToPublicUrl()` function
2. Use URLs directly from API response
3. Simplify URL validation logic
4. Remove signed URL detection code

## **Testing**

After implementation, test with:

- Audio file playback
- Video file playback
- Image/thumbnail display
- File downloads

---

**Contact**: Frontend Team
**Priority**: URGENT - Blocking MVP functionality
**Timeline**: ASAP for MVP launch
