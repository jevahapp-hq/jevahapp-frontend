# Backend Integration Guide - getDefaultContent Endpoint

## 🎯 Frontend-Backend Integration Complete!

Your frontend refactoring is complete and ready to work with the backend. Here's what you need to implement on the backend side:

## 📋 Backend Controller Update Required

### Replace the existing `getDefaultContent` function in `src/controllers/media.controller.ts`:

```typescript
export const getDefaultContent = async (
  request: Request,
  response: Response
): Promise<void> => {
  try {
    const { contentType, limit = "10", page = "1" } = request.query;

    const limitNum = parseInt(limit as string) || 10;
    const pageNum = parseInt(page as string) || 1;
    const skip = (pageNum - 1) * limitNum;

    // Build filter for default content
    const filter: any = {
      isDefaultContent: true,
      isOnboardingContent: true,
      status: "published",
    };

    // Add contentType filter if provided
    if (contentType && contentType !== "all") {
      filter.contentType = contentType;
    }

    // Get total count for pagination
    const total = await Media.countDocuments(filter);

    // Get default content with pagination
    const defaultContentRaw = await Media.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("uploadedBy", "firstName lastName username email avatar")
      .lean();

    // Convert stored R2 object URLs to short-lived presigned URLs
    const toObjectKey = (urlString?: string): string | null => {
      if (!urlString) return null;
      try {
        const u = new URL(urlString);
        let pathname = u.pathname;
        if (pathname.startsWith("/")) pathname = pathname.slice(1);
        const bucket = process.env.R2_BUCKET;
        if (bucket && pathname.startsWith(bucket + "/")) {
          return pathname.slice(bucket.length + 1);
        }
        return pathname;
      } catch (_e) {
        return null;
      }
    };

    // Lazy import to avoid circular deps
    const { default: fileUploadService } = await import(
      "../service/fileUpload.service"
    );

    const content = await Promise.all(
      defaultContentRaw.map(async (item: any) => {
        const objectKey = toObjectKey(item.fileUrl);
        let mediaUrl = item.fileUrl;

        if (objectKey) {
          try {
            const signed = await fileUploadService.getPresignedGetUrl(
              objectKey,
              3600
            );
            mediaUrl = signed;
          } catch (_e) {
            // fallback to stored URL if signing fails
          }
        }

        // Transform to frontend-expected format
        return {
          _id: item._id,
          title: item.title || "Untitled",
          description: item.description || "",
          mediaUrl: mediaUrl,
          thumbnailUrl: item.thumbnailUrl || item.fileUrl,
          contentType: mapContentType(item.contentType),
          duration: item.duration || null,
          author: {
            _id: item.uploadedBy?._id || item.uploadedBy,
            firstName: item.uploadedBy?.firstName || "Unknown",
            lastName: item.uploadedBy?.lastName || "User",
            avatar: item.uploadedBy?.avatar || null,
          },
          likeCount: item.likeCount || 0,
          commentCount: item.commentCount || 0,
          shareCount: item.shareCount || 0,
          viewCount: item.viewCount || 0,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      })
    );

    response.status(200).json({
      success: true,
      data: {
        content,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    console.error("Get default content error:", error);
    response.status(500).json({
      success: false,
      message: "Failed to retrieve default content",
    });
  }
};

// Helper function to map content types
const mapContentType = (contentType: string): "video" | "audio" | "image" => {
  switch (contentType) {
    case "videos":
    case "sermon":
      return "video";
    case "audio":
    case "music":
    case "devotional":
      return "audio";
    case "ebook":
    case "books":
      return "image";
    default:
      return "video";
  }
};
```

## 🧪 Testing the Integration

### 1. Test the Backend Endpoint

```bash
# Test the endpoint
curl "http://localhost:3000/api/media/default-content?page=1&limit=5&contentType=all"
```

### 2. Expected Response Structure

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "title": "Amazing Gospel Video",
        "description": "A powerful message about faith and hope",
        "mediaUrl": "https://your-cdn.com/videos/amazing-gospel.mp4",
        "thumbnailUrl": "https://your-cdn.com/thumbnails/amazing-gospel.jpg",
        "contentType": "video",
        "duration": 180,
        "author": {
          "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
          "firstName": "John",
          "lastName": "Doe",
          "avatar": "https://your-cdn.com/avatars/john-doe.jpg"
        },
        "likeCount": 42,
        "commentCount": 8,
        "shareCount": 12,
        "viewCount": 1250,
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 50,
      "pages": 10
    }
  }
}
```

## 🚀 Frontend Integration Steps

### Step 1: Use the New Component

Replace your current AllContent import:

```typescript
// In your HomeTabContent.tsx or wherever AllContent is used
import AllContentNew from "../categories/AllcontentNew";

// Replace the old component
<AllContentNew />;
```

### Step 2: Test the Integration

1. **Start your backend server**
2. **Start your React Native app**
3. **Navigate to the ALL tab**
4. **Verify that content loads from the backend**

## 🔧 Key Features of the Integration

### ✅ Data Transformation

- **Content Type Mapping**: Backend content types (`videos`, `music`, `books`) are mapped to frontend types (`video`, `audio`, `image`)
- **Author Information**: User data is properly populated and formatted
- **Media URLs**: R2 URLs are converted to presigned URLs for security
- **Statistics**: Like, comment, share, and view counts are included

### ✅ Pagination Support

- **Page-based pagination** with configurable limits
- **Total count and pages** for proper pagination UI
- **Infinite scrolling** support in the frontend

### ✅ Error Handling

- **Graceful fallbacks** for missing data
- **Proper error responses** with meaningful messages
- **Network error handling** in the frontend

### ✅ Performance Optimizations

- **Lean queries** to reduce data transfer
- **Presigned URLs** for efficient media delivery
- **Pagination** to limit response sizes

## 🐛 Troubleshooting

### If you see "No content available":

1. **Check backend logs** for any errors
2. **Verify database** has content with `isDefaultContent: true`
3. **Test the endpoint** directly with curl
4. **Check network requests** in React Native debugger

### If you see loading errors:

1. **Verify API base URL** in `allMediaAPI.ts`
2. **Check authentication** token storage
3. **Ensure CORS** is configured on your backend
4. **Check network connectivity**

### If media doesn't load:

1. **Verify R2 configuration** and presigned URL generation
2. **Check media URLs** in the response
3. **Test media URLs** directly in browser
4. **Verify file permissions** in R2

## 🎉 Expected Result

After implementing this backend update, your ALL tab will:

- ✅ **Load real content** from your database
- ✅ **Display Instagram-style cards** with proper formatting
- ✅ **Handle different content types** (video, audio, image)
- ✅ **Show author information** with avatars
- ✅ **Support pagination** and infinite scrolling
- ✅ **Handle errors gracefully** with proper fallbacks

## 📱 Frontend Files Ready

Your frontend is already prepared with:

- ✅ `AllcontentNew.tsx` - New component using backend data
- ✅ `ContentCard.tsx` - Instagram-style content cards
- ✅ `allMediaAPI.ts` - API integration with `getDefaultContent`
- ✅ `useUploadStore.tsx` - State management for backend data

## 🚀 Next Steps

1. **Implement the backend controller** update
2. **Test the endpoint** with curl
3. **Update your frontend** to use `AllContentNew`
4. **Test the full integration**
5. **Deploy and enjoy** your new Instagram-style content feed!

The integration is designed to be seamless and maintain your existing architecture while adding modern backend integration! 🎉
