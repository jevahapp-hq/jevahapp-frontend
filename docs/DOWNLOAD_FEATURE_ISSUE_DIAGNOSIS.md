# Download Feature - Current State & Issue Diagnosis

## 📋 Document Purpose
This document details the current state of the download feature implementation, what the frontend expects, the actual error occurring, and troubleshooting information for the backend team.

---

## 🔍 Current Issue

### Error Summary
- **HTTP Status**: `500 Internal Server Error`
- **Error Message**: `"Failed to record download"`
- **Endpoint**: `POST /api/media/:mediaId/download`
- **Occurrence**: When attempting to initiate a download for any media item

### Error Response Structure
```json
{
  "error": "{\"success\":false,\"message\":\"Failed to record download\"}"
}
```

**Note**: The error is double-encoded JSON (a JSON string inside a JSON object).

---

## 📤 Frontend Request Details

### Request Endpoint
```
POST https://jevahapp-backend.onrender.com/api/media/{mediaId}/download
```

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer {userToken}
expo-platform: ios|android
```

### Request Body
```json
{
  "fileSize": 1234567  // Optional: Only included if fileSize > 0
}
```

**OR** (if fileSize is not available):
```json
{}
```

### Example Request
```http
POST /api/media/507f1f77bcf86cd799439011/download HTTP/1.1
Host: jevahapp-backend.onrender.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
expo-platform: ios

{
  "fileSize": 5242880
}
```

---

## 📥 Expected Response (Success)

### Success Response Structure
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://storage.example.com/media/signed-url?token=...",
    "fileName": "video_123456.mp4",
    "fileSize": 5242880,
    "contentType": "video/mp4"
  }
}
```

**OR** (if backend returns direct structure):
```json
{
  "downloadUrl": "https://storage.example.com/media/signed-url?token=...",
  "fileName": "video_123456.mp4",
  "fileSize": 5242880,
  "contentType": "video/mp4"
}
```

### Success Response Fields
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `downloadUrl` | string | ✅ Yes | Signed URL for direct file download (valid for limited time) |
| `fileName` | string | ✅ Yes | Original filename of the media |
| `fileSize` | number | Optional | File size in bytes |
| `contentType` | string | Optional | MIME type (e.g., "video/mp4", "audio/mpeg") |

---

## ❌ Actual Response (Error)

### Error Response Structure
```json
{
  "error": "{\"success\":false,\"message\":\"Failed to record download\"}"
}
```

### Issues with Current Error Response
1. **Double-encoded JSON**: Error message is a JSON string inside a JSON object
2. **Unclear error cause**: "Failed to record download" doesn't specify what failed
3. **No error code**: Missing error code for programmatic handling
4. **Missing details**: No indication of whether it's:
   - Database error
   - Validation error
   - Authentication error
   - File storage error

---

## 🔄 Frontend Flow

### Step-by-Step Download Process

1. **User clicks download button**
   ```
   User Action → handleDownloadPress() → handleDownload()
   ```

2. **Frontend checks if already downloaded**
   ```typescript
   const existing = isItemDownloaded(item.id);
   if (existing) return { success: false, message: 'Already downloaded' };
   ```

3. **Call backend to initiate download**
   ```typescript
   POST /api/media/:mediaId/download
   Body: { fileSize?: number }
   ```

4. **Expected: Receive signed download URL**
   ```typescript
   { downloadUrl, fileName, fileSize, contentType }
   ```

5. **Download file using signed URL** (Not reached due to step 3 failure)

---

## 🐛 Possible Root Causes

### 1. Database Error
- **Symptoms**: 500 error, "Failed to record download"
- **Possible Issues**:
  - Database connection not established
  - `OfflineDownload` model/schema issue
  - Missing required fields in database schema
  - Database transaction failure

### 2. Missing Authentication
- **Symptoms**: Should return 401, but might return 500 if auth check fails
- **Check**: Is user token being validated correctly?

### 3. Validation Error
- **Symptoms**: Should return 400, but might return 500 if validation crashes
- **Possible Issues**:
  - Invalid `mediaId` format
  - Media not found in database
  - Missing required request body fields

### 4. File Storage/URL Generation Error
- **Symptoms**: 500 error when generating signed URL
- **Possible Issues**:
  - AWS S3/Storage service not configured
  - File not found in storage
  - Signed URL generation failed

### 5. Missing Backend Implementation
- **Symptoms**: 500 error if endpoint doesn't exist or is incomplete
- **Check**: Is the endpoint fully implemented according to spec?

---

## 🔧 Recommended Backend Fixes

### 1. Improve Error Response Format

**Current (Problematic)**:
```json
{
  "error": "{\"success\":false,\"message\":\"Failed to record download\"}"
}
```

**Recommended**:
```json
{
  "success": false,
  "error": "DOWNLOAD_RECORDING_FAILED",
  "message": "Failed to record download: [specific reason]",
  "details": {
    "mediaId": "507f1f77bcf86cd799439011",
    "reason": "Database connection timeout" // or "Media not found", "Storage service unavailable", etc.
  }
}
```

