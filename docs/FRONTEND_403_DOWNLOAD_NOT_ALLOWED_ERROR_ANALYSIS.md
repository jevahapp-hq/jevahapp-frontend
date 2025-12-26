# Frontend 403 DOWNLOAD_NOT_ALLOWED Error Analysis

**Date:** 2025-01-27  
**Purpose:** Document the 403 DOWNLOAD_NOT_ALLOWED error from frontend perspective to help backend team diagnose and fix the issue

---

## 🔍 Error Summary

### Error Details
- **HTTP Status Code:** `403 Forbidden`
- **Error Code:** `DOWNLOAD_NOT_ALLOWED`
- **Error Message:** `"This media is not available for download"`
- **Response Structure:**
```json
{
  "error": "DOWNLOAD_NOT_ALLOWED",
  "hasDownloadUrl": false,
  "success": false
}
```

### When It Occurs
This error occurs when the frontend attempts to initiate a download by calling:
```
POST /api/media/:mediaId/download
```

---

## 📤 Frontend Request Details

### Request Endpoint
```
POST https://jevahapp-backend.onrender.com/api/media/{mediaId}/download
```

**Example:**
```
POST https://jevahapp-backend.onrender.com/api/media/694a46734f636937dbd71ce5/download
```

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer {jwt_token}
expo-platform: ios|android
```

**Notes:**
- `Authorization` header is always included (if user is authenticated)
- `expo-platform` header indicates the client platform (ios/android)
- Token is retrieved from AsyncStorage or SecureStore

### Request Body
The request body is a JSON object that may include an optional `fileSize` field:

```json
{
  "fileSize": 1234567
}
```

**OR** (if fileSize is not available or invalid):

```json
{}
```

**Field Details:**
- `fileSize` (optional): Number in bytes
- Only included if: `fileSize !== undefined && fileSize !== null && fileSize > 0`
- If `fileSize` is missing, null, undefined, or 0, the body is an empty object `{}`

### Complete Request Example
```http
POST /api/media/694a46734f636937dbd71ce5/download HTTP/1.1
Host: jevahapp-backend.onrender.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
expo-platform: ios

