# Offline Downloads - Complete Implementation Guide

## ✅ Implementation Status

**COMPLETE** - The frontend now properly consumes the backend download system and actually downloads files to app storage.

---

## Architecture Overview

### Flow Diagram

```
User Taps "Download"
    ↓
1. Frontend calls: POST /api/media/:id/download
    ↓
2. Backend returns: downloadUrl, fileName, fileSize, contentType
    ↓
3. Frontend downloads file using expo-file-system
    ↓
4. File saved to: FileSystem.documentDirectory + 'downloads/{mediaId}.{ext}'
    ↓
5. Frontend updates backend: PATCH /api/media/offline-downloads/:mediaId
    Body: { localPath, isDownloaded: true, downloadStatus: 'completed' }
    ↓
6. Frontend updates local store with localPath
    ↓
7. When playing offline: Use localPath instead of fileUrl
```

---

## Files Created/Updated

### 1. `app/utils/downloadAPI.ts` (NEW)
- **Purpose**: API service for backend download endpoints
- **Methods**:
  - `initiateDownload(mediaId, fileSize)` - Get download URL from backend
  - `updateDownloadStatus(mediaId, updates)` - Update backend with localPath/status
  - `getOfflineDownloads(params)` - Get user's downloads from backend
  - `removeDownload(mediaId)` - Remove download from backend

### 2. `app/utils/fileDownloadManager.ts` (NEW)
- **Purpose**: Handles actual file downloads to app storage
- **Features**:
  - Downloads files to app-specific directory (not accessible via Files app)
  - Progress tracking with callbacks
  - Automatic backend status updates
  - File existence checking
  - File deletion
- **Storage Location**: `FileSystem.documentDirectory + 'downloads/'`

### 3. `app/utils/downloadUtils.ts` (UPDATED)
- **Changes**:
  - Now calls backend to initiate download
  - Actually downloads files using `fileDownloadManager`
  - Updates backend with `localPath` and status
  - Tracks download progress
  - Handles cancellation

### 4. `app/store/useDownloadStore.tsx` (UPDATED)
- **Changes**:
  - Added `localPath` field to `DownloadItem`
  - Added `downloadProgress` field
  - Added `updateDownloadItem()` method
  - `isItemDownloaded()` now checks for `localPath` existence

---

## How It Works

### Step 1: User Initiates Download

```typescript
import { useDownloadHandler } from '@/app/utils/downloadUtils';

const { handleDownload } = useDownloadHandler();

// User taps download button
const result = await handleDownload({
  id: 'media123',
  title: 'Gospel Video',
  contentType: 'video',
  fileSize: 12345678, // Optional, helps backend
});
```

### Step 2: Backend Provides Download URL

```typescript
// downloadAPI.initiateDownload() calls:
POST /api/media/:id/download
Body: { fileSize: 12345678 }

// Backend responds:
{
  success: true,
  downloadUrl: "https://r2.cloudflare.com/media/video123.mp4",
  fileName: "Gospel Video",
  fileSize: 12345678,
  contentType: "video/mp4"
}
```

### Step 3: File Downloads to App Storage

```typescript
// fileDownloadManager.downloadFile() downloads to:
FileSystem.documentDirectory + 'downloads/media123.mp4'

// Path example (iOS):
file:///var/mobile/Containers/Data/Application/.../downloads/media123.mp4

// Path example (Android):
file:///data/user/0/com.app/files/downloads/media123.mp4
```

### Step 4: Backend Updated with Local Path

```typescript
// downloadAPI.updateDownloadStatus() calls:
PATCH /api/media/offline-downloads/:mediaId
Body: {
  localPath: "file:///.../downloads/media123.mp4",
  isDownloaded: true,
  downloadStatus: "completed",
  downloadProgress: 100
}
```

### Step 5: Play from Local Storage

```typescript
import { useDownloadHandler } from '@/app/utils/downloadUtils';

const { getLocalPath } = useDownloadHandler();

// When playing media
const localPath = getLocalPath(mediaId);

if (localPath) {
  // Play from local file (offline)
  playVideo(localPath); // Uses local URI
} else {
  // Fallback to streaming
  playVideo(fileUrl); // Uses network URL
}
```

