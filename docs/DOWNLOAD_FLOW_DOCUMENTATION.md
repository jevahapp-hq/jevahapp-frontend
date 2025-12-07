# Download System Flow - Frontend Implementation

**Date:** 2025-01-27  
**Purpose:** Document complete download flow for backend verification

---

## 🔄 Complete Download Flow

### User Action
User taps "Download" button on a media item (video, audio, ebook, etc.)

---

## 📋 Step-by-Step Frontend Flow

### **Step 1: Check if Already Downloaded**
**Location:** `app/utils/downloadUtils.ts` - `handleDownload()` (lines 40-45)

```typescript
const existing = isItemDownloaded(item.id);
if (existing) {
  return { success: false, message: 'Already downloaded' };
}
```

**Action:** Checks local store (AsyncStorage) - **NO API CALL**

---

### **Step 2: Initiate Download with Backend**
**Location:** `app/utils/downloadUtils.ts` - `handleDownload()` (lines 50-53)  
**Calls:** `app/utils/downloadAPI.ts` - `initiateDownload()` (lines 91-134)

#### **API Call Made:**
```http
POST /api/media/:mediaId/download
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
  expo-platform: ios/android
Body: {
  "fileSize": 1234567  // Optional - only included if valid positive number
}
```

#### **Request Details:**
- **URL:** `${API_BASE_URL}/api/media/${mediaId}/download`
- **Method:** POST
- **Body:** 
  - `fileSize` is **OPTIONAL**
  - Only included if: `fileSize !== undefined && fileSize !== null && fileSize > 0`
  - If `fileSize` is missing/invalid, body is: `{}` (empty object)

#### **Expected Response:**
```json
{
  "success": true,
  "downloadUrl": "https://...",
  "fileName": "Media Title",
  "fileSize": 1234567,
  "contentType": "video"
}
```

#### **Error Handling:**
- If response is not OK (400, 404, 500, etc.), frontend receives error text
- **Current Error Received:** `HTTP 400: {"success":false,"message":"Invalid interaction type download for videos media"}`

---

### **Step 3: Add to Local Store**
**Location:** `app/utils/downloadUtils.ts` - `handleDownload()` (lines 72-92)

**Action:** Updates local AsyncStorage store - **NO API CALL**

```typescript
await addToDownloads({
  id: item.id,
  title: item.title,
  // ... other metadata
  status: 'DOWNLOADING'
});
```

---

### **Step 4: Download File to App Storage**
**Location:** `app/utils/downloadUtils.ts` - `handleDownload()` (lines 95-101)  
**Calls:** `app/utils/fileDownloadManager.ts` - `downloadFile()` (lines 95-206)

#### **4a. Update Backend Status (Downloading)**
**API Call Made:**
```http
PATCH /api/media/offline-downloads/:mediaId
Headers:
  Content-Type: application/json
  Authorization: Bearer {token}
Body: {
  "downloadStatus": "downloading",
  "downloadProgress": 0
}
```

#### **4b. Download File Using expo-file-system**
**Action:** Uses `FileSystem.createDownloadResumable()` to download from `downloadUrl` to local storage

**NO API CALLS** - Pure file system operation

#### **4c. Update Backend Progress (Every 10%)**
**API Call Made:**
```http
PATCH /api/media/offline-downloads/:mediaId
Body: {
  "downloadProgress": 10  // Updates at 10%, 20%, 30%, etc.
}
```

#### **4d. Update Backend Status (Completed)**
**API Call Made:**
```http
PATCH /api/media/offline-downloads/:mediaId
Body: {
  "localPath": "file:///path/to/downloaded/file",
  "isDownloaded": true,
  "downloadStatus": "completed",
  "downloadProgress": 100
}
```

---

### **Step 5: Update Local Store**
**Location:** `app/utils/downloadUtils.ts` - `handleDownload()` (lines 122-125)

**Action:** Updates local AsyncStorage with `localPath` - **NO API CALL**

---

## 🔍 Key Points for Backend Team

### **1. Frontend Does NOT Call Interaction Endpoints**
- ✅ **NO calls to** `/api/interactions/*`
- ✅ **NO calls to** `/api/content/*/interaction`
- ✅ **NO calls to** `recordView()`, `recordShare()`, or any interaction tracking

### **2. Frontend Only Makes These API Calls:**
1. `POST /api/media/:id/download` - Initiate download
2. `PATCH /api/media/offline-downloads/:mediaId` - Update download status/progress

