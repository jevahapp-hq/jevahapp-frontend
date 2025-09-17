# 🎯 TikTok-Style UI Usage Example

## 📱 **Quick Start**

Your TikTok-style UI is now ready to use! Here's how to get started:

### **1. Basic Usage**

The `AllContentTikTok` component automatically handles everything:

```typescript
import AllContentTikTok from "./app/categories/AllContentTikTok";

// In your screen component
export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <AllContentTikTok />
    </View>
  );
}
```

### **2. Manual API Usage**

If you want to use the API directly in other components:

```typescript
import { useMediaStore } from "./app/store/useUploadStore";
import allMediaAPI from "./app/utils/allMediaAPI";

function MyComponent() {
  const { allContent, allContentLoading, fetchAllContent } = useMediaStore();

  useEffect(() => {
    // Fetch all content (tries authenticated first, then public)
    fetchAllContent();
  }, []);

  return (
    <View>
      {allContentLoading ? (
        <Text>Loading...</Text>
      ) : (
        <Text>Loaded {allContent.length} items</Text>
      )}
    </View>
  );
}
```

### **3. Direct API Calls**

```typescript
import allMediaAPI from "./app/utils/allMediaAPI";

// Test all endpoints
await allMediaAPI.testAvailableEndpoints();

// Get public content (no auth required)
const publicContent = await allMediaAPI.getAllContentPublic();

// Get authenticated content (requires token)
const authContent = await allMediaAPI.getAllContentWithAuth();

// Get default content (fallback)
const defaultContent = await allMediaAPI.getDefaultContent();
```

## 🎨 **UI Features**

### **Content Sections**

Your TikTok-style UI automatically organizes content into sections:

- **Most Recent**: Latest content across all types
- **Videos**: All video content with TikTok-style player
- **Music**: All audio content with play/pause controls
- **Sermons**: All sermon content (video or audio)
- **E-Books**: All ebook content with thumbnail display

### **Interactive Elements**

Each content item includes:

- ✅ **Play/Pause**: Tap to play videos and audio
- ✅ **Progress Bar**: Shows playback progress with scrubbing
- ✅ **Volume Control**: Mute/unmute functionality
- ✅ **Like Button**: Heart icon with count
- ✅ **Comment Button**: Opens comment modal
- ✅ **Save Button**: Add to library
- ✅ **Share Button**: Share content
- ✅ **Download Button**: Download for offline use

### **TikTok-Style Features**

- ✅ **Full-Screen Video**: Tap video to go to full-screen reels
- ✅ **Swipeable Navigation**: Swipe between videos in reels
- ✅ **Auto-Pause**: Videos pause when scrolling away
- ✅ **Pull-to-Refresh**: Pull down to refresh content
- ✅ **Smooth Animations**: TikTok-style transitions

## 🔧 **Configuration**

### **Environment Variables**

Set your API URL in `.env`:

```env
EXPO_PUBLIC_API_URL=https://jevahapp-backend.onrender.com
```

### **API Endpoints**

The component automatically tries these endpoints in order:

1. `/api/media/all-content` (authenticated)
2. `/api/media/public/all-content` (public)
3. `/api/media/default` (fallback)

## 🧪 **Testing**

### **1. Run the Test Script**

```bash
node scripts/test-tiktok-integration.js
```

### **2. Check Debug Information**

The component shows debug info at the bottom:

- TikTok All Content: X items
- Default Content: X items
- Transformed Data: X items
- Videos: X, Music: X, Ebooks: X
- Loading states and errors

### **3. Console Logs**

Check the console for:

- Endpoint test results
- Data transformation logs
- Error messages
- Performance metrics

## 🎯 **Content Types Supported**

### **Videos**

- **Content Type**: `"videos"` or `"video"`
- **Features**: Full-screen player, progress bar, volume control
- **Navigation**: Tap to go to reels view

### **Music/Audio**

- **Content Type**: `"music"` or `"audio"`
- **Features**: Play/pause, progress bar, volume control
- **Display**: Thumbnail with audio controls overlay

### **Sermons**

- **Content Type**: `"sermon"`
- **Features**: Can be video or audio, same controls as above
- **Display**: Special sermon icon

### **E-Books**

- **Content Type**: `"ebook"`, `"books"`, or `"image"`
- **Features**: Thumbnail display, download, open in reader
- **Display**: Book icon with title overlay

## 🔄 **Data Flow**

### **1. Component Mount**

```
AllContentTikTok mounts
↓
Test available endpoints
↓
Try /api/media/all-content (authenticated)
↓
If fails, try /api/media/public/all-content (public)
↓
If fails, try /api/media/default (fallback)
↓
Transform data to MediaItem format
↓
Filter by content type
↓
Render TikTok-style UI
```

### **2. User Interactions**

```
User taps video
↓
Pause all other media
↓
Navigate to reels view
↓
Pass video list for swipeable navigation
```

### **3. Refresh**

```
User pulls to refresh
↓
Call refreshAllContent()
↓
Try authenticated endpoint first
↓
Fallback to public endpoint
↓
Update UI with new data
```

## 🚨 **Error Handling**

### **Network Errors**

- Automatic fallback to next endpoint
- Clear error messages in UI
- Retry functionality

### **Authentication Errors**

- Automatic fallback to public endpoint
- No user interruption
- Seamless experience

### **Data Format Errors**

- Robust field mapping
- Fallback values for missing fields
- Debug information for troubleshooting

## 📱 **Performance**

### **Optimizations**

- Memoized data transformation
- Efficient content filtering
- Lazy loading of media
- Proper cleanup of resources

### **Memory Management**

- Audio/video cleanup on unmount
- Efficient state updates
- Minimal re-renders

## 🎉 **You're Ready!**

Your TikTok-style UI is now fully integrated with the new backend endpoints. The component will automatically:

1. ✅ Test all available endpoints
2. ✅ Choose the best working endpoint
3. ✅ Transform data to the correct format
4. ✅ Display content in TikTok-style sections
5. ✅ Handle all user interactions
6. ✅ Provide debug information
7. ✅ Handle errors gracefully

Just use `<AllContentTikTok />` in your app and enjoy the TikTok-style experience!
