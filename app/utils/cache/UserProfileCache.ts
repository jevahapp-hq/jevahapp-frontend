import { CacheManager } from "./CacheManager";
import { UserData, AVATAR_CACHE_DURATION } from "../api/types";
import { API_BASE_URL } from "../api";
import { authUtils } from "../authUtils";

// User profile cache and enrichment utilities
export class UserProfileCache {
  private static cache = CacheManager.getInstance();
  private static fetchingUsers = new Set<string>(); // Track users being fetched to avoid duplicate requests

  /**
   * Get cached user profile by userId
   */
  static getUserProfile(userId: string): UserData | null {
    if (!userId) return null;
    const cacheKey = `user:${userId}`;
    return this.cache.get(cacheKey) || null;
  }

  /**
   * Fetch user profile from API by userId and cache it
   */
  static async fetchAndCacheUserProfile(userId: string): Promise<UserData | null> {
    if (!userId) return null;

    // Check cache first
    const cached = this.getUserProfile(userId);
    if (cached) return cached;

    // Avoid duplicate requests
    if (this.fetchingUsers.has(userId)) {
      // Wait a bit and check cache again
      await new Promise(resolve => setTimeout(resolve, 100));
      return this.getUserProfile(userId);
    }

    try {
      this.fetchingUsers.add(userId);
      
      const token = await authUtils.getStoredToken();
      if (!token) {
        console.warn(`⚠️ No auth token, cannot fetch user profile for ${userId}`);
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch user profile for ${userId}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (data.success && data.user) {
        this.cacheUserProfile(userId, data.user);
        return data.user;
      } else if (data.data && data.data.user) {
        // Handle different response formats
        this.cacheUserProfile(userId, data.data.user);
        return data.data.user;
      }

      return null;
    } catch (error) {
      console.warn(`⚠️ Error fetching user profile for ${userId}:`, error);
      return null;
    } finally {
      this.fetchingUsers.delete(userId);
    }
  }

  /**
   * Cache user profile by userId
   */
  static cacheUserProfile(userId: string, userData: UserData): void {
    if (!userId || !userData) return;
    const cacheKey = `user:${userId}`;
    this.cache.set(cacheKey, userData, AVATAR_CACHE_DURATION); // Cache for 30 minutes
  }

  /**
   * Enrich content item with cached user data (fullname and avatar)
   * This ensures content items have fullname and avatar even if backend doesn't populate them
   */
  static enrichContentWithUserData(content: any): any {
    if (!content) return content;

    // Try to get userId from uploadedBy
    let userId: string | null = null;
    
    if (content.uploadedBy) {
      if (typeof content.uploadedBy === 'object') {
        userId = content.uploadedBy._id || content.uploadedBy.id || null;
        
        // If uploadedBy is already populated but missing firstName/lastName/avatar, try to enrich
        if (userId && (!content.uploadedBy.firstName || !content.uploadedBy.avatar)) {
          let cachedUser = this.getUserProfile(userId);
          
          // If not in cache, try to fetch from API (async, but we'll update cache for next time)
          if (!cachedUser) {
            // Fetch in background (don't await to avoid blocking)
            this.fetchAndCacheUserProfile(userId).then((fetchedUser) => {
              if (fetchedUser) {
                // Re-enrich this content item with the fetched user data
                content.uploadedBy = {
                  ...content.uploadedBy,
                  firstName: content.uploadedBy.firstName || fetchedUser.firstName || "",
                  lastName: content.uploadedBy.lastName || fetchedUser.lastName || "",
                  avatar: content.uploadedBy.avatar || fetchedUser.avatar || fetchedUser.avatarUpload || "",
                  email: content.uploadedBy.email || fetchedUser.email || "",
                };
              }
            }).catch(() => {
              // Silently fail
            });
          } else {
            // Use cached user data
            content.uploadedBy = {
              ...content.uploadedBy,
              firstName: content.uploadedBy.firstName || cachedUser.firstName || "",
              lastName: content.uploadedBy.lastName || cachedUser.lastName || "",
              avatar: content.uploadedBy.avatar || cachedUser.avatar || cachedUser.avatarUpload || "",
            };
          }
        }
      } else if (typeof content.uploadedBy === 'string') {
        // uploadedBy is just an ID string, try to enrich with cached user data
        userId = content.uploadedBy.trim();
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
        
        if (isObjectId) {
          // It's a valid ObjectId, try to get from cache
          let cachedUser = this.getUserProfile(userId);
          
          if (cachedUser) {
            // Use cached user data - convert string ID to object
            content.uploadedBy = {
              _id: userId,
              id: userId,
              firstName: cachedUser.firstName || "",
              lastName: cachedUser.lastName || "",
              avatar: cachedUser.avatar || cachedUser.avatarUpload || "",
              email: cachedUser.email || "",
            };
          } else {
            // Not in cache - try to fetch (async, but create minimal object structure first)
            // This ensures the structure is correct even if fetch fails
            content.uploadedBy = {
              _id: userId,
              id: userId,
              firstName: "",
              lastName: "",
              avatar: "",
              email: "",
            };
            
            // Fetch in background to update the object
            this.fetchAndCacheUserProfile(userId).then((fetchedUser) => {
              if (fetchedUser && content.uploadedBy && typeof content.uploadedBy === 'object') {
                // Update the object with fetched data
                content.uploadedBy.firstName = fetchedUser.firstName || "";
                content.uploadedBy.lastName = fetchedUser.lastName || "";
                content.uploadedBy.avatar = fetchedUser.avatar || fetchedUser.avatarUpload || "";
                content.uploadedBy.email = fetchedUser.email || "";
              }
            }).catch(() => {
              // Silently fail - object structure is already correct
            });
          }
        } else {
          // Not an ObjectId, treat as a name string
          // Keep as string (it's already a name)
        }
      }
    }

    // Also enrich author/authorInfo if they exist but are missing data
    if (content.author && typeof content.author === 'object') {
      const authorId = content.author._id || content.author.id;
      if (authorId && (!content.author.firstName || !content.author.avatar)) {
        const cachedUser = this.getUserProfile(authorId);
        if (cachedUser) {
          content.author = {
            ...content.author,
            firstName: content.author.firstName || cachedUser.firstName || "",
            lastName: content.author.lastName || cachedUser.lastName || "",
            avatar: content.author.avatar || cachedUser.avatar || cachedUser.avatarUpload || "",
          };
        }
      }
    }

    if (content.authorInfo && typeof content.authorInfo === 'object') {
      const authorId = content.authorInfo._id || content.authorInfo.id;
      if (authorId && (!content.authorInfo.firstName || !content.authorInfo.avatar)) {
        const cachedUser = this.getUserProfile(authorId);
        if (cachedUser) {
          content.authorInfo = {
            ...content.authorInfo,
            firstName: content.authorInfo.firstName || cachedUser.firstName || "",
            lastName: content.authorInfo.lastName || cachedUser.lastName || "",
            avatar: content.authorInfo.avatar || cachedUser.avatar || cachedUser.avatarUpload || "",
          };
        }
      }
    }

    return content;
  }

  /**
   * Enrich an array of content items with cached user data
   * This version does synchronous enrichment only (uses cache)
   */
  static enrichContentArray(contentArray: any[]): any[] {
    if (!Array.isArray(contentArray)) return contentArray;
    return contentArray.map(item => this.enrichContentWithUserData(item));
  }

  /**
   * Batch enrich content array by fetching all missing user profiles first
   * This ensures all user data is available before transformation
   */
  static async enrichContentArrayBatch(contentArray: any[]): Promise<any[]> {
    if (!Array.isArray(contentArray) || contentArray.length === 0) return contentArray;

    // Step 1: Collect all unique user IDs that need fetching
    const userIdsToFetch = new Set<string>();
    
    contentArray.forEach((item) => {
      // Check uploadedBy
      if (item.uploadedBy) {
        if (typeof item.uploadedBy === 'object') {
          const userId = item.uploadedBy._id || item.uploadedBy.id;
          if (userId && (!item.uploadedBy.firstName || !item.uploadedBy.avatar)) {
            if (!this.getUserProfile(userId)) {
              userIdsToFetch.add(userId);
            }
          }
        } else if (typeof item.uploadedBy === 'string') {
          const isObjectId = /^[0-9a-fA-F]{24}$/.test(item.uploadedBy.trim());
          if (isObjectId && !this.getUserProfile(item.uploadedBy.trim())) {
            userIdsToFetch.add(item.uploadedBy.trim());
          }
        }
      }
      
      // Check author
      if (item.author && typeof item.author === 'object') {
        const authorId = item.author._id || item.author.id;
        if (authorId && (!item.author.firstName || !item.author.avatar)) {
          if (!this.getUserProfile(authorId)) {
            userIdsToFetch.add(authorId);
          }
        }
      }
      
      // Check authorInfo
      if (item.authorInfo && typeof item.authorInfo === 'object') {
        const authorId = item.authorInfo._id || item.authorInfo.id;
        if (authorId && (!item.authorInfo.firstName || !item.authorInfo.avatar)) {
          if (!this.getUserProfile(authorId)) {
            userIdsToFetch.add(authorId);
          }
        }
      }
    });

    // Step 2: Fetch all missing user profiles in parallel
    if (userIdsToFetch.size > 0) {
      const fetchPromises = Array.from(userIdsToFetch).map(userId => 
        this.fetchAndCacheUserProfile(userId).catch(() => null)
      );
      await Promise.all(fetchPromises);
    }

    // Step 3: Now enrich all items (all user data should be in cache now)
    return contentArray.map(item => this.enrichContentWithUserData(item));
  }
}

