# 🚨 URGENT: Backend Video URL Fix Request

## **Problem Summary**
The mobile app is experiencing **-1001 NSURLErrorDomain** errors due to expired AWS signed URLs from the backend. This is causing videos to fail loading randomly throughout the day.

## **Root Cause**
Backend is generating signed URLs with 1-hour expiration (`X-Amz-Expires=3600`), but mobile apps cache these URLs and reuse them after expiration.

## **Current Backend URLs (PROBLEMATIC)**
```
https://870e0e55f75d0d9434531d7518f57e92.r2.cloudflarestorage.com/jevah/jevah/media-videos/video.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=92dafeb76f86a6bb3e5dbcc37f4c1a1c%2F20250918%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20250918T030724Z&X-Amz-Expires=3600&X-Amz-Signature=4e10192f590450735a81bece35bd5ff27324ed5b56f9bde8d746136e478167c7&X-Amz-SignedHeaders=host&x-amz-checksum-mode=ENABLED&x-id=GetObject
```

## **Required Backend URLs (SOLUTION)**
```
https://870e0e55f75d0d9434531d7518f57e92.r2.cloudflarestorage.com/jevah/jevah/media-videos/video.mp4
```

## **Backend Changes Needed**

### **1. Make R2 Bucket Public**
```javascript
// Configure R2 bucket for public access
const bucketConfig = {
  publicRead: true,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: ['GET'],
    allowedHeaders: ['*']
  }
};
```

### **2. Update Upload Process**
```javascript
// Instead of generating signed URLs
const signedUrl = generateSignedUrl(fileKey);

// Use direct public URL
const publicUrl = `https://${bucketName}.r2.cloudflarestorage.com/${bucketPath}/${fileKey}`;
```

### **3. Update API Responses**
**Current Response (PROBLEMATIC):**
```json
{
  "mediaUrl": "https://bucket.r2.cloudflarestorage.com/path/file.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "thumbnailUrl": "https://bucket.r2.cloudflarestorage.com/path/thumb.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&..."
}
```

**Required Response (SOLUTION):**
```json
{
  "mediaUrl": "https://bucket.r2.cloudflarestorage.com/path/file.mp4",
  "thumbnailUrl": "https://bucket.r2.cloudflarestorage.com/path/thumb.jpg"
}
```

### **4. Update All Endpoints**
- `GET /api/media` - Return public URLs
- `GET /api/content` - Return public URLs  
- `GET /api/sermons` - Return public URLs
- `GET /api/music` - Return public URLs

## **Security Considerations**
- **Video files**: Can be public (they're meant to be consumed)
- **User uploads**: Can be public (they're shared content)
- **Private files**: Use signed URLs only for truly private content

## **Benefits of Public URLs**
1. **No expiration issues** - URLs work forever
2. **Better performance** - No signature validation
3. **Simpler caching** - CDN can cache effectively
4. **Mobile-friendly** - Works with offline caching
5. **Reduced server load** - No signature generation needed

## **Migration Strategy**
1. **Phase 1**: Make R2 bucket public
2. **Phase 2**: Update upload process to use public URLs
3. **Phase 3**: Update all API endpoints
4. **Phase 4**: Test with mobile app
5. **Phase 5**: Remove signed URL generation code

## **Testing**
After backend changes:
1. Check that URLs are clean (no AWS parameters)
2. Verify videos load in browser
3. Test mobile app video playback
4. Confirm no -1001 errors in logs

## **Priority**
🚨 **HIGH PRIORITY** - This is causing poor user experience and video playback failures.

## **Timeline**
- **Immediate**: Make R2 bucket public
- **This week**: Update API endpoints
- **Next week**: Remove signed URL code

## **Contact**
Frontend team is ready to test and validate the changes.