### **3. Error Received:**
```
HTTP 400: {"success":false,"message":"Invalid interaction type download for videos media"}
```

**This error message suggests:**
- The backend `/api/media/:id/download` endpoint might be internally calling an interaction tracking endpoint
- OR there's middleware/interceptor that's trying to record a "download" interaction
- The error message format matches interaction validation errors

---

## 📊 Complete API Call Sequence

```
User Taps Download
    ↓
1. POST /api/media/:id/download
   Body: { "fileSize": 1234567 } or {}
   ↓
   [ERROR OCCURS HERE: "Invalid interaction type download for videos media"]
   ↓
   [If successful, continue...]
    ↓
2. PATCH /api/media/offline-downloads/:mediaId
   Body: { "downloadStatus": "downloading", "downloadProgress": 0 }
    ↓
3. [File download happens - NO API CALLS]
    ↓
4. PATCH /api/media/offline-downloads/:mediaId
   Body: { "downloadProgress": 10 }
   [Repeats at 20%, 30%, etc.]
    ↓
5. PATCH /api/media/offline-downloads/:mediaId
   Body: { 
     "localPath": "file://...",
     "isDownloaded": true,
     "downloadStatus": "completed",
     "downloadProgress": 100
   }
```

---

## 🐛 Issue Analysis

### **Problem:**
Error: `"Invalid interaction type download for videos media"`

### **Frontend Behavior:**
- ✅ Frontend **does NOT** call any interaction endpoints
- ✅ Frontend **only** calls download endpoints
- ✅ Frontend **does NOT** send `contentType` in download request body

### **Possible Backend Issues:**
1. **Download endpoint internally calls interaction tracking**
   - The `/api/media/:id/download` endpoint might be calling an interaction service internally
   - That interaction service might be rejecting "download" interactions for "videos" content type

2. **Middleware/Interceptor issue**
   - There might be middleware that intercepts all POST requests and tries to record interactions
   - This middleware might be checking interaction types and rejecting "download" for videos

3. **Wrong endpoint being called**
   - Frontend might be hitting the wrong endpoint (unlikely, but possible)

---

## 🔧 Frontend Code References

### **Download Initiation:**
- **File:** `app/utils/downloadAPI.ts`
- **Function:** `initiateDownload(mediaId: string, fileSize?: number)`
- **Lines:** 91-134
- **Request:** `POST /api/media/:mediaId/download`
- **Body:** `{ fileSize?: number }` (optional)

### **Download Handler:**
- **File:** `app/utils/downloadUtils.ts`
- **Function:** `handleDownload(item: DownloadableItem)`
- **Lines:** 35-147
- **Flow:** Calls `downloadAPI.initiateDownload()` → `fileDownloadManager.downloadFile()`

### **File Download Manager:**
- **File:** `app/utils/fileDownloadManager.ts`
- **Function:** `downloadFile(mediaId, downloadUrl, fileName, contentType)`
- **Lines:** 95-206
- **Actions:** Downloads file, updates backend status

---

## ✅ Verification Checklist for Backend Team

Please verify:

1. **Does `/api/media/:id/download` endpoint internally call any interaction tracking?**
   - If yes, which endpoint?
   - What interaction type is it trying to record?

2. **Is there middleware/interceptor that processes download requests?**
   - Does it try to record interactions?
   - Does it check content types?

3. **What validation happens in `/api/media/:id/download`?**
   - Does it check `contentType`?
   - Does it check `isDownloadable` flag?
   - Does it call any other services?

4. **Where is the error "Invalid interaction type download for videos media" generated?**
   - Which file/function?
   - What triggers it?

---

## 📝 Summary

**Frontend makes these calls:**
1. ✅ `POST /api/media/:id/download` - **This is where error occurs**
2. ✅ `PATCH /api/media/offline-downloads/:mediaId` - Status updates

**Frontend does NOT:**
- ❌ Call interaction endpoints
- ❌ Send `contentType` in download request
- ❌ Record interactions during downloads

**Error suggests:**
- Backend download endpoint might be internally calling interaction tracking
- OR middleware is intercepting and trying to record interactions
- The interaction service is rejecting "download" type for "videos" content type

---

**Next Steps:**
1. Backend team should check if `/api/media/:id/download` internally calls interaction tracking
2. If yes, either remove that call OR fix interaction validation to allow "download" for videos
3. Verify `isDownloadable` flag is being checked (if that's the intended validation)