---

## Storage Location

### ✅ App-Only Storage (Correct Implementation)

**iOS:**
- Path: `NSDocumentDirectory` (via `FileSystem.documentDirectory`)
- Location: App's private container
- **NOT accessible** via Files app or Gallery
- Files persist across app updates

**Android:**
- Path: App's private files directory
- Location: `/data/user/0/{package}/files/downloads/`
- **NOT accessible** via Downloads folder or Gallery
- Files persist across app updates

**Example Path:**
```
iOS: file:///var/mobile/Containers/Data/Application/{UUID}/Documents/downloads/media123.mp4
Android: file:///data/user/0/com.jevahapp/files/downloads/media123.mp4
```

### ❌ Public Storage (Wrong - Don't Use)

**Don't use:**
- Device's Downloads folder
- Gallery/Photos app
- Public file system locations
- External storage (SD card)

---

## API Endpoints Used

### 1. Initiate Download
```
POST /api/media/:id/download
Body: { fileSize?: number }
Response: { downloadUrl, fileName, fileSize, contentType }
```

### 2. Update Download Status
```
PATCH /api/media/offline-downloads/:mediaId
Body: {
  localPath?: string,
  isDownloaded?: boolean,
  downloadStatus?: "pending" | "downloading" | "completed" | "failed",
  downloadProgress?: number
}
```

### 3. Get Offline Downloads
```
GET /api/media/offline-downloads?page=1&limit=20
Response: { downloads: OfflineDownload[], pagination: {...} }
```

### 4. Remove Download
```
DELETE /api/media/offline-downloads/:mediaId
```

---

## Usage Examples

### Example 1: Download with Progress

```typescript
import { useDownloadHandler } from '@/app/utils/downloadUtils';

function VideoCard({ video }) {
  const { handleDownload } = useDownloadHandler();
  const [progress, setProgress] = useState(0);

  const onDownload = async () => {
    const result = await handleDownload(
      {
        id: video._id,
        title: video.title,
        contentType: 'video',
        fileUrl: video.fileUrl,
        fileSize: video.fileSize,
      },
      (progress) => {
        // Progress callback
        setProgress(progress.progress);
        console.log(`Download progress: ${progress.progress}%`);
      }
    );

    if (result.success) {
      Alert.alert('Success', 'Download completed!');
    }
  };

  return (
    <View>
      <Button onPress={onDownload} title="Download" />
      {progress > 0 && progress < 100 && (
        <ProgressBar progress={progress} />
      )}
    </View>
  );
}
```

### Example 2: Play Offline Video

```typescript
import { useDownloadHandler } from '@/app/utils/downloadUtils';
import { Video } from 'expo-video';

function VideoPlayer({ videoId, fileUrl }) {
  const { getLocalPath } = useDownloadHandler();
  const localPath = getLocalPath(videoId);

  // Use local file if available, otherwise stream
  const source = localPath ? { uri: localPath } : { uri: fileUrl };

  return <Video source={source} />;
}
```

### Example 3: Check Download Status

```typescript
import { useDownloadHandler } from '@/app/utils/downloadUtils';

function DownloadButton({ mediaId }) {
  const { checkIfDownloaded, getLocalPath } = useDownloadHandler();
  const isDownloaded = checkIfDownloaded(mediaId);
  const localPath = getLocalPath(mediaId);

  if (isDownloaded && localPath) {
    return <Text>✅ Downloaded (Offline Available)</Text>;
  }

  return <Button title="Download" />;
}
```

### Example 4: Delete Download

```typescript
import { useDownloadHandler } from '@/app/utils/downloadUtils';

function DeleteButton({ mediaId }) {
  const { deleteDownload } = useDownloadHandler();

  const handleDelete = async () => {
    const confirmed = await Alert.alert(
      'Delete Download',
      'Are you sure? This will remove the file from your device.',
      [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteDownload(mediaId);
      }}]
    );
  };

  return <Button onPress={handleDelete} title="Delete" />;
}
```

