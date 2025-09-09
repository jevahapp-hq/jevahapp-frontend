# Frontend-Backend Integration Plan

## 🎯 **Integration Strategy**

This document outlines how to integrate the current frontend with the backend engineer's proposed API structure while maintaining all existing functionality and UI design.

## 🔄 **Current vs. Proposed API Mapping**

### **1. Media Fetching Endpoints**

**Current Frontend**: Uses various category-specific endpoints
**Proposed Backend**: `GET /api/media/public/all-content` and `GET /api/media/public?category={category}`

**Integration Plan**:
```typescript
// Update contentInteractionAPI.ts to use new endpoints
class ContentInteractionService {
  // New method for fetching all media
  async fetchAllMedia(page: number = 1, limit: number = 20) {
    const response = await fetch(`${this.baseURL}/api/media/public/all-content?page=${page}&limit=${limit}`);
    return response.json();
  }

  // New method for category-based fetching
  async fetchMediaByCategory(category: string, page: number = 1, limit: number = 20) {
    const response = await fetch(`${this.baseURL}/api/media/public?category=${category}&page=${page}&limit=${limit}`);
    return response.json();
  }
}
```

### **2. Social Interaction Endpoints**

**Current Frontend**: Uses `/api/interactions/media/{contentId}/like` etc.
**Proposed Backend**: Uses `/api/media/{mediaId}/favorite`, `/api/media/{mediaId}/save` etc.

**Integration Plan**:
```typescript
// Update existing methods to use new endpoints
class ContentInteractionService {
  async toggleLike(contentId: string, contentType: string) {
    // Map to new endpoint
    const response = await fetch(`${this.baseURL}/api/media/${contentId}/favorite`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ actionType: 'favorite' })
    });
    
    const data = await response.json();
    return {
      liked: data.action?.isFavorited || false,
      totalLikes: data.media?.likeCount || 0
    };
  }

  async toggleSave(contentId: string, contentType: string) {
    // Map to new endpoint
    const response = await fetch(`${this.baseURL}/api/media/${contentId}/save`, {
      method: 'POST',
      headers: await this.getAuthHeaders()
    });
    
    const data = await response.json();
    return {
      saved: data.bookmark?.isBookmarked || false,
      totalSaves: data.media?.saveCount || 0
    };
  }

  async recordShare(contentId: string, contentType: string, shareMethod: string = 'generic') {
    // Map to new endpoint
    const response = await fetch(`${this.baseURL}/api/media/${contentId}/share`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ platform: shareMethod })
    });
    
    const data = await response.json();
    return {
      shared: true,
      totalShares: data.media?.shareCount || 0,
      shareUrl: data.share?.shareUrl
    };
  }
}
```

## 🏗️ **Implementation Steps**

### **Phase 1: API Endpoint Mapping (Week 1)**

