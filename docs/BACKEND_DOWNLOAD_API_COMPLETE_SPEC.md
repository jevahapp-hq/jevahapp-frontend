# Backend Download API - Complete Specification

## Overview

This document provides a comprehensive specification for the backend download API endpoints required to support in-app downloads. The frontend uses these endpoints to initiate downloads, track progress, and manage offline content.

## Base URL

All endpoints use the base URL: `https://jevahapp-backend.onrender.com`

## Authentication

All endpoints require Bearer token authentication in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

---

## 1. Initiate Download

### Endpoint
```
POST /api/media/:mediaId/download
```

### Purpose
Initiates a download for a media item and returns the download URL, file metadata, and download tracking information.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaId` | string | Yes | The unique identifier of the media item to download |

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <jwt_token>
expo-platform: ios | android (optional, for analytics)
```

### Request Body

```json
{
  "fileSize": 12345678
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fileSize` | number | No | File size in bytes. Optional but recommended for better download tracking and validation |

**Validation Rules:**
- `fileSize` must be a positive number if provided
- If `fileSize` is missing, null, undefined, or 0, the request body can be empty `{}`

### Response Format (Success)

```json
{
  "success": true,
  "downloadUrl": "https://cdn.example.com/media/video123.mp4?expires=1234567890&signature=abc123",
  "fileName": "Gospel Video Title",
  "fileSize": 12345678,
  "contentType": "video/mp4",
  "mediaId": "507f1f77bcf86cd799439011",
  "downloadId": "dl_507f1f77bcf86cd799439011",
  "expiresAt": "2024-01-21T10:30:00Z"
}
```

**Response Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `success` | boolean | Yes | Always `true` for successful responses |
| `downloadUrl` | string | Yes | Direct download URL for the media file. Should be a signed/secure URL with appropriate expiration |
| `fileName` | string | Yes | Display name for the downloaded file |
| `fileSize` | number | Yes | File size in bytes |
| `contentType` | string | Yes | MIME type of the file (e.g., "video/mp4", "audio/mpeg", "application/pdf") |
| `mediaId` | string | Yes | The media item ID (same as path parameter) |
| `downloadId` | string | No | Optional unique identifier for this download session |
| `expiresAt` | string | No | ISO 8601 timestamp indicating when the download URL expires (if applicable) |

### Error Responses

#### 400 Bad Request - Invalid Media ID

```json
{
  "success": false,
  "error": "Invalid media ID",
  "code": "INVALID_MEDIA_ID"
}
```

#### 404 Not Found - Media Not Found

```json
{
  "success": false,
  "error": "Media not found",
  "code": "MEDIA_NOT_FOUND"
}
```

#### 403 Forbidden - Download Not Allowed

```json
{
  "success": false,
  "error": "This media is not available for download",
  "code": "DOWNLOAD_NOT_ALLOWED"
}
```

#### 401 Unauthorized

```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

#### 500 Server Error

```json
{
  "success": false,
  "error": "Failed to initiate download",
  "code": "SERVER_ERROR"
}
```

### Backend Implementation Notes

1. **Download URL Generation:**
   - Generate a secure, signed download URL if using S3/Cloudflare R2
   - Include appropriate expiration time (e.g., 1 hour)
   - URL should provide direct file access without requiring additional authentication

2. **Validation:**
   - Verify media exists and is accessible by the user
   - Check if media is marked as downloadable (if such flag exists)
   - Validate user permissions to download the media

3. **Download Tracking:**
   - Optionally create a download record in the database
   - Track download initiation for analytics
   - Do NOT use this endpoint to record "interaction" events (that's a separate concern)

4. **Content Type Detection:**
   - Determine content type from media metadata
   - Support: video (mp4, mov, avi), audio (mp3, m4a, wav), ebooks (pdf, epub)

---

## 2. Update Download Status

### Endpoint
```
PATCH /api/media/offline-downloads/:mediaId
```

### Purpose
Updates the download status, progress, and local file path as the download progresses. Called multiple times during the download lifecycle.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaId` | string | Yes | The unique identifier of the media item |

