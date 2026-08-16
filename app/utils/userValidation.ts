/**
 * User validation utilities to ensure complete user data
 */

export interface UserData {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
  fullName?: string;
  displayName?: string;
  username?: string;
  userName?: string;
  name?: string;
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

  const firstName = String(user.firstName || user.first_name || "").trim();
  const lastName = String(user.lastName || user.last_name || "").trim();
  const extra = String(
    user.fullName ||
      user.displayName ||
      user.username ||
      user.userName ||
      user.name ||
      ""
  ).trim();
  const emailPrefix = user.email ? String(user.email).split("@")[0].trim() : "";
  const avatar = user.avatar || user.imageUrl || user.profileImage || "";

  let fullName = `${firstName} ${lastName}`.trim();
  if (!fullName) fullName = extra;
  if (!fullName) fullName = emailPrefix;

  if (!fullName) {
    return {
      firstName: "Anonymous",
      lastName: "User",
      fullName: "Anonymous User",
      avatar,
      email: user.email,
    };
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  return {
    firstName: firstName || parts[0] || fullName,
    lastName: lastName || (parts.length > 1 ? parts.slice(1).join(" ") : ""),
    fullName,
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
  const placeholder = /^(anonymous(\s+user)?|unknown|no speaker|user)$/i;
  if (speaker && speaker.trim() && !placeholder.test(speaker.trim()) && !/^[0-9a-fA-F]{24}$/.test(speaker.trim())) {
    return speaker.trim();
  }
  if (uploadedBy && uploadedBy.trim() && !placeholder.test(uploadedBy.trim()) && !/^[0-9a-fA-F]{24}$/.test(uploadedBy.trim())) {
    return uploadedBy.trim();
  }
  return fallback;
}

/**
 * Logs user data status for debugging (only in dev mode)
 */
export function logUserDataStatus(user: UserData | null, context: string): void {
  if (!__DEV__) return; // Skip in production

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

import {
  DEFAULT_USER_AVATAR_SOURCE,
} from "./defaultUserAvatar";
import {
  resolveAuthorAvatar,
  resolveAuthorName,
} from "../../src/shared/author";

/**
 * Get user avatar from content data with fallback logic
 * @deprecated Prefer resolveAuthorAvatar from src/shared/author
 */
export function getUserAvatarFromContent(
  content: any,
  fallbackAvatar: any = DEFAULT_USER_AVATAR_SOURCE
): any {
  return resolveAuthorAvatar(content, fallbackAvatar);
}

/**
 * Get user display name from content data with fallback logic
 * Primary source for media: authorInfo (populated by /api/media/*)
 * @deprecated Prefer resolveAuthorName from src/shared/author
 */
export function getUserDisplayNameFromContent(
  content: any,
  fallback: string = "Anonymous User"
): string {
  return resolveAuthorName(content, fallback);
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