**1. Update Content Interaction API**
```typescript
// app/utils/contentInteractionAPI.ts
export class ContentInteractionService {
  // Add new methods while keeping existing ones
  async fetchAllMedia(page: number = 1, limit: number = 20) {
    try {
      const response = await fetch(`${this.baseURL}/api/media/public/all-content?page=${page}&limit=${limit}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      return this.transformBackendResponse(data);
    } catch (error) {
      console.error('Error fetching all media:', error);
      // Fallback to existing method if available
      return this.fallbackFetchMedia();
    }
  }

  private transformBackendResponse(backendData: any) {
    // Transform backend response to match frontend expectations
    return {
      media: backendData.media.map((item: any) => ({
        _id: item._id,
        title: item.title,
        contentType: item.contentType,
        category: item.category,
        uploadedBy: item.uploadedBy,
        viewCount: item.viewCount,
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        shareCount: item.shareCount,
        saveCount: item.saveCount,
        isLive: item.isLive,
        thumbnailUrl: item.thumbnailUrl,
        mediaUrl: item.mediaUrl,
        duration: item.duration,
        createdAt: item.createdAt,
        // Map user interaction states
        userHasLiked: item.userHasLiked || false,
        userHasSaved: item.userHasSaved || false,
        userHasShared: item.userHasShared || false,
        userLastViewed: item.userLastViewed
      })),
      pagination: backendData.pagination
    };
  }
}
```

**2. Update Interaction Store**
```typescript
// app/store/useInteractionStore.tsx
export const useInteractionStore = create<InteractionState>()(
  subscribeWithSelector((set, get) => ({
    // ... existing state

    // Add new actions for backend integration
    fetchAllMedia: async (page: number = 1, limit: number = 20) => {
      try {
        const result = await contentInteractionAPI.fetchAllMedia(page, limit);
        // Store media data for use in components
        set((state) => ({
          allMedia: result.media,
          mediaPagination: result.pagination
        }));
        return result;
      } catch (error) {
        console.error('Error fetching all media:', error);
        throw error;
      }
    },

    fetchMediaByCategory: async (category: string, page: number = 1, limit: number = 20) => {
      try {
        const result = await contentInteractionAPI.fetchMediaByCategory(category, page, limit);
        set((state) => ({
          categoryMedia: { ...state.categoryMedia, [category]: result.media },
          categoryPagination: { ...state.categoryPagination, [category]: result.pagination }
        }));
        return result;
      } catch (error) {
        console.error('Error fetching category media:', error);
        throw error;
      }
    }
  }))
);
```

### **Phase 2: Component Updates (Week 2)**

**1. Update Media Components to Use New Data Structure**
```typescript
// app/categories/Allcontent.tsx
function AllContent() {
  const { fetchAllMedia, allMedia, mediaPagination } = useInteractionStore();
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAllMedia(currentPage, 20);
  }, [currentPage]);

  const renderMusicCard = (audio: any, index: number) => {
    // Use new data structure
    const modalKey = `music-${audio._id || index}`;
    
    return (
      <View key={modalKey}>
        {/* ... existing UI structure ... */}
        
        {/* Right side actions - now using new data structure */}
        <View className="flex-col absolute mt-[170px] right-4">
          <TouchableOpacity onPress={() => handleFavorite(modalKey, audio)}>
            <MaterialIcons
              name={audio.userHasLiked ? "favorite" : "favorite-border"}
              size={30}
              color={audio.userHasLiked ? "#D22A2A" : "#FFFFFF"}
            />
            <Text className="text-[10px] text-white font-rubik-semibold">
              {audio.likeCount}
            </Text>
          </TouchableOpacity>
          
          <View className="flex-col justify-center items-center mt-6">
            <CommentIcon 
              comments={[]} // Will be loaded separately
              size={30}
              color="white"
              showCount={true}
              count={audio.commentCount}
              layout="vertical"
            />
          </View>
          
          <TouchableOpacity onPress={() => handleSave(modalKey, audio)}>
            <MaterialIcons
              name={audio.userHasSaved ? "bookmark" : "bookmark-border"}
              size={30}
              color={audio.userHasSaved ? "#FEA74E" : "#FFFFFF"}
            />
            <Text className="text-[10px] text-white font-rubik-semibold">
              {audio.saveCount}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View>
      {/* ... existing UI structure ... */}
      <FlatList
        data={allMedia}
        renderItem={({ item, index }) => renderMusicCard(item, index)}
        keyExtractor={(item) => item._id}
        onEndReached={() => {
          if (mediaPagination?.hasNext) {
            setCurrentPage(prev => prev + 1);
          }
        }}
        onEndReachedThreshold={0.1}
      />
    </View>
  );
}
```

**2. Update Interaction Buttons Component**
```typescript
// app/components/InteractionButtons.tsx
export default function InteractionButtons({
  contentId,
  contentType,
  contentTitle,
  contentUrl,
  layout = 'vertical',
  iconSize = 30,
  showCounts = true,
  onCommentPress,
}: InteractionButtonsProps) {
  const {
    toggleLike,
    toggleSave,
    recordShare,
    loadContentStats,
    comments,
  } = useInteractionStore();

  // Use new data structure from backend
  const contentStats = useContentStats(contentId);
  const isLiked = useUserInteraction(contentId, 'liked');
  const isSaved = useUserInteraction(contentId, 'saved');
  
  // Get counts from new data structure
  const likesCount = useContentCount(contentId, 'likes');
  const savesCount = useContentCount(contentId, 'saves');
  const sharesCount = useContentCount(contentId, 'shares');
  const commentsCount = useContentCount(contentId, 'comments');

  // ... rest of component remains the same
}
```

### **Phase 3: Data Transformation Layer (Week 3)**

**1. Create Backend Response Adapter**
```typescript
// app/utils/backendAdapter.ts
export class BackendResponseAdapter {
  // Transform backend media response to frontend format
  static transformMediaResponse(backendData: any) {
    return {
      media: backendData.media.map((item: any) => ({
        _id: item._id,
        title: item.title,
        contentType: item.contentType,
        category: item.category,
        uploadedBy: {
          firstName: item.uploadedBy.firstName,
          lastName: item.uploadedBy.lastName,
          avatar: item.uploadedBy.avatar,
          isVerified: item.uploadedBy.isVerified
        },
        viewCount: item.viewCount,
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        shareCount: item.shareCount,
        saveCount: item.saveCount,
        isLive: item.isLive,
        thumbnailUrl: item.thumbnailUrl,
        mediaUrl: item.mediaUrl,
        duration: item.duration,
        createdAt: item.createdAt,
        // User interaction states
        userHasLiked: item.userHasLiked || false,
        userHasSaved: item.userHasSaved || false,
        userHasShared: item.userHasShared || false,
        userLastViewed: item.userLastViewed
      })),
      pagination: backendData.pagination
    };
  }