---

## Error Handling

### Network Errors
- If backend is unreachable, download fails gracefully
- User sees error message
- Status updated to "failed"

### File System Errors
- If storage is full, download fails
- Error logged to console
- Backend updated with "failed" status

### Backend Errors
- If download URL expires, retry with new URL
- If update fails, local store still updated
- Sync can happen later

---

## Testing Checklist

- [ ] Download initiates successfully
- [ ] File downloads to app storage
- [ ] Progress updates correctly
- [ ] Backend updated with localPath
- [ ] Local store updated with localPath
- [ ] Offline playback works from localPath
- [ ] Download cancellation works
- [ ] Delete removes file and backend entry
- [ ] Files persist after app restart
- [ ] Multiple downloads work simultaneously
- [ ] Large files download correctly
- [ ] Error handling works for network failures

---

## Backend Requirements

### ✅ Backend Already Has:

1. **Download Initiation Endpoint**
   - `POST /api/media/:id/download`
   - Returns `downloadUrl`, `fileName`, `fileSize`, `contentType`

2. **Download Tracking**
   - Stores download metadata in `offlineDownloads` array
   - Tracks `mediaId`, `downloadUrl`, `fileName`, `fileSize`

3. **Download Listing**
   - `GET /api/media/offline-downloads`
   - Returns user's downloads

4. **Download Removal**
   - `DELETE /api/media/offline-downloads/:mediaId`

### ⚠️ Backend Needs (If Not Already Implemented):

1. **Update Download Status Endpoint**
   ```
   PATCH /api/media/offline-downloads/:mediaId
   Body: {
     localPath?: string,
     isDownloaded?: boolean,
     downloadStatus?: "pending" | "downloading" | "completed" | "failed",
     downloadProgress?: number
   }
   ```

2. **Fields in Download Model**
   - `localPath` (string, optional)
   - `isDownloaded` (boolean, default: false)
   - `downloadStatus` (enum: "pending" | "downloading" | "completed" | "failed")
   - `downloadProgress` (number, 0-100)

---

## Dependencies

### Required Packages

```json
{
  "expo-file-system": "~18.0.0"
}
```

**Install:**
```bash
npx expo install expo-file-system
```

### Already Installed

- `@react-native-async-storage/async-storage` - For local metadata storage
- `expo` - Core Expo SDK

---

## Migration from Old Implementation

### Old Behavior (Metadata Only)
- Only stored metadata in AsyncStorage
- No actual file download
- Played from remote URL even when "downloaded"

### New Behavior (Actual Downloads)
- Downloads files to app storage
- Updates backend with localPath
- Plays from local file when offline
- Tracks download progress

### Migration Steps

1. **No breaking changes** - Old downloads still work (metadata preserved)
2. **Re-download** - Users can re-download to get actual files
3. **Gradual migration** - New downloads use new system, old ones remain

---

## Troubleshooting

### Issue: Download Fails Immediately

**Possible Causes:**
- Backend endpoint not available
- Network error
- Invalid mediaId

**Solution:**
- Check backend logs
- Verify endpoint exists
- Check network connectivity

### Issue: File Downloads But Can't Play

**Possible Causes:**
- File extension mismatch
- Corrupted download
- Wrong file format

**Solution:**
- Check file extension matches contentType
- Verify file size matches expected
- Re-download if corrupted

### Issue: Download Progress Stuck

**Possible Causes:**
- Network interruption
- Backend timeout
- File too large

**Solution:**
- Check network connection
- Increase timeout if needed
- Show user-friendly error

---

## Summary

✅ **Frontend Now:**
- Calls backend to get download URL
- Downloads files to app-specific storage
- Updates backend with localPath and status
- Plays from local files when offline
- Tracks download progress
- Handles errors gracefully

✅ **Backend Ready:**
- Provides download URLs
- Tracks download metadata
- Accepts status updates (if PATCH endpoint exists)

✅ **User Experience:**
- Downloads work offline
- Files stored in app (not in device Files/Gallery)
- Progress tracking
- Error handling

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Status:** ✅ Complete Implementation




