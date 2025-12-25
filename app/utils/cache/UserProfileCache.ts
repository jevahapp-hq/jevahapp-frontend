import { CacheManager } from "./CacheManager";
import { UserData, AVATAR_CACHE_DURATION } from "../api/types";

// User profile cache and enrichment utilities
export class UserProfileCache {
  private static cache = CacheManager.getInstance();

  /**
   * Get cached user profile by userId
   */
  static getUserProfile(userId: string): UserData | null {
    if (!userId) return null;
    const cacheKey = `user:${userId}`;
    return this.cache.get(cacheKey) || null;
  }

  /**
   * Cache user profile by userId
   */
  static cacheUserProfile(userId: string, userData: UserData): void {
    if (!userId || !userData) return;
    const cacheKey = `user:${userId}`;
    this.cache.set(cacheKey, userData, AVATAR_CACHE_DURATION); // Cache for 30 minutes
    console.log(`💾 Cached user profile for userId: ${userId}`);
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
          const cachedUser = this.getUserProfile(userId);
          if (cachedUser) {
            content.uploadedBy = {
              ...content.uploadedBy,
              firstName: content.uploadedBy.firstName || cachedUser.firstName || "",
              lastName: content.uploadedBy.lastName || cachedUser.lastName || "",
              avatar: content.uploadedBy.avatar || cachedUser.avatar || cachedUser.avatarUpload || "",
            };
            console.log(`✅ Enriched uploadedBy for content ${content._id || content.id} with cached user data`);
          }
        }
      } else if (typeof content.uploadedBy === 'string') {
        // uploadedBy is just an ID string, try to enrich with cached user data
        userId = content.uploadedBy;
        const cachedUser = this.getUserProfile(userId);
        if (cachedUser) {
          content.uploadedBy = {
            _id: userId,
            id: userId,
            firstName: cachedUser.firstName || "",
            lastName: cachedUser.lastName || "",
            avatar: cachedUser.avatar || cachedUser.avatarUpload || "",
            email: cachedUser.email || "",
          };
          console.log(`✅ Enriched uploadedBy string ID for content ${content._id || content.id} with cached user data`);
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
   */
  static enrichContentArray(contentArray: any[]): any[] {
    if (!Array.isArray(contentArray)) return contentArray;
    return contentArray.map(item => this.enrichContentWithUserData(item));
  }
}

