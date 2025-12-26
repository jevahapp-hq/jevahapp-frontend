/**
 * User validation utilities to ensure complete user data
 */

export interface UserData {
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  imageUrl?: string;
  profileImage?: string;
  email?: string;
}

export interface NormalizedUser {
  firstName: string;
  lastName: string;
  fullName: string;
  avatar: string;
  email?: string;
}

/**
 * Normalizes user data from various sources (Clerk, API, etc.)
 * Ensures consistent format and provides fallbacks
 */
export function normalizeUserData(user: UserData | null): NormalizedUser {
  if (!user) {
    return {
      firstName: "Anonymous",
      lastName: "User",
      fullName: "Anonymous User",
      avatar: "",
    };
  }

  const firstName = user.firstName || user.first_name || "Anonymous";
  const lastName = user.lastName || user.last_name || "User";
  const avatar = user.avatar || user.imageUrl || user.profileImage || "";

  return {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    avatar,
    email: user.email,
  };
}

/**
 * Validates if user data is complete enough for content uploads
 */
export function validateUserForUpload(user: UserData | null): {
  isValid: boolean;
  missingFields: string[];
  normalizedUser: NormalizedUser;
} {
  const normalizedUser = normalizeUserData(user);
  const missingFields: string[] = [];

  // Check for completely missing user data
  if (!user) {
    missingFields.push("user");
  }

  // Check for missing name information
  if (normalizedUser.firstName === "Anonymous" || normalizedUser.lastName === "User") {
    missingFields.push("name");
  }

  // Avatar is optional but recommended
  if (!normalizedUser.avatar) {
    missingFields.push("avatar");
  }

  return {
    isValid: missingFields.length === 0 || (missingFields.length === 1 && missingFields[0] === "avatar"),
    missingFields,
    normalizedUser,
  };
}

/**
 * Gets display name for content attribution
 */
export function getDisplayName(speaker?: string, uploadedBy?: string, fallback = "Anonymous User"): string {
  return speaker || uploadedBy || fallback;
}

/**
 * Logs user data status for debugging
 */
export function logUserDataStatus(user: UserData | null, context: string): void {
  const normalizedUser = normalizeUserData(user);
  const validation = validateUserForUpload(user);

  console.log(`🔍 User Data Status (${context}):`, {
    isValid: validation.isValid,
    fullName: normalizedUser.fullName,
    hasAvatar: !!normalizedUser.avatar,
    missingFields: validation.missingFields,
    rawData: user ? Object.keys(user) : null,
  });
}

/**
 * Get user avatar from content data with fallback logic
 * @param content - Content item that may have user information
 * @param fallbackAvatar - Default avatar to use if none found
 * @returns Avatar source for Image component
 */
export function getUserAvatarFromContent(
  content: any,
  fallbackAvatar: any = require("../../assets/images/Avatar-1.png")
): any {
  // Priority 1: Check if content has uploadedBy object with user profile data
  if (content.uploadedBy && typeof content.uploadedBy === 'object') {
    // Check multiple possible avatar field names
    const avatarUrl = content.uploadedBy.avatar || 
                     content.uploadedBy.avatarUrl || 
                     content.uploadedBy.imageUrl || 
                     content.uploadedBy.profileImage ||
                     content.uploadedBy.profilePicture;
    
    if (avatarUrl) {
      if (typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
        if (avatarUrl.startsWith('http')) {
          return { uri: avatarUrl.trim() };
        }
        // Handle relative paths or other formats
        return { uri: avatarUrl.trim() };
      }
      return avatarUrl;
    }
  }

  // Priority 2: Check author object avatar (for Devotional content)
  if (content.author && typeof content.author === 'object' && content.author.avatar) {
    const avatarUrl = content.author.avatar;
    if (typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
      if (avatarUrl.startsWith('http')) {
        return { uri: avatarUrl.trim() };
      }
      return { uri: avatarUrl.trim() };
    }
    return avatarUrl;
  }

  // Priority 3: Check authorInfo object avatar
  if (content.authorInfo && typeof content.authorInfo === 'object' && content.authorInfo.avatar) {
    const avatarUrl = content.authorInfo.avatar;
    if (typeof avatarUrl === 'string' && avatarUrl.trim().length > 0) {
      if (avatarUrl.startsWith('http')) {
        return { uri: avatarUrl.trim() };
      }
      return { uri: avatarUrl.trim() };
    }
    return avatarUrl;
  }

  // Priority 4: Check if content has speakerAvatar (legacy format)
  if (content.speakerAvatar) {
    if (typeof content.speakerAvatar === 'string' && content.speakerAvatar.trim().length > 0) {
      if (content.speakerAvatar.startsWith('http')) {
        return { uri: content.speakerAvatar.trim() };
      }
      return { uri: content.speakerAvatar.trim() };
    }
    return content.speakerAvatar;
  }

  // Priority 5: Check if content has userAvatar (alternative field name)
  if (content.userAvatar) {
    if (typeof content.userAvatar === 'string' && content.userAvatar.trim().length > 0) {
      if (content.userAvatar.startsWith('http')) {
        return { uri: content.userAvatar.trim() };
      }
      return { uri: content.userAvatar.trim() };
    }
    return content.userAvatar;
  }

  // Return fallback avatar
  return fallbackAvatar;
}

/**
 * Get user display name from content data with fallback logic
 * @param content - Content item that may have user information
 * @param fallback - Default name to use if none found
 * @returns User's display name
 */