  // Transform backend interaction response
  static transformInteractionResponse(backendData: any, interactionType: string) {
    switch (interactionType) {
      case 'like':
        return {
          liked: backendData.action?.isFavorited || false,
          totalLikes: backendData.media?.likeCount || 0
        };
      case 'save':
        return {
          saved: backendData.bookmark?.isBookmarked || false,
          totalSaves: backendData.media?.saveCount || 0
        };
      case 'share':
        return {
          shared: true,
          totalShares: backendData.media?.shareCount || 0,
          shareUrl: backendData.share?.shareUrl
        };
      default:
        return backendData;
    }
  }
}
```

**2. Update API Service to Use Adapter**
```typescript
// app/utils/contentInteractionAPI.ts
import { BackendResponseAdapter } from './backendAdapter';

export class ContentInteractionService {
  async fetchAllMedia(page: number = 1, limit: number = 20) {
    try {
      const response = await fetch(`${this.baseURL}/api/media/public/all-content?page=${page}&limit=${limit}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const backendData = await response.json();
      return BackendResponseAdapter.transformMediaResponse(backendData);
    } catch (error) {
      console.error('Error fetching all media:', error);
      throw error;
    }
  }

  async toggleLike(contentId: string, contentType: string) {
    try {
      const response = await fetch(`${this.baseURL}/api/media/${contentId}/favorite`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({ actionType: 'favorite' })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const backendData = await response.json();
      return BackendResponseAdapter.transformInteractionResponse(backendData, 'like');
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }
}
```

## 🔧 **Backward Compatibility**

### **1. Fallback Mechanisms**
```typescript
// Keep existing endpoints as fallbacks
class ContentInteractionService {
  async toggleLike(contentId: string, contentType: string) {
    try {
      // Try new endpoint first
      return await this.newToggleLike(contentId, contentType);
    } catch (error) {
      console.warn('New endpoint failed, falling back to old endpoint:', error);
      // Fallback to existing endpoint
      return await this.legacyToggleLike(contentId, contentType);
    }
  }

  private async newToggleLike(contentId: string, contentType: string) {
    // New backend endpoint
    const response = await fetch(`${this.baseURL}/api/media/${contentId}/favorite`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ actionType: 'favorite' })
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    return BackendResponseAdapter.transformInteractionResponse(data, 'like');
  }

  private async legacyToggleLike(contentId: string, contentType: string) {
    // Existing endpoint as fallback
    const response = await fetch(`${this.baseURL}/api/interactions/media/${contentId}/like`, {
      method: 'POST',
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ contentType })
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    return {
      liked: Boolean(data?.liked),
      totalLikes: Number(data?.totalLikes ?? 0)
    };
  }
}
```

### **2. Environment-Based Endpoint Selection**
```typescript
// app/utils/api.ts
export const API_CONFIG = {
  useNewEndpoints: process.env.EXPO_PUBLIC_USE_NEW_ENDPOINTS === 'true',
  newBaseURL: 'https://jevahapp-backend.onrender.com',
  legacyBaseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.156.136.168:4000'
};

export function getEndpointURL(path: string): string {
  const baseURL = API_CONFIG.useNewEndpoints ? API_CONFIG.newBaseURL : API_CONFIG.legacyBaseURL;
  return `${baseURL}${path}`;
}
```

## 📊 **Testing Strategy**

### **1. Integration Testing**
```typescript
// app/utils/__tests__/backendIntegration.test.ts
describe('Backend Integration', () => {
  test('should transform backend response correctly', () => {
    const mockBackendResponse = {
      media: [{
        _id: 'test123',
        title: 'Test Content',
        contentType: 'video',
        likeCount: 100,
        userHasLiked: true
      }],
      pagination: { page: 1, hasNext: false }
    };

    const transformed = BackendResponseAdapter.transformMediaResponse(mockBackendResponse);
    
    expect(transformed.media[0]).toHaveProperty('userHasLiked');
    expect(transformed.media[0].likeCount).toBe(100);
  });
});
```

### **2. Endpoint Testing**
```typescript
// Test both old and new endpoints
describe('API Endpoints', () => {
  test('should use new endpoint when available', async () => {
    const service = new ContentInteractionService();
    const result = await service.toggleLike('test123', 'video');
    
    expect(result).toHaveProperty('liked');
    expect(result).toHaveProperty('totalLikes');
  });

  test('should fallback to old endpoint on failure', async () => {
    // Mock new endpoint to fail
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    
    const service = new ContentInteractionService();
    const result = await service.toggleLike('test123', 'video');
    
    expect(result).toHaveProperty('liked');
  });
});
```

## 🚀 **Deployment Strategy**

### **1. Gradual Rollout**
```typescript
// Phase 1: Enable new endpoints for 10% of users
const shouldUseNewEndpoints = () => {
  const userId = getCurrentUserId();
  const hash = hashString(userId);
  return hash % 10 === 0; // 10% of users
};

// Phase 2: Enable for 50% of users
const shouldUseNewEndpoints = () => {
  const userId = getCurrentUserId();
  const hash = hashString(userId);
  return hash % 2 === 0; // 50% of users
};

// Phase 3: Enable for all users
const shouldUseNewEndpoints = () => true;
```

### **2. Feature Flags**
```typescript
// app/utils/featureFlags.ts
export const FEATURE_FLAGS = {
  NEW_BACKEND_ENDPOINTS: process.env.EXPO_PUBLIC_NEW_BACKEND === 'true',
  ENHANCED_ANALYTICS: process.env.EXPO_PUBLIC_ENHANCED_ANALYTICS === 'true',
  REAL_TIME_UPDATES: process.env.EXPO_PUBLIC_REAL_TIME === 'true'
};
```

## 📈 **Performance Monitoring**

### **1. Metrics to Track**
```typescript
// Track API performance
const trackAPIPerformance = (endpoint: string, duration: number, success: boolean) => {
  analytics.track('api_performance', {
    endpoint,
    duration,
    success,
    timestamp: Date.now()
  });
};

// Track user interaction success rates
const trackInteractionSuccess = (interactionType: string, success: boolean) => {
  analytics.track('interaction_success', {
    type: interactionType,
    success,
    timestamp: Date.now()
  });
};
```

### **2. Error Monitoring**
```typescript
// Monitor endpoint failures
const monitorEndpointHealth = (endpoint: string, error: Error) => {
  console.error(`Endpoint health check failed: ${endpoint}`, error);
  
  // Send to monitoring service
  errorReporting.captureException(error, {
    tags: { endpoint, type: 'api_failure' }
  });
};
```

## 🎯 **Success Metrics**

### **1. Technical Metrics**
- ✅ API response time < 500ms
- ✅ 99.9% endpoint availability
- ✅ Zero breaking changes to existing UI
- ✅ Successful fallback to legacy endpoints

### **2. User Experience Metrics**
- ✅ All interaction buttons working
- ✅ Real-time count updates
- ✅ Smooth UI animations maintained
- ✅ No user-facing errors

### **3. Business Metrics**
- ✅ Increased user engagement
- ✅ Better data accuracy
- ✅ Improved performance
- ✅ Enhanced analytics capabilities

---

**Implementation Timeline**: 3 weeks
**Risk Level**: Low (backward compatible)
**Testing Required**: Integration testing, user acceptance testing
**Rollout Strategy**: Gradual rollout with feature flags

