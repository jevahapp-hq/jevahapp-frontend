import { CacheManager } from "./CacheManager";
import { UserData, AVATAR_CACHE_DURATION } from "../api/types";
import { getApiBaseUrl } from "../environmentManager";
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

  /** True when cached profile has a usable display name */
  static hasUsableName(user: UserData | null | undefined): boolean {
    if (!user) return false;
    const first = String((user as any).firstName || "").trim();
    const last = String((user as any).lastName || "").trim();
    const full = `${first} ${last}`.trim();
    if (full && !/^(anonymous(\s+user)?|unknown)$/i.test(full)) return true;
    const named = String((user as any).name || (user as any).fullName || (user as any).displayName || "").trim();
    return Boolean(named && !/^(anonymous(\s+user)?|unknown)$/i.test(named));
  }

  private static needsProfileFetch(userId: string | null | undefined, hasName: boolean, _hasAvatar: boolean): boolean {
    if (!userId) return false;
    // List JSON already has a name — never stall cards on GET /api/users/:id
    if (hasName) return false;
    const cached = this.getUserProfile(String(userId));
    if (cached && this.hasUsableName(cached)) return false;
    return true;
  }

  /**
   * Fetch user profile from API by userId and cache it
   */
  static async fetchAndCacheUserProfile(userId: string): Promise<UserData | null> {
    if (!userId) return null;

    // Only treat cache as hit when it has a usable name (avatar-only must refetch)
    const cached = this.getUserProfile(userId);
    if (cached && this.hasUsableName(cached)) return cached;

    // Avoid duplicate requests — wait for in-flight properly
    if (this.fetchingUsers.has(userId)) {
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        const again = this.getUserProfile(userId);
        if (again && this.hasUsableName(again)) return again;
        if (!this.fetchingUsers.has(userId)) break;
      }
      return this.getUserProfile(userId);
    }

    try {
      this.fetchingUsers.add(userId);
      
      const token = await authUtils.getStoredToken();
      if (!token) {
        console.warn(`⚠️ No auth token, cannot fetch user profile for ${userId}`);
        return null;
      }

      // getApiBaseUrl() is origin only — must include /api (do NOT use
      // environmentManager's API_BASE_URL with a bare `/users/` path).
      const response = await fetch(
        `${getApiBaseUrl()}/api/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (__DEV__ && response.status === 404) {
          console.warn(
            `⚠️ Reels author: GET /api/users/${userId} returned 404. ` +
            `Backend needs this endpoint (or populate uploadedBy in media API). See docs/REELS_UPLOADER_NAME_BACKEND.md`
          );
        } else {
          console.warn(`⚠️ Failed to fetch user profile for ${userId}: ${response.status}`);
        }
        return null;
      }

      const data = await response.json();
      // Supported shapes:
      // { user }, { success, user }, { data: user }, { data: { user } }
      const rawUser =
        data?.user ??
        data?.data?.user ??
        (data?.data && typeof data.data === "object" && !Array.isArray(data.data)
          ? data.data
          : null);
      if (rawUser && typeof rawUser === "object") {
        const user = this.normalizeUserData(rawUser);
        this.cacheUserProfile(userId, user);
        return user;
      }
      return null;
    } catch (error) {
      console.warn(`⚠️ Error fetching user profile for ${userId}:`, error);
      return null;
    } finally {
      this.fetchingUsers.delete(userId);
    }
  }

  /** Normalize API user (snake_case, name field) for consistent display */
  private static normalizeUserData(u: any): UserData {
    const full =
      u.fullName ||
      u.displayName ||
      u.name ||
      u.username ||
      u.userName ||
      "";
    const parts = String(full).split(/\s+/).filter(Boolean);
    return {
      _id: u._id || u.id,
      id: u.id || u._id,
      firstName:
        u.firstName ||
        u.first_name ||
        parts[0] ||
        "",
      lastName:
        u.lastName ||
        u.last_name ||
        (parts.length > 1 ? parts.slice(1).join(" ") : "") ||
        "",
      avatar: u.avatar || u.avatarUpload || u.profileImage || u.avatarUrl,
      avatarUpload: u.avatarUpload || u.avatar || u.profileImage || u.avatarUrl,
      email: u.email,
    };
  }

  /**
   * Cache user profile by userId
   */
  static cacheUserProfile(userId: string, userData: UserData): void {
    if (!userId || !userData) return;
    const cacheKey = `user:${userId}`;
    this.cache.set(cacheKey, userData, AVATAR_CACHE_DURATION);
    // Keep the canonical author store in sync (feed name resolution)
    if (!this.hasUsableName(userData)) return;
    try {
      const { putAuthorProfile } = require("../../../src/shared/author");
      putAuthorProfile(userId, userData as any);
    } catch {
      // optional during bootstrap
    }
  }

  /** Pull names/avatars from a media item into the profile cache when present. */
  private static seedCacheFromContent(content: any): void {
    const candidates = [content?.authorInfo, content?.author, content?.uploadedBy];
    for (const u of candidates) {
      if (!u || typeof u !== "object") continue;
      const id = String(u._id || u.id || "").trim();
      if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) continue;
      const firstName = u.firstName || u.first_name || "";
      const lastName = u.lastName || u.last_name || "";
      const fullName =
        u.fullName || u.displayName || u.name || u.username || u.userName || "";
      if (!firstName && !lastName && !fullName) continue;
      const existing = this.getUserProfile(id);
      if (existing?.firstName || existing?.lastName) continue;
      const parts = String(fullName).split(/\s+/).filter(Boolean);
      this.cacheUserProfile(id, {
        _id: id,
        id,
        firstName: firstName || parts[0] || "",
        lastName: lastName || (parts.length > 1 ? parts.slice(1).join(" ") : "") || "",
        avatar: u.avatar || u.avatarUpload || u.profileImage || "",
        avatarUpload: u.avatarUpload || u.avatar || "",
        email: u.email || "",
      } as UserData);
    }
  }

  /**
   * Enrich content item with cached user data (fullname and avatar)
   * This ensures content items have fullname and avatar even if backend doesn't populate them
   */
  static enrichContentWithUserData(content: any): any {
    if (!content) return content;

    // Seed profile cache from any already-populated author fields (feed paint + future lookups)
    this.seedCacheFromContent(content);

    // Try to get userId from uploadedBy
    let userId: string | null = null;
    
    if (content.uploadedBy) {
      if (typeof content.uploadedBy === 'object') {
        userId = content.uploadedBy._id || content.uploadedBy.id || null;
        
        // If uploadedBy is already populated but missing firstName/lastName/avatar, try to enrich
        const hasName = Boolean(
          content.uploadedBy.firstName ||
            content.uploadedBy.lastName ||
            content.uploadedBy.fullName ||
            content.uploadedBy.name ||
            content.uploadedBy.username
        );
        if (userId && !hasName) {
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
        // uploadedBy is just an ID string — keep the string until we have real profile
        // data. Converting to `{ firstName: "" }` made every card show "Anonymous User"
        // and poisoned the MMKV feed cache.
        userId = content.uploadedBy.trim();
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(userId);
        
        if (isObjectId) {
          let cachedUser = this.getUserProfile(userId);
          
          if (cachedUser && (cachedUser.firstName || cachedUser.lastName || cachedUser.email)) {
            const userObj = {
              _id: userId,
              id: userId,
              firstName: cachedUser.firstName || "",
              lastName: cachedUser.lastName || "",
              avatar: cachedUser.avatar || cachedUser.avatarUpload || "",
              email: cachedUser.email || "",
            };
            content.uploadedBy = userObj;
            if (!content.authorInfo || (!content.authorInfo.firstName && !content.authorInfo.fullName)) {
              content.authorInfo = {
                ...userObj,
                fullName: [userObj.firstName, userObj.lastName].filter(Boolean).join(" ").trim(),
              };
            }
          } else {
            // Fetch in background; leave uploadedBy as the ID string for now
            void this.fetchAndCacheUserProfile(userId).catch(() => {});
          }
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
          const hasName = Boolean(
            item.uploadedBy.firstName ||
              item.uploadedBy.lastName ||
              item.uploadedBy.fullName ||
              item.uploadedBy.displayName ||
              item.uploadedBy.username ||
              item.uploadedBy.name
          );
          const hasAvatar = Boolean(
            item.uploadedBy.avatar ||
              item.uploadedBy.avatarUpload ||
              item.uploadedBy.avatarUrl
          );
          if (this.needsProfileFetch(userId, hasName, hasAvatar)) {
            userIdsToFetch.add(String(userId));
          }
        } else if (typeof item.uploadedBy === 'string') {
          const isObjectId = /^[0-9a-fA-F]{24}$/.test(item.uploadedBy.trim());
          if (isObjectId && this.needsProfileFetch(item.uploadedBy.trim(), false, false)) {
            userIdsToFetch.add(item.uploadedBy.trim());
          }
        }
      }
      
      // Check author
      if (item.author && typeof item.author === 'object') {
        const authorId = item.author._id || item.author.id;
        const hasName = Boolean(
          item.author.firstName ||
            item.author.lastName ||
            item.author.fullName ||
            item.author.displayName
        );
        const hasAvatar = Boolean(item.author.avatar || item.author.avatarUpload);
        if (this.needsProfileFetch(authorId, hasName, hasAvatar)) {
          userIdsToFetch.add(String(authorId));
        }
      }
      
      // Check authorInfo
      if (item.authorInfo && typeof item.authorInfo === 'object') {
        const authorId = item.authorInfo._id || item.authorInfo.id;
        const hasName = Boolean(
          item.authorInfo.firstName ||
            item.authorInfo.lastName ||
            item.authorInfo.fullName ||
            item.authorInfo.displayName ||
            item.authorInfo.username ||
            item.authorInfo.name
        );
        const hasAvatar = Boolean(
          item.authorInfo.avatar ||
            item.authorInfo.avatarUpload ||
            item.authorInfo.avatarUrl
        );
        if (this.needsProfileFetch(authorId, hasName, hasAvatar)) {
          userIdsToFetch.add(String(authorId));
        }
      }

      const speaker = typeof item.speaker === "string" ? item.speaker.trim() : "";
      if (/^[0-9a-fA-F]{24}$/.test(speaker) && this.needsProfileFetch(speaker, false, false)) {
        userIdsToFetch.add(speaker);
      }
      const extraId = String(item.userId || item.createdBy || "").trim();
      if (/^[0-9a-fA-F]{24}$/.test(extraId) && this.needsProfileFetch(extraId, false, false)) {
        userIdsToFetch.add(extraId);
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