export function getUserDisplayNameFromContent(
  content: any,
  fallback: string = "Anonymous User"
): string {
  // Priority 1: Check if content has uploadedBy object with user profile data
  if (content.uploadedBy && typeof content.uploadedBy === 'object') {
    const user = content.uploadedBy;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`.trim();
    }
    if (user.firstName) {
      return user.firstName;
    }
    if (user.lastName) {
      return user.lastName;
    }
    if (user.email) {
      return user.email.split('@')[0]; // Use email prefix as fallback
    }
    if (user.name) {
      return user.name;
    }
    // If uploadedBy is an object but missing name fields, try to get from cache
    const userId = user._id || user.id;
    if (userId) {
      try {
        const { UserProfileCache } = require('./cache/UserProfileCache');
        const cachedUser = UserProfileCache.getUserProfile(userId);
        if (cachedUser) {
          if (cachedUser.firstName && cachedUser.lastName) {
            return `${cachedUser.firstName} ${cachedUser.lastName}`.trim();
          }
          if (cachedUser.firstName) {
            return cachedUser.firstName;
          }
          if (cachedUser.lastName) {
            return cachedUser.lastName;
          }
        }
      } catch (e) {
        // Silently fail if cache is not available
      }
    }
  }

  // Priority 2: Check author object (for Devotional content)
  if (content.author && typeof content.author === 'object') {
    const author = content.author;
    if (author.firstName && author.lastName) {
      return `${author.firstName} ${author.lastName}`.trim();
    }
    if (author.firstName) {
      return author.firstName;
    }
    if (author.lastName) {
      return author.lastName;
    }
    if (author.name) {
      return author.name;
    }
    // If author is an object but missing name fields, try to get from cache
    const authorId = author._id || author.id;
    if (authorId) {
      try {
        const { UserProfileCache } = require('./cache/UserProfileCache');
        const cachedUser = UserProfileCache.getUserProfile(authorId);
        if (cachedUser) {
          if (cachedUser.firstName && cachedUser.lastName) {
            return `${cachedUser.firstName} ${cachedUser.lastName}`.trim();
          }
          if (cachedUser.firstName) {
            return cachedUser.firstName;
          }
          if (cachedUser.lastName) {
            return cachedUser.lastName;
          }
        }
      } catch (e) {
        // Silently fail if cache is not available
      }
    }
  }

  // Priority 3: Check authorInfo object
  if (content.authorInfo && typeof content.authorInfo === 'object') {
    const authorInfo = content.authorInfo;
    if (authorInfo.firstName && authorInfo.lastName) {
      return `${authorInfo.firstName} ${authorInfo.lastName}`.trim();
    }
    if (authorInfo.firstName) {
      return authorInfo.firstName;
    }
    if (authorInfo.lastName) {
      return authorInfo.lastName;
    }
    if (authorInfo.name) {
      return authorInfo.name;
    }
  }

  // Priority 4: Check legacy speaker field (for audio/sermon content)
  if (content.speaker && typeof content.speaker === 'string') {
    return content.speaker;
  }

  // Priority 5: Check if uploadedBy is a string ID - try to get from cache
  if (content.uploadedBy && typeof content.uploadedBy === 'string') {
    // Check if it looks like an ObjectId (24 hex characters)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(content.uploadedBy.trim());
    if (isObjectId) {
      // It's an ID, try to get user from cache
      try {
        const { UserProfileCache } = require('./cache/UserProfileCache');
        const cachedUser = UserProfileCache.getUserProfile(content.uploadedBy.trim());
        if (cachedUser) {
          if (cachedUser.firstName && cachedUser.lastName) {
            return `${cachedUser.firstName} ${cachedUser.lastName}`.trim();
          }
          if (cachedUser.firstName) {
            return cachedUser.firstName;
          }
          if (cachedUser.lastName) {
            return cachedUser.lastName;
          }
        }
      } catch (e) {
        // Silently fail if cache is not available
      }
      // If not in cache, return fallback (don't show ID)
      return fallback;
    } else {
      // It's a name string, use it
      return content.uploadedBy;
    }
  }

  // Priority 6: Check if author is a string (non-ID)
  if (content.author && typeof content.author === 'string') {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(content.author.trim());
    if (isObjectId) {
      // It's an ID, try to get user from cache
      try {
        const { UserProfileCache } = require('./cache/UserProfileCache');
        const cachedUser = UserProfileCache.getUserProfile(content.author.trim());
        if (cachedUser) {
          if (cachedUser.firstName && cachedUser.lastName) {
            return `${cachedUser.firstName} ${cachedUser.lastName}`.trim();
          }
          if (cachedUser.firstName) {
            return cachedUser.firstName;
          }
          if (cachedUser.lastName) {
            return cachedUser.lastName;
          }
        }
      } catch (e) {
        // Silently fail if cache is not available
      }
      // If not in cache, return fallback (don't show ID)
      return fallback;
    } else {
      // It's a name string, use it
      return content.author;
    }
  }

  return fallback;
}

/**
 * Get user profile data from content for advanced usage
 * @param content - Content item that may have user information
 * @returns User profile object or null
 */
export function getUserProfileFromContent(content: any): {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  fullName?: string;
} | null {
  // Check if content has uploadedBy object with user profile data
  if (content.uploadedBy && typeof content.uploadedBy === 'object') {
    const user = content.uploadedBy;
    return {
      id: user._id || user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      avatar: user.avatar,
      fullName: user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : undefined
    };
  }

  return null;
}