### Request Headers

```
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Request Body

The request body can include any combination of these fields:

```json
{
  "localPath": "file:///path/to/downloaded/file.mp4",
  "isDownloaded": true,
  "downloadStatus": "completed",
  "downloadProgress": 100
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `localPath` | string | No | The local file system path where the file was saved (sent only on completion) |
| `isDownloaded` | boolean | No | Whether the file has been successfully downloaded |
| `downloadStatus` | string | No | Current status: `"pending"`, `"downloading"`, `"completed"`, `"failed"`, `"cancelled"` |
| `downloadProgress` | number | No | Download progress percentage (0-100) |

### Response Format (Success)

```json
{
  "success": true,
  "data": {
    "mediaId": "507f1f77bcf86cd799439011",
    "downloadStatus": "completed",
    "downloadProgress": 100,
    "isDownloaded": true,
    "localPath": "file:///path/to/downloaded/file.mp4",
    "updatedAt": "2024-01-20T15:30:00Z"
  },
  "message": "Download status updated successfully"
}
```

### Common Request Patterns

#### Initial Status (Download Starting)

```json
{
  "downloadStatus": "downloading",
  "downloadProgress": 0
}
```

#### Progress Update (During Download)

```json
{
  "downloadProgress": 45
}
```

#### Completion

```json
{
  "localPath": "file:///var/mobile/.../downloads/media123.mp4",
  "isDownloaded": true,
  "downloadStatus": "completed",
  "downloadProgress": 100
}
```

#### Failure

```json
{
  "downloadStatus": "failed",
  "downloadProgress": 0
}
```

### Error Responses

#### 404 Not Found - Download Record Not Found

```json
{
  "success": false,
  "error": "Download record not found",
  "code": "DOWNLOAD_NOT_FOUND"
}
```

#### 400 Bad Request - Invalid Status

```json
{
  "success": false,
  "error": "Invalid download status",
  "code": "VALIDATION_ERROR",
  "field": "downloadStatus"
}
```

#### 400 Bad Request - Invalid Progress

```json
{
  "success": false,
  "error": "Download progress must be between 0 and 100",
  "code": "VALIDATION_ERROR",
  "field": "downloadProgress"
}
```

### Backend Implementation Notes

1. **Upsert Behavior:**
   - If a download record doesn't exist, create it
   - If it exists, update the provided fields
   - Don't overwrite fields that aren't provided in the request

2. **Status Validation:**
   - Validate `downloadStatus` is one of: `pending`, `downloading`, `completed`, `failed`, `cancelled`
   - Validate `downloadProgress` is between 0 and 100

3. **Local Path Handling:**
   - `localPath` is provided by the frontend and represents the app's local file system path
   - Store as-is (backend doesn't need to validate the path format)
   - Used for reference only (backend doesn't access the file directly)

---

## 3. Get User's Downloads

### Endpoint
```
GET /api/media/offline-downloads
```

### Purpose
Retrieves a paginated list of all downloads for the authenticated user.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | number | No | 1 | Page number (1-indexed) |
| `limit` | number | No | 20 | Number of items per page |
| `status` | string | No | - | Filter by status: `pending`, `downloading`, `completed`, `failed`, `cancelled` |
| `contentType` | string | No | - | Filter by content type: `video`, `audio`, `ebook` |

### Request Headers

```
Authorization: Bearer <jwt_token>
```

### Response Format (Success)

```json
{
  "success": true,
  "data": {
    "downloads": [
      {
        "_id": "507f1f77bcf86cd799439012",
        "mediaId": "507f1f77bcf86cd799439011",
        "userId": "507f1f77bcf86cd799439010",
        "fileName": "Gospel Video Title",
        "fileSize": 12345678,
        "contentType": "video/mp4",
        "downloadStatus": "completed",
        "downloadProgress": 100,
        "isDownloaded": true,
        "localPath": "file:///path/to/file.mp4",
        "downloadUrl": "https://cdn.example.com/media/video123.mp4",
        "media": {
          "_id": "507f1f77bcf86cd799439011",
          "title": "Gospel Video Title",
          "thumbnailUrl": "https://cdn.example.com/thumbnails/video123.jpg",
          "duration": 180
        },
        "createdAt": "2024-01-20T10:00:00Z",
        "updatedAt": "2024-01-20T15:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

**Download Object Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `_id` | string | Unique download record ID |
| `mediaId` | string | ID of the downloaded media item |
| `userId` | string | ID of the user who downloaded |
| `fileName` | string | Display name of the file |
| `fileSize` | number | File size in bytes |
| `contentType` | string | MIME type of the file |
| `downloadStatus` | string | Current download status |
| `downloadProgress` | number | Progress percentage (0-100) |
| `isDownloaded` | boolean | Whether download is complete |
| `localPath` | string | Local file system path (if completed) |
| `downloadUrl` | string | Original download URL (may be expired) |
| `media` | object | Populated media object with title, thumbnail, etc. (optional) |
| `createdAt` | string | ISO 8601 timestamp when download was initiated |
| `updatedAt` | string | ISO 8601 timestamp when download was last updated |

### Error Responses

#### 401 Unauthorized

```json
{
  "success": false,
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### Backend Implementation Notes

1. **Filtering:**
   - Filter downloads by the authenticated user's ID
   - Apply status and contentType filters if provided
   - Sort by `createdAt` descending (newest first)

2. **Pagination:**
   - Return pagination metadata
   - Calculate `totalPages` as `Math.ceil(total / limit)`
   - Set `hasNext` and `hasPrev` based on current page

3. **Media Population:**
   - Optionally populate the `media` field with basic media info (title, thumbnail, duration)
   - Don't include full media object (too much data)

---

## 4. Remove/Delete Download

### Endpoint
```
DELETE /api/media/offline-downloads/:mediaId
```

### Purpose
Removes a download record from the user's downloads list. The frontend will handle deleting the actual file.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaId` | string | Yes | The unique identifier of the media item |

### Request Headers

```
Authorization: Bearer <jwt_token>
```

### Response Format (Success)

```json
{
  "success": true,
  "message": "Download removed successfully"
}
```

### Error Responses

#### 404 Not Found

```json
{
  "success": false,
  "error": "Download not found",
  "code": "DOWNLOAD_NOT_FOUND"
}
```

#### 403 Forbidden

```json
{
  "success": false,
  "error": "You can only remove your own downloads",
  "code": "FORBIDDEN"
}
```

### Backend Implementation Notes

1. **Authorization:**
   - Verify the download belongs to the authenticated user
   - Return 403 if user tries to delete someone else's download

2. **Soft Delete (Optional):**
   - Consider implementing soft delete (mark as deleted) instead of hard delete
   - This allows for recovery and better analytics

---

## 5. Get Download Status (Single)

### Endpoint
```
GET /api/media/offline-downloads/:mediaId
```

### Purpose
Retrieves the download status for a specific media item.

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mediaId` | string | Yes | The unique identifier of the media item |

### Request Headers

```
Authorization: Bearer <jwt_token>
```

### Response Format (Success)

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "mediaId": "507f1f77bcf86cd799439011",
    "downloadStatus": "completed",
    "downloadProgress": 100,
    "isDownloaded": true,
    "localPath": "file:///path/to/file.mp4",
    "fileName": "Gospel Video Title",
    "fileSize": 12345678,
    "contentType": "video/mp4",
    "createdAt": "2024-01-20T10:00:00Z",
    "updatedAt": "2024-01-20T15:30:00Z"
  }
}
```

### Error Responses

#### 404 Not Found

```json
{
  "success": false,
  "error": "Download not found",
  "code": "DOWNLOAD_NOT_FOUND"
}
```

---

## Frontend Implementation Flow

### Complete Download Flow

```
1. User taps "Download" button
   ↓
2. Frontend checks if already downloaded (local check)
   ↓
3. POST /api/media/:mediaId/download
   Request: { fileSize?: number }
   Response: { downloadUrl, fileName, fileSize, contentType, ... }
   ↓
4. Frontend adds to local store (status: "DOWNLOADING")
   ↓
5. PATCH /api/media/offline-downloads/:mediaId
   Request: { downloadStatus: "downloading", downloadProgress: 0 }
   ↓
6. Frontend downloads file using expo-file-system
   (Progress updates every 10%: downloadProgress: 10, 20, 30, ...)
   ↓
7. PATCH /api/media/offline-downloads/:mediaId (progress updates)
   Request: { downloadProgress: 10 } // repeated at 20, 30, etc.
   ↓
8. File download completes
   ↓
9. PATCH /api/media/offline-downloads/:mediaId (completion)
   Request: {
     localPath: "file:///.../file.mp4",
     isDownloaded: true,
     downloadStatus: "completed",
     downloadProgress: 100
   }
   ↓
10. Frontend updates local store with localPath
   ↓
11. File available for offline playback
```

### Error Handling Flow

```
If POST /api/media/:mediaId/download fails:
  → Show error message to user
  → Don't create local download record
  → Stop flow

If file download fails:
  → PATCH /api/media/offline-downloads/:mediaId
     { downloadStatus: "failed" }
  → Show error message to user
  → Allow retry

If PATCH /api/media/offline-downloads/:mediaId fails:
  → Log error (non-critical)
  → Continue with local store update
  → Retry on next app launch if needed
```

---

## Data Models

### Download Record (Database Schema)

```typescript
interface OfflineDownload {
  _id: ObjectId;
  mediaId: string; // Reference to Media._id
  userId: string; // Reference to User._id
  fileName: string;
  fileSize: number;
  contentType: string; // e.g., "video/mp4", "audio/mpeg"
  downloadUrl: string; // Original download URL (may expire)
  downloadStatus: "pending" | "downloading" | "completed" | "failed" | "cancelled";
  downloadProgress: number; // 0-100
  isDownloaded: boolean;
  localPath?: string; // Local file system path (provided by frontend)
  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes Recommended

```javascript
// For efficient queries
{ userId: 1, createdAt: -1 } // Get user's downloads, newest first
{ userId: 1, mediaId: 1 } // Unique constraint (user can only have one download per media)
{ downloadStatus: 1 } // Filter by status
{ contentType: 1 } // Filter by content type
```

---

## Content Type Support

### Supported Content Types

| Content Type | MIME Types | Extensions | Notes |
|--------------|------------|------------|-------|
| Video | `video/mp4`, `video/mov`, `video/avi` | `.mp4`, `.mov`, `.avi` | Most common format: MP4 |
| Audio | `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/m4a` | `.mp3`, `.m4a`, `.wav` | Most common format: MP3 |
| Ebook | `application/pdf`, `application/epub+zip` | `.pdf`, `.epub` | PDF most common |

---

## Security Considerations

### Download URL Security

1. **Signed URLs:**
   - Use signed URLs with expiration (e.g., AWS S3 presigned URLs, Cloudflare R2 signed URLs)
   - Recommended expiration: 1 hour
   - Include signature in URL to prevent tampering

2. **Access Control:**
   - Verify user has permission to download the media
   - Check media visibility settings (public/private)
   - Respect profile lock settings if applicable

3. **Rate Limiting:**
   - Implement rate limiting on download initiation endpoint
   - Prevent abuse (e.g., max 10 downloads per minute per user)

### Data Privacy

1. **User Data:**
   - Only return downloads belonging to the authenticated user
   - Never expose other users' download records

2. **Local Path:**
   - `localPath` is provided by frontend (trust but verify format)
   - Don't expose file system paths to other users
   - Consider sanitizing paths if logging

---

## Performance Considerations

### Download URL Generation

- Cache signed URLs if possible (within expiration window)
- Use CDN for file delivery (Cloudflare, AWS CloudFront)
- Optimize file sizes (compression, encoding)

### Status Updates

- Accept batch status updates if multiple downloads are in progress
- Use efficient database queries (indexed fields)
- Consider background job for cleanup (old/failed downloads)

### Pagination

- Default limit: 20 items per page
- Maximum limit: 100 items per page
- Use cursor-based pagination for very large datasets (future optimization)

---

## Testing Scenarios

### Success Cases

1. ✅ Initiate download with fileSize
2. ✅ Initiate download without fileSize
3. ✅ Update download status to "downloading"
4. ✅ Update download progress (10%, 50%, 100%)
5. ✅ Complete download with localPath
6. ✅ Get user's downloads (paginated)
7. ✅ Get single download status
8. ✅ Delete download
9. ✅ Filter downloads by status
10. ✅ Filter downloads by contentType

### Error Cases

1. ❌ Initiate download with invalid mediaId
2. ❌ Initiate download for non-existent media
3. ❌ Initiate download without authentication
4. ❌ Update status with invalid mediaId
5. ❌ Update status with invalid progress value (>100)
6. ❌ Delete download that doesn't belong to user
7. ❌ Get downloads without authentication
8. ❌ Network timeout handling
9. ❌ Server error handling

### Edge Cases

1. ⚠️ Download same media twice (should update existing record)
2. ⚠️ Download URL expires during download (handle gracefully)
3. ⚠️ Large file downloads (1GB+)
4. ⚠️ Concurrent downloads (multiple files at once)
5. ⚠️ Download cancellation mid-way
6. ⚠️ App crashes during download (resume capability)

---

## Integration Checklist

### Backend Team

- [ ] Implement `POST /api/media/:mediaId/download` endpoint
- [ ] Implement `PATCH /api/media/offline-downloads/:mediaId` endpoint
- [ ] Implement `GET /api/media/offline-downloads` endpoint (paginated)
- [ ] Implement `GET /api/media/offline-downloads/:mediaId` endpoint
- [ ] Implement `DELETE /api/media/offline-downloads/:mediaId` endpoint
- [ ] Create database schema for offline downloads
- [ ] Add indexes for efficient queries
- [ ] Implement download URL signing (S3/R2 presigned URLs)
- [ ] Add rate limiting
- [ ] Add proper error handling
- [ ] Add logging for debugging
- [ ] Test all endpoints
- [ ] Document any deviations from this spec

### Frontend Team

- [ ] Update download initiation to use `POST /api/media/:mediaId/download`
- [ ] Implement status updates using `PATCH /api/media/offline-downloads/:mediaId`
- [ ] Update download listing to use `GET /api/media/offline-downloads`
- [ ] Handle all error responses appropriately
- [ ] Implement progress tracking
- [ ] Test complete download flow
- [ ] Test error scenarios
- [ ] Test offline playback from localPath

---

## Version History

- **v1.0.0** (2024-01-20): Initial specification
  - Basic download initiation
  - Status tracking
  - Download listing
  - Download removal
  - Complete frontend integration guide

---

## Notes

1. **Download vs Interaction:**
   - Download initiation should NOT be treated as an "interaction" event
   - Do NOT call interaction tracking endpoints from the download endpoint
   - Downloads and interactions are separate concerns

2. **File Storage:**
   - Frontend handles actual file storage on device
   - Backend only tracks metadata and status
   - `localPath` is for reference only (backend doesn't access the file)

3. **URL Expiration:**
   - Download URLs should have reasonable expiration (1 hour recommended)
   - Frontend should handle expired URLs gracefully
   - Consider refresh mechanism for long downloads

4. **Future Enhancements:**
   - Resume interrupted downloads
   - Download queue management
   - Download scheduling
   - Bandwidth management
   - Download compression/optimization