{
  "fileSize": 5242880
}
```

---

## 📥 Backend Response (Current Error)

### Error Response Structure
```json
{
  "error": "DOWNLOAD_NOT_ALLOWED",
  "hasDownloadUrl": false,
  "success": false
}
```

### Frontend Error Handling
The frontend receives this error and:
1. Logs the error with full details:
   ```javascript
   {
     status: 403,
     error: {
       error: "DOWNLOAD_NOT_ALLOWED",
       message: "This media is not available for download",
       success: false
     },
     parsedMessage: "DOWNLOAD_NOT_ALLOWED"
   }
   ```

2. Displays a user-friendly message:
   - **Alert Title:** "Download Unavailable"
   - **Alert Message:** "This content is not available for download"

3. Returns error to caller:
   ```javascript
   {
     success: false,
     error: "DOWNLOAD_NOT_ALLOWED"
   }
   ```

---

## 🔍 Possible Root Causes (From Frontend Perspective)

Based on the frontend's understanding of the download flow, the backend may be returning `403 DOWNLOAD_NOT_ALLOWED` for the following reasons:

### 1. **Media Download Flag/Setting**
The media item may have a flag or setting that explicitly disables downloads:
- Media has `isDownloadable: false` or `allowDownload: false`
- Media type doesn't support downloads
- Media source doesn't allow downloads

### 2. **User Permissions**
The authenticated user may not have permission to download this specific media:
- User doesn't have required subscription tier
- User hasn't purchased/accessed the media
- Media is restricted to certain user roles
- User's account has download restrictions

### 3. **Media Availability**
The media may not be available for download due to:
- Media file doesn't exist or is missing
- Media is in a state that doesn't allow downloads (e.g., processing, deleted)
- Media source URL is invalid or inaccessible
- Media is marked as "live" content (which may not support downloads)

### 4. **Content Type Restrictions**
Certain content types may not be downloadable:
- Live streams may not support downloads
- Some media types may be restricted by policy
- Copyright or licensing restrictions

### 5. **Media Ownership/Access**
The user may not have access to download this media:
- Media is private and user doesn't have access
- Media belongs to a locked profile
- Media requires special permissions

### 6. **Backend Validation Logic**
The backend validation may be incorrectly rejecting valid download requests:
- Media ID validation failing
- User authentication check failing
- Download permission check logic error
- Media state check incorrectly returning false

---

## ✅ Expected Backend Behavior

### When Download Should Be Allowed
The backend should return a successful response (`200 OK`) with download URL when:

1. **Media exists** and is accessible
2. **User is authenticated** and has valid token
3. **User has permission** to download the media (based on subscription, purchase, access, etc.)
4. **Media is downloadable** (if there's a flag/setting, it should be `true`)
5. **Media file is available** (file exists and is accessible)
6. **Content type supports downloads** (if applicable)

### When Download Should Be Rejected
The backend should return `403 DOWNLOAD_NOT_ALLOWED` when:

1. **Media explicitly disallows downloads** (e.g., `isDownloadable: false`)
2. **User lacks required permissions** (subscription tier, purchase, etc.)
3. **Media type doesn't support downloads** (e.g., live streams)
4. **Copyright/licensing restrictions** prevent downloads
5. **Media is in invalid state** for downloads (deleted, processing, etc.)

**However**, the backend should return different error codes for different scenarios:
- `404 NOT_FOUND` - Media doesn't exist
- `401 UNAUTHORIZED` - User not authenticated
- `403 FORBIDDEN` - User authenticated but lacks permission
- `400 BAD_REQUEST` - Invalid request (invalid media ID, etc.)

---

## 🐛 Debugging Information for Backend

### What Frontend Sends
1. **Media ID:** `694a46734f636937dbd71ce5` (from error logs)
2. **Authentication:** Bearer token in Authorization header
3. **Optional fileSize:** May or may not be included
4. **Platform:** iOS or Android (in `expo-platform` header)

### What Backend Should Check
1. **Verify media exists:**
   ```javascript
   const media = await Media.findById(mediaId);
   if (!media) return 404;
   ```

2. **Verify user authentication:**
   ```javascript
   const user = await verifyToken(authHeader);
   if (!user) return 401;
   ```

3. **Check download permission:**
   ```javascript
   // Check if media allows downloads
   if (media.isDownloadable === false) return 403 DOWNLOAD_NOT_ALLOWED;
   
   // Check if user has access
   if (!userHasAccess(user, media)) return 403 DOWNLOAD_NOT_ALLOWED;
   
   // Check content type restrictions
   if (media.contentType === 'live') return 403 DOWNLOAD_NOT_ALLOWED;
   ```

4. **Verify media file exists:**
   ```javascript
   if (!media.fileUrl || !media.fileExists) return 404 or 403;
   ```

### Backend Logging Recommendations
The backend should log:
- Media ID being requested
- User ID making the request
- Which check failed (if any)
- Media's download settings/flags
- User's permissions/subscription status
- Media's content type and state

This will help identify why specific media items are being rejected.

---

## 📋 Frontend Code References

### Download API Implementation
**File:** `app/utils/downloadAPI.ts`

```91:185:app/utils/downloadAPI.ts
async initiateDownload(
  mediaId: string,
  fileSize?: number
): Promise<DownloadInitiateResponse> {
  try {
    const headers = await this.getAuthHeaders();
    const url = `${this.baseURL}/api/media/${mediaId}/download`;
    
    console.log(`📥 [DownloadAPI] Initiating download:`, {
      url,
      mediaId,
      fileSize,
      hasAuth: !!headers.Authorization,
    });

    // Only include fileSize in request body if it's a valid positive number
    const requestBody: { fileSize?: number } = {};
    if (fileSize !== undefined && fileSize !== null && fileSize > 0) {
      requestBody.fileSize = fileSize;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log(`📥 [DownloadAPI] Response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      let errorMessage = errorText;
      
      try {
        errorData = JSON.parse(errorText);
        
        // Handle nested error objects (backend might return { error: "{\"message\":\"...\"}" })
        if (errorData.error && typeof errorData.error === 'string') {
          try {
            const nestedError = JSON.parse(errorData.error);
            if (nestedError.message) {
              errorMessage = nestedError.message;
            } else if (nestedError.error) {
              errorMessage = nestedError.error;
            } else {
              errorMessage = errorData.error;
            }
          } catch {
            // If nested parse fails, use the string as-is
            errorMessage = errorData.error;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        errorData = { error: errorText, code: `HTTP_${response.status}` };
        errorMessage = errorText;
      }
      
      console.error(`📥 [DownloadAPI] Error response:`, {
        status: response.status,
        error: errorData,
        parsedMessage: errorMessage,
      });
      
      return {
        success: false,
        error: errorMessage,
      };
    }

    const data = await response.json();
    console.log(`📥 [DownloadAPI] Success response:`, data);
    
    // Handle both direct response and nested data structure
    const responseData = data.data || data;
    
    return {
      success: true,
      downloadUrl: responseData.downloadUrl,
      fileName: responseData.fileName,
      fileSize: responseData.fileSize,
      contentType: responseData.contentType,
    };
  } catch (error) {
    console.error("📥 [DownloadAPI] Exception initiating download:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### Error Handling in Download Utils
**File:** `app/utils/downloadUtils.ts`

```67:100:app/utils/downloadUtils.ts
if (!initiateResult.success || !initiateResult.downloadUrl) {
  const errorMsg = initiateResult.error || "Failed to get download URL";
  console.error("❌ Failed to initiate download:", errorMsg);
  
  // Handle specific backend error codes gracefully
  let friendlyMsg = errorMsg;
  let alertTitle = "Download Failed";
  
  if (errorMsg.includes("DOWNLOAD_NOT_ALLOWED") || errorMsg.includes("not available for download")) {
    friendlyMsg = "This content is not available for download";
    alertTitle = "Download Unavailable";
  } else if (errorMsg.includes("MEDIA_NOT_FOUND") || errorMsg.includes("Media not found")) {
    friendlyMsg = "Content not found";
    alertTitle = "Not Found";
  } else if (errorMsg.includes("UNAUTHORIZED") || errorMsg.includes("401") || errorMsg.includes("Authentication required")) {
    friendlyMsg = "Please log in to download content";
    alertTitle = "Authentication Required";
  } else if (errorMsg.includes("Invalid interaction type download")) {
    friendlyMsg = "This content cannot be downloaded at this time";
    alertTitle = "Download Unavailable";
  } else if (errorMsg.includes("INVALID_MEDIA_ID")) {
    friendlyMsg = "Invalid content ID";
    alertTitle = "Invalid Request";
  } else if (errorMsg.includes("Failed to record download") || errorMsg.includes("500") || errorMsg.includes("Internal Server Error")) {
    friendlyMsg = "Server error occurred. Please try again later or contact support if the issue persists.";
    alertTitle = "Server Error";
  } else if (errorMsg.includes("500")) {
    friendlyMsg = "A server error occurred. Please try again in a moment.";
    alertTitle = "Server Error";
  }
  
  Alert.alert(alertTitle, friendlyMsg);
  return { success: false, message: friendlyMsg };
}
```

---

## 🎯 Recommendations for Backend Team

### 1. **Verify Download Permission Logic**
Check the backend code that determines if a download is allowed:
- Is there a `isDownloadable` flag on the media model?
- Are there subscription/permission checks?
- Are there content type restrictions?
- Is the logic correctly implemented?

### 2. **Check Media State**
Verify the media item's state:
- Does the media exist in the database?
- Is the media in a valid state for downloads?
- Does the media have a valid `fileUrl`?
- Is the file accessible?

### 3. **Verify User Permissions**
Check if the user has the required permissions:
- Is the user authenticated correctly?
- Does the user have access to this media?
- Are there subscription tier requirements?
- Are there purchase/access requirements?

### 4. **Add Detailed Logging**
Add logging to identify which check is failing:
```javascript
console.log('Download request:', {
  mediaId,
  userId,
  mediaExists: !!media,
  isDownloadable: media?.isDownloadable,
  userHasAccess: userHasAccess(user, media),
  contentType: media?.contentType,
  mediaState: media?.state
});
```

### 5. **Return More Specific Error Messages**
Instead of just `DOWNLOAD_NOT_ALLOWED`, consider returning more specific error codes:
- `DOWNLOAD_NOT_ALLOWED_MEDIA_FLAG` - Media explicitly disallows downloads
- `DOWNLOAD_NOT_ALLOWED_PERMISSION` - User lacks required permissions
- `DOWNLOAD_NOT_ALLOWED_CONTENT_TYPE` - Content type doesn't support downloads
- `DOWNLOAD_NOT_ALLOWED_MEDIA_STATE` - Media is in invalid state

This will help identify the exact reason for rejection.

### 6. **Verify Media ID**
Check if the media ID `694a46734f636937dbd71ce5` exists and is valid:
- Does this media exist in the database?
- Is this a valid ObjectId format?
- Is this media accessible by the requesting user?

---

## 📝 Expected Success Response

When the download is allowed, the backend should return:

```json
{
  "success": true,
  "downloadUrl": "https://cdn.example.com/media/video123.mp4?expires=1234567890&signature=abc123",
  "fileName": "Media Title",
  "fileSize": 12345678,
  "contentType": "video/mp4"
}
```

**OR** (if using nested data structure):

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://cdn.example.com/media/video123.mp4?expires=1234567890&signature=abc123",
    "fileName": "Media Title",
    "fileSize": 12345678,
    "contentType": "video/mp4"
  }
}
```

---

## 🔗 Related Documentation

- [Backend Download API Complete Spec](./BACKEND_DOWNLOAD_API_COMPLETE_SPEC.md)
- [Download Flow Documentation](./DOWNLOAD_FLOW_DOCUMENTATION.md)
- [Download Feature Issue Diagnosis](./DOWNLOAD_FEATURE_ISSUE_DIAGNOSIS.md)

---

## 📞 Next Steps

1. **Backend team should:**
   - Review the download permission logic
   - Check the specific media ID: `694a46734f636937dbd71ce5`
   - Verify user permissions for this media
   - Add detailed logging to identify the failing check
   - Return more specific error codes if possible

2. **Frontend team will:**
   - Wait for backend fix
   - Test with the same media ID after backend changes
   - Update error handling if backend returns more specific error codes

---

**Last Updated:** 2025-01-27  
**Status:** Waiting for backend investigation and fix

