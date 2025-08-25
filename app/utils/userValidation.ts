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
  // Check if content has uploadedBy object with user profile data
  if (content.uploadedBy && typeof content.uploadedBy === 'object' && content.uploadedBy.avatar) {
    const avatarUrl = content.uploadedBy.avatar;
    if (typeof avatarUrl === 'string' && avatarUrl.startsWith('http')) {
      return { uri: avatarUrl.trim() };
    }
    return avatarUrl;
  }

  // Check if content has speakerAvatar (legacy format)
  if (content.speakerAvatar) {
    if (typeof content.speakerAvatar === 'string' && content.speakerAvatar.startsWith('http')) {
      return { uri: content.speakerAvatar.trim() };
    }
    return content.speakerAvatar;
  }

  // Check if content has userAvatar (alternative field name)
  if (content.userAvatar) {
    if (typeof content.userAvatar === 'string' && content.userAvatar.startsWith('http')) {
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
  // Check if content has uploadedBy object with user profile data
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
  }

  // Check legacy fields
  if (content.speaker) {
    return content.speaker;
  }

  if (content.uploadedBy && typeof content.uploadedBy === 'string') {
    return content.uploadedBy;
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