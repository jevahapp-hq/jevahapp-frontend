# Backend Library System Fix Required

## 🚨 **Critical Issue Identified**

The current library system is **NOT user-specific**. The API endpoint `/api/bookmarks/get-bookmarked-media` is returning default/onboarding content instead of actual user bookmarks.

## 📊 **Current Problem Analysis**

### What the API Currently Returns:

```json
{
  "media": [
    {
      "_id": "68b6c565a65fe359311eaf79",
      "title": "In His Face - Bob Sorge",
      "isDefaultContent": true,
      "isOnboardingContent": true,
      "isInLibrary": false, // ❌ This should be true for user bookmarks
      "uploadedBy": "750000000000000000000007" // ❌ This is a system user, not the actual user
    }
  ],
  "success": true
}
```

### What We Need:

```json
{
  "media": [
    {
      "_id": "68b6c565a65fe359311eaf79",
      "title": "In His Face - Bob Sorge",
      "isDefaultContent": false,
      "isOnboardingContent": false,
      "isInLibrary": true, // ✅ Should be true for user bookmarks
      "bookmarkedBy": "actual_user_id_here", // ✅ Should contain actual user ID
      "bookmarkedAt": "2025-01-XX...", // ✅ When user bookmarked it
      "uploadedBy": "750000000000000000000007"
    }
  ],
  "success": true
}
```

## 🔧 **Required Backend Changes**

### 1. **Fix Bookmark Endpoint** (`POST /api/media/:id/bookmark`)

**Current Issue**: Returns `{"success":false,"message":"Media already saved"}` even for new bookmarks.

**Required Fix**:

```javascript
// In your bookmark controller
async bookmarkContent(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id; // Get actual user ID from auth

    // Check if already bookmarked by this user
    const existingBookmark = await Bookmark.findOne({
      mediaId: id,
      userId: userId
    });

    if (existingBookmark) {
      return res.status(400).json({
        success: false,
        message: "Media already saved"
      });
    }

    // Create new bookmark
    const bookmark = new Bookmark({
      mediaId: id,
      userId: userId,
      bookmarkedAt: new Date()
    });

    await bookmark.save();

    res.json({
      success: true,
      message: "Media saved to library",
      data: bookmark
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to save media",
      error: error.message
    });
  }
}
```

### 2. **Fix Get Bookmarks Endpoint** (`GET /api/bookmarks/get-bookmarked-media`)

**Current Issue**: Returns default content instead of user bookmarks.

**Required Fix**:

```javascript
// In your bookmarks controller
async getBookmarkedMedia(req, res) {
  try {
    const userId = req.user.id; // Get actual user ID from auth
    const { page = 1, limit = 20 } = req.query;

    // Get user's bookmarks
    const bookmarks = await Bookmark.find({ userId })
      .populate('mediaId') // Populate the actual media data
      .sort({ bookmarkedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Transform the data to include bookmark info
    const bookmarkedMedia = bookmarks.map(bookmark => ({
      ...bookmark.mediaId.toObject(),
      isInLibrary: true,
      bookmarkedBy: userId,
      bookmarkedAt: bookmark.bookmarkedAt,
      isDefaultContent: false,
      isOnboardingContent: false
    }));

    res.json({
      success: true,
      data: {
        media: bookmarkedMedia,
        total: bookmarkedMedia.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get bookmarked media",
      error: error.message
    });
  }
}
```

### 3. **Fix Unbookmark Endpoint** (`DELETE /api/bookmarks/:mediaId`)

**Required Fix**:

```javascript
// In your bookmarks controller
async unbookmarkContent(req, res) {
  try {
    const { mediaId } = req.params;
    const userId = req.user.id; // Get actual user ID from auth

    // Find and delete the bookmark
    const bookmark = await Bookmark.findOneAndDelete({
      mediaId: mediaId,
      userId: userId
    });

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        message: "Bookmark not found"
      });
    }

    res.json({
      success: true,
      message: "Media removed from library"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to remove bookmark",
      error: error.message
    });
  }
}
```

## 🗄️ **Required Database Schema**

### Bookmark Collection/Table:

```javascript
// MongoDB Schema
const bookmarkSchema = new mongoose.Schema(
  {
    mediaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      required: true,
    },
    userId: {
      type: String, // or ObjectId if you have User model
      required: true,
    },
    bookmarkedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Add compound index for performance
bookmarkSchema.index({ userId: 1, mediaId: 1 }, { unique: true });
```

### SQL Alternative:

```sql
CREATE TABLE bookmarks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  media_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_media (user_id, media_id)
);
```

## 🧪 **Testing Requirements**

### Test Cases to Implement:

1. **Bookmark New Content**:

   - POST `/api/media/:id/bookmark`
   - Should return `{"success": true, "message": "Media saved to library"}`

2. **Bookmark Already Saved Content**:

   - POST `/api/media/:id/bookmark` (same content again)
   - Should return `{"success": false, "message": "Media already saved"}`

3. **Get User Bookmarks**:

   - GET `/api/bookmarks/get-bookmarked-media`
   - Should return only content bookmarked by the authenticated user
   - Should include `isInLibrary: true` for all returned items

4. **Remove Bookmark**:
   - DELETE `/api/bookmarks/:mediaId`
   - Should return `{"success": true, "message": "Media removed from library"}`

## 🎯 **Expected Frontend Behavior After Fix**

1. **Empty Library**: New users should see "No saved content yet"
2. **User-Specific**: Each user sees only their own bookmarks
3. **Real-Time Updates**: Bookmarking content immediately appears in library
4. **Proper Filtering**: No default/onboarding content in user library

## 🚀 **Priority**

**HIGH PRIORITY** - This is blocking the core library functionality. Users cannot save content to their personal library.

## 📞 **Next Steps**

1. Implement the bookmark database schema
2. Update the three API endpoints as specified above
3. Test with the frontend debug button
4. Verify user-specific data is returned

---

**Note**: The frontend is ready and will work immediately once these backend changes are implemented.