### 2. Use Appropriate HTTP Status Codes

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| Success | `200 OK` | Download URL provided |
| Media not found | `404 Not Found` | `{ "error": "MEDIA_NOT_FOUND", "message": "Media not found" }` |
| Unauthorized | `401 Unauthorized` | `{ "error": "UNAUTHORIZED", "message": "Authentication required" }` |
| Download not allowed | `403 Forbidden` | `{ "error": "DOWNLOAD_NOT_ALLOWED", "message": "This content cannot be downloaded" }` |
| Validation error | `400 Bad Request` | `{ "error": "VALIDATION_ERROR", "message": "Invalid media ID format" }` |
| Server error | `500 Internal Server Error` | `{ "error": "INTERNAL_ERROR", "message": "Database connection failed" }` |

### 3. Add Detailed Logging

Backend should log:
```javascript
console.log('[Download] Initiate request:', {
  mediaId,
  userId,
  fileSize,
  timestamp: new Date().toISOString()
});

// At each step:
console.log('[Download] Media found:', media);
console.log('[Download] Download record created:', record);
console.log('[Download] Signed URL generated:', url);

// On error:
console.error('[Download] Error:', {
  step: 'record_creation', // or 'url_generation', 'media_lookup', etc.
  error: error.message,
  stack: error.stack
});
```

### 4. Validate Request Before Processing

```javascript
// Validate mediaId format
if (!mediaId || !mongoose.Types.ObjectId.isValid(mediaId)) {
  return res.status(400).json({
    success: false,
    error: "INVALID_MEDIA_ID",
    message: "Invalid media ID format"
  });
}

// Check if media exists
const media = await Media.findById(mediaId);
if (!media) {
  return res.status(404).json({
    success: false,
    error: "MEDIA_NOT_FOUND",
    message: "Media not found"
  });
}

// Check if download is allowed
if (!media.allowDownload) {
  return res.status(403).json({
    success: false,
    error: "DOWNLOAD_NOT_ALLOWED",
    message: "This content is not available for download"
  });
}
```

### 5. Ensure Database Schema Matches

According to the spec, the `OfflineDownload` collection should have:
- `mediaId` (ObjectId, required)
- `userId` (ObjectId, required)
- `downloadUrl` (String, required)
- `fileName` (String, required)
- `fileSize` (Number, optional)
- `contentType` (String, optional)
- `localPath` (String, optional - set by frontend after download)
- `isDownloaded` (Boolean, default: false)
- `downloadStatus` (String: "pending" | "downloading" | "completed" | "failed" | "cancelled")
- `downloadProgress` (Number, 0-100, default: 0)
- `createdAt` (Date, default: now)
- `updatedAt` (Date, default: now)

---

## 📝 Frontend Request Examples

### Example 1: With File Size
```javascript
POST /api/media/507f1f77bcf86cd799439011/download
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expo-platform": "ios"
}
Body: {
  "fileSize": 5242880
}
```

### Example 2: Without File Size
```javascript
POST /api/media/507f1f77bcf86cd799439011/download
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expo-platform": "android"
}
Body: {}
```

---

## ✅ Expected Backend Behavior

### Success Flow
1. ✅ Validate authentication token
2. ✅ Validate `mediaId` format and existence
3. ✅ Check if user is authorized to download this media
4. ✅ Check if media allows downloads
5. ✅ Create or update `OfflineDownload` record with status "pending"
6. ✅ Generate signed download URL (valid for 1 hour)
7. ✅ Return download URL and metadata

### Error Handling
- Use appropriate HTTP status codes (400, 401, 403, 404, 500)
- Return structured error responses with error codes
- Log detailed error information for debugging
- Never return double-encoded JSON

---

## 🧪 Testing Checklist for Backend

- [ ] **Authentication**: Test with valid, invalid, and missing tokens
- [ ] **Media ID Validation**: Test with valid, invalid, and non-existent IDs
- [ ] **Download Permissions**: Test with media that allows/disallows downloads
- [ ] **Database**: Ensure `OfflineDownload` collection exists and is accessible
- [ ] **Signed URLs**: Verify signed URL generation works for all storage providers
- [ ] **File Size**: Test with and without `fileSize` in request body
- [ ] **Error Responses**: Verify all error responses are properly formatted (not double-encoded)
- [ ] **Logging**: Ensure errors are logged with sufficient detail

---

## 📞 Frontend Contact Information

If backend team needs clarification:
- **Spec Reference**: `docs/BACKEND_DOWNLOAD_API_COMPLETE_SPEC.md`
- **Frontend Implementation**: `app/utils/downloadAPI.ts`
- **Error Logs**: Check console logs for `📥 [DownloadAPI]` prefix

---

## 🚀 Next Steps

1. **Backend Team**: 
   - Review this document
   - Check backend logs for detailed error information
   - Fix the root cause of "Failed to record download"
   - Improve error response format
   - Test endpoint with provided examples

2. **Frontend Team**:
   - Wait for backend fix
   - Test download flow once backend is fixed
   - Verify error handling for all scenarios

---

## 📊 Current Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend Implementation | ✅ Complete | Ready to consume API |
| Backend Endpoint | ❌ Error 500 | "Failed to record download" |
| Error Handling | ⚠️ Partial | Double-encoded JSON issue |
| Signed URL Generation | ❓ Unknown | Not reached due to step 1 failure |
| Database Recording | ❓ Unknown | Likely failing (error message suggests this) |

---

**Last Updated**: [Current Date]
**Issue Severity**: 🔴 High (Blocks download feature completely)

