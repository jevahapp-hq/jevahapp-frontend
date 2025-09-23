// Content Interaction API Service
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL } from './api';

// Types for content interactions
export interface ContentInteraction {
  contentId: string;
  contentType: 'video' | 'audio' | 'ebook' | 'sermon' | 'live';
  userId: string;
  interactionType: 'like' | 'save' | 'share' | 'view' | 'comment';
  timestamp: string;
}

export interface ContentStats {
  contentId: string;
  likes: number;
  saves: number;
  shares: number;
  views: number;
  comments: number;
  userInteractions: {
    liked: boolean;
    saved: boolean;
    shared: boolean;
    viewed: boolean;
  };
}

export interface CommentData {
  id: string;
  contentId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  comment: string;
  timestamp: string;
  likes: number;
  replies?: CommentData[];
}

class ContentInteractionService {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL || 'http://localhost:3000'; // Fallback for development
  }

  private isValidObjectId(id?: string): boolean {
    return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id);
  }

  // Get authorization header with user token
  private async getAuthHeaders(): Promise<HeadersInit> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      
      // Try multiple token keys since your app uses different ones
      let token = await AsyncStorage.getItem('userToken'); // From api.ts
      if (!token) {
        token = await AsyncStorage.getItem('token'); // From login.tsx, codeVerification.tsx
      }
      if (!token) {
        // Try SecureStore for OAuth tokens
        try {
          const { default: SecureStore } = await import('expo-secure-store');
          token = await SecureStore.getItemAsync('jwt'); // From OAuth flow
        } catch (secureStoreError) {
          console.log('SecureStore not available or no JWT token');
        }
      }
      
      // DEBUG: Log token status
      console.log('🔍 AUTH DEBUG: userStr exists:', !!userStr);
      console.log('🔍 AUTH DEBUG: token exists:', !!token);
      console.log('🔍 AUTH DEBUG: token value:', token ? `${token.substring(0, 20)}...` : 'null');
      console.log('🔍 AUTH DEBUG: token source:', 
        await AsyncStorage.getItem('userToken') ? 'userToken' :
        await AsyncStorage.getItem('token') ? 'token' : 'jwt/none'
      );
      
      if (token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'expo-platform': Platform.OS,
        };
      }
      
      console.warn('⚠️ No token found in AsyncStorage or SecureStore');
      return {
        'Content-Type': 'application/json',
        'expo-platform': Platform.OS,
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      return {
        'Content-Type': 'application/json',
        'expo-platform': Platform.OS,
      };
    }
  }

  // Get current user ID
  private async getCurrentUserId(): Promise<string> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user._id || user.id || user.email || 'anonymous';
      }
      return 'anonymous';
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return 'anonymous';
    }
  }

  // ============= LIKE INTERACTIONS =============
  async toggleLike(contentId: string, contentType: string): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      if (!this.isValidObjectId(contentId)) {
        return this.fallbackToggleLike(contentId);
      }
      const headers = await this.getAuthHeaders();
      
      // Try the alternative endpoint pattern first (from allMediaAPI)
      let response = await fetch(`${this.baseURL}/api/content/${contentType}/${contentId}/like`, {
        method: 'POST',
        headers,
      });

      // If that fails, try the original endpoint
      if (!response.ok) {
        console.log(`🔄 Trying alternative like endpoint for ${contentId}`);
        response = await fetch(`${this.baseURL}/api/interactions/media/${contentId}/like`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ contentType }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const data = (raw && raw.data) ? raw.data : raw;
      return {
        liked: Boolean(data?.liked),
        totalLikes: Number(data?.totalLikes ?? 0),
      };
    } catch (error) {
      console.error('Error toggling like:', error);
      // Fallback to local storage if API fails
      return this.fallbackToggleLike(contentId);
    }
  }

  // ============= SAVE INTERACTIONS =============
  async toggleSave(contentId: string, contentType: string): Promise<{ saved: boolean; totalSaves: number }> {
    try {
      const headers = await this.getAuthHeaders();
      
      // DEBUG: Log the request details
      console.log(`🔍 SAVE DEBUG: Making request to ${this.baseURL}/api/interactions/media/${contentId}/save`);
      console.log(`🔍 SAVE DEBUG: Headers:`, headers);
      console.log(`🔍 SAVE DEBUG: Body:`, { contentType });
      
      // Try alternative endpoint patterns for save functionality
      let response = await fetch(`${this.baseURL}/api/content/${contentType}/${contentId}/save`, {
        method: 'POST',
        headers,
      });

      // If that fails, try the original endpoint
      if (!response.ok) {
        console.log(`🔄 Trying alternative save endpoint for ${contentId}`);
        response = await fetch(`${this.baseURL}/api/interactions/media/${contentId}/save`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ contentType }),
        });
      }

      // DEBUG: Log response details
      console.log(`🔍 SAVE DEBUG: Response status: ${response.status}`);
      console.log(`🔍 SAVE DEBUG: Response headers:`, response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔍 SAVE DEBUG: Error response body:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log(`🔍 SAVE DEBUG: Success response:`, data);
      
      // Sync with library store - this will handle user-specific saves
      await this.syncWithLibraryStore(contentId, data.saved);
      
      return {
        saved: data.saved,
        totalSaves: data.totalSaves, // This comes from backend - total across all users
      };
    } catch (error) {
      console.error('Error toggling save:', error);
      return this.fallbackToggleSave(contentId);
    }
  }

  // Add method to get initial save state from backend
  async getContentSaveState(contentId: string): Promise<{ saved: boolean; totalSaves: number }> {
    try {
      const headers = await this.getAuthHeaders();
      
      // DEBUG: Log the request details
      console.log(`🔍 GET SAVE STATE: Making request to ${this.baseURL}/api/interactions/media/${contentId}/saved-status`);
      console.log(`🔍 GET SAVE STATE: Headers:`, headers);
      
      const response = await fetch(`${this.baseURL}/api/interactions/media/${contentId}/saved-status`, {
        headers,
      });

      // DEBUG: Log response details
      console.log(`🔍 GET SAVE STATE: Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`🔍 GET SAVE STATE: Error response body:`, errorText);
        
        // If it's a 500 error, use fallback
        if (response.status === 500) {
          return this.fallbackGetSaveState(contentId);
        }
        
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const data = await response.json();
      console.log(`🔍 GET SAVE STATE: Success response:`, data);
      return {
        saved: data.saved,
        totalSaves: data.totalSaves || 0,
      };
    } catch (error) {
      console.error('Error getting save state:', error);
      return this.fallbackGetSaveState(contentId);
    }
  }

  // Fallback method for getting save state when backend fails
  private async fallbackGetSaveState(contentId: string): Promise<{ saved: boolean; totalSaves: number }> {
    try {
      const userId = await this.getCurrentUserId();
      const key = `userSaves_${userId}`;
      const savesStr = await AsyncStorage.getItem(key);
      const saves = savesStr ? JSON.parse(savesStr) : {};
      
      const isSaved = saves[contentId] || false;
      const totalSaves = Object.values(saves).filter(Boolean).length;
      
      console.log(`🔍 FALLBACK SAVE STATE: User ${userId}, content ${contentId}, saved: ${isSaved}, totalSaves: ${totalSaves}`);
      
      return {
        saved: isSaved,
        totalSaves: totalSaves,
      };
    } catch (error) {
      console.error('Fallback get save state failed:', error);
      return { saved: false, totalSaves: 0 };
    }
  }

  // Synchronize save state with library store
  private async syncWithLibraryStore(contentId: string, isSaved: boolean): Promise<void> {
    try {
      const { useLibraryStore } = await import('../store/useLibraryStore');
      const libraryStore = useLibraryStore.getState();
      
      if (isSaved) {
        // Item was saved but library store management is handled in components
        // This ensures the API and library store stay in sync
        console.log(`✅ Content ${contentId} saved - library sync handled by component`);
      } else {
        // Item was unsaved, remove from library store
        await libraryStore.removeFromLibrary(contentId);
        console.log(`🗑️ Content ${contentId} removed from library`);
      }
    } catch (error) {
      console.error('Error syncing with library store:', error);
    }
  }

  // ============= SHARE INTERACTIONS =============
  async recordShare(contentId: string, contentType: string, shareMethod: string = 'generic', message?: string): Promise<{ totalShares: number }> {
    try {
      if (!this.isValidObjectId(contentId)) {
        // No server call; just return 0 to avoid noise
        return { totalShares: 0 };
      }
      const headers = await this.getAuthHeaders();
      // Try alternative endpoint patterns for share functionality
      let response = await fetch(`${this.baseURL}/api/content/${contentType}/${contentId}/share`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ platform: shareMethod, message: message || '' }),
      });

      // If that fails, try the original endpoint
      if (!response.ok) {
        console.log(`🔄 Trying alternative share endpoint for ${contentId}`);
        response = await fetch(`${this.baseURL}/api/interactions/media/${contentId}/share`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ platform: shareMethod, message: message || '' }),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Optionally fetch share stats for an updated count
      try {
        const statsRes = await fetch(`${this.baseURL}/api/interactions/media/${contentId}/share-stats`, {
          headers,
        });
        if (statsRes.ok) {
          const rawStats = await statsRes.json();
          const statsData = (rawStats && rawStats.data) ? rawStats.data : rawStats;
          const total = Number(statsData?.totalShares ?? statsData?.shares ?? 0);
          return { totalShares: total };
        }
      } catch {}
      return { totalShares: 0 };
    } catch (error) {
      console.error('Error recording share:', error);
      return { totalShares: 0 };
    }
  }

  // ============= VIEW INTERACTIONS =============
  async recordView(contentId: string, contentType: string, duration?: number): Promise<{ totalViews: number }> {
    try {
      const headers = await this.getAuthHeaders();
      // If you expose a views endpoint under interactions, update this path accordingly
      const response = await fetch(`${this.baseURL}/api/content/${contentId}/view`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contentType, duration }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        totalViews: data.totalViews,
      };
    } catch (error) {
      console.error('Error recording view:', error);
      return { totalViews: 0 };
    }
  }

  // ============= COMMENT INTERACTIONS =============
  async addComment(contentId: string, comment: string, parentCommentId?: string): Promise<CommentData> {
    try {
      if (!this.isValidObjectId(contentId)) {
        throw new Error('Invalid content ID');
      }
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/interactions/media/${contentId}/comment`, {
        method: 'POST',
        headers,
        // Backend expects { content, parentCommentId }
        body: JSON.stringify({ content: comment, parentCommentId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const data = (raw && raw.data) ? raw.data : raw;
      // Transform server comment → CommentData
      const transformed: CommentData = {
        id: String(data?._id || data?.id),
        contentId: String(contentId),
        userId: String(data?.userId || data?.authorId || ''),
        username: String(data?.username || data?.user?.username || 'User'),
        userAvatar: data?.userAvatar || data?.user?.avatarUrl,
        comment: String(data?.content || ''),
        timestamp: String(data?.createdAt || new Date().toISOString()),
        likes: Number(data?.reactionsCount || data?.likes || 0),
        replies: Array.isArray(data?.replies) ? data.replies.map((r: any) => ({
          id: String(r?._id || r?.id),
          contentId: String(contentId),
          userId: String(r?.userId || r?.authorId || ''),
          username: String(r?.username || r?.user?.username || 'User'),
          userAvatar: r?.userAvatar || r?.user?.avatarUrl,
          comment: String(r?.content || ''),
          timestamp: String(r?.createdAt || new Date().toISOString()),
          likes: Number(r?.reactionsCount || r?.likes || 0),
        })) : [],
      };
      return transformed;
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  async getComments(contentId: string, page: number = 1, limit: number = 20): Promise<{ comments: CommentData[]; totalComments: number; hasMore: boolean }> {
    try {
      if (!this.isValidObjectId(contentId)) {
        return { comments: [], totalComments: 0, hasMore: false };
      }
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.baseURL}/api/interactions/media/${contentId}/comments?page=${page}&limit=${limit}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const payload = (raw && raw.data) ? raw.data : raw;
      const serverComments: any[] = payload?.comments || payload?.items || payload?.data || [];
      const total = Number(payload?.total || payload?.totalCount || serverComments.length || 0);
      const hasMore = Boolean(payload?.hasMore || (page * limit < total));
      const comments: CommentData[] = serverComments.map((c: any) => ({
        id: String(c?._id || c?.id),
        contentId: String(contentId),
        userId: String(c?.userId || c?.authorId || ''),
        username: String(c?.username || c?.user?.username || 'User'),
        userAvatar: c?.userAvatar || c?.user?.avatarUrl,
        comment: String(c?.content || c?.comment || ''),
        timestamp: String(c?.createdAt || c?.timestamp || new Date().toISOString()),
        likes: Number(c?.reactionsCount || c?.likes || 0),
      }));
      return { comments, totalComments: total, hasMore };
    } catch (error) {
      console.error('Error getting comments:', error);
      return { comments: [], totalComments: 0, hasMore: false };
    }
  }

  async toggleCommentLike(commentId: string): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      if (!this.isValidObjectId(commentId)) {
        return { liked: false, totalLikes: 0 };
      }
      const headers = await this.getAuthHeaders();
      // Use reaction endpoint with correct body shape
      const response = await fetch(`${this.baseURL}/api/interactions/comments/${commentId}/reaction`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reactionType: 'like' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const raw = await response.json();
      const data = (raw && raw.data) ? raw.data : raw;
      return {
        liked: Boolean(data?.liked ?? true),
        totalLikes: Number(data?.totalLikes ?? data?.reactionsCount ?? 0),
      };
    } catch (error) {
      console.error('Error toggling comment like:', error);
      return { liked: false, totalLikes: 0 };
    }
  }

  // ============= GET CONTENT STATS =============
  async getContentStats(contentId: string): Promise<ContentStats> {
    try {
      // If ID is not a valid ObjectId, skip server call and use fallback
      if (!this.isValidObjectId(contentId)) {
        return this.fallbackGetStats(contentId);
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/content/${contentId}/stats`, {
        headers,
      });

      if (response.ok) {
        return await response.json();
      }

      // Gracefully fallback on 404 or any non-OK
      if (response.status === 404) {
        console.warn(`⚠️ content stats 404 for ${contentId}. Falling back to local stats.`);
      }
      return this.fallbackGetStats(contentId);
    } catch (error) {
      console.error('Error getting content stats:', error);
      return this.fallbackGetStats(contentId);
    }
  }

  // ============= BATCH OPERATIONS =============
  async getBatchContentStats(contentIds: string[]): Promise<Record<string, ContentStats>> {
    try {
      // Filter to valid IDs only; if none, return empty to avoid server errors
      const validIds = (contentIds || []).filter((id) => this.isValidObjectId(id));
      if (validIds.length === 0) {
        return {};
      }

      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseURL}/api/content/batch-stats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contentIds: validIds }),
      });

      if (response.ok) {
        return await response.json();
      }

      // If endpoint not found or other non-OK, gracefully fall back to per-id fetches
      if (response.status === 404) {
        console.warn('⚠️ batch-stats endpoint not found (404). Falling back to individual stats requests.');
      } else {
        console.warn(`⚠️ batch-stats request failed with status ${response.status}. Falling back.`);
      }

      const entries = await Promise.all(
        validIds.map(async (id) => {
          try {
            const stats = await this.getContentStats(id);
            return [id, stats] as [string, ContentStats];
          } catch {
            return [id, undefined] as unknown as [string, ContentStats];
          }
        })
      );

      return entries.reduce((acc, [id, stats]) => {
        if (stats) acc[id] = stats;
        return acc;
      }, {} as Record<string, ContentStats>);
    } catch (error) {
      console.error('Error getting batch content stats:', error);
      return {};
    }
  }

  // ============= USER'S SAVED CONTENT =============
  async getUserSavedContent(contentType?: string, page: number = 1, limit: number = 20): Promise<{
    content: any[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(contentType && { contentType }),
      });

      const response = await fetch(`${this.baseURL}/api/user/saved-content?${queryParams}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user saved content:', error);
      return { content: [], totalCount: 0, hasMore: false };
    }
  }

  // ============= ANALYTICS =============
  async getUserInteractionHistory(
    page: number = 1,
    limit: number = 50,
    interactionType?: string
  ): Promise<{
    interactions: ContentInteraction[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const headers = await this.getAuthHeaders();
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(interactionType && { interactionType }),
      });

      const response = await fetch(`${this.baseURL}/api/user/interaction-history?${queryParams}`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting interaction history:', error);
      return { interactions: [], totalCount: 0, hasMore: false };
    }
  }

  // ============= FALLBACK METHODS (LOCAL STORAGE) =============
  private async fallbackToggleLike(contentId: string): Promise<{ liked: boolean; totalLikes: number }> {
    try {
      const userId = await this.getCurrentUserId();
      const key = `userLikes_${userId}`;
      const likesStr = await AsyncStorage.getItem(key);
      const likes = likesStr ? JSON.parse(likesStr) : {};
      
      const isLiked = likes[contentId] || false;
      likes[contentId] = !isLiked;
      
      await AsyncStorage.setItem(key, JSON.stringify(likes));
      
      return {
        liked: !isLiked,
        totalLikes: Object.values(likes).filter(Boolean).length,
      };
    } catch (error) {
      console.error('Fallback like toggle failed:', error);
      return { liked: false, totalLikes: 0 };
    }
  }

  private async fallbackToggleSave(contentId: string): Promise<{ saved: boolean; totalSaves: number }> {
    try {
      const userId = await this.getCurrentUserId();
      const key = `userSaves_${userId}`;
      const savesStr = await AsyncStorage.getItem(key);
      const saves = savesStr ? JSON.parse(savesStr) : {};
      
      const isSaved = saves[contentId] || false;
      const newSavedState = !isSaved;
      saves[contentId] = newSavedState;
      
      await AsyncStorage.setItem(key, JSON.stringify(saves));
      
      // Sync with library store
      await this.syncWithLibraryStore(contentId, newSavedState);
      
      return {
        saved: newSavedState,
        totalSaves: Object.values(saves).filter(Boolean).length,
      };
    } catch (error) {
      console.error('Fallback save toggle failed:', error);
      return { saved: false, totalSaves: 0 };
    }
  }

  private async fallbackGetStats(contentId: string): Promise<ContentStats> {
    try {
      const userId = await this.getCurrentUserId();
      const likesStr = await AsyncStorage.getItem(`userLikes_${userId}`);
      const savesStr = await AsyncStorage.getItem(`userSaves_${userId}`);
      
      const likes = likesStr ? JSON.parse(likesStr) : {};
      const saves = savesStr ? JSON.parse(savesStr) : {};
      
      return {
        contentId,
        likes: 0,
        saves: 0,
        shares: 0,
        views: 0,
        comments: 0,
        userInteractions: {
          liked: likes[contentId] || false,
          saved: saves[contentId] || false,
          shared: false,
          viewed: false,
        },
      };
    } catch (error) {
      console.error('Fallback get stats failed:', error);
      return {
        contentId,
        likes: 0,
        saves: 0,
        shares: 0,
        views: 0,
        comments: 0,
        userInteractions: {
          liked: false,
          saved: false,
          shared: false,
          viewed: false,
        },
      };
    }
  }
}

// Export singleton instance
export const contentInteractionAPI = new ContentInteractionService();
export default contentInteractionAPI;