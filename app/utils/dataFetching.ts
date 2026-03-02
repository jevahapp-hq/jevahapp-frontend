/**
 * @deprecated This file is maintained for backward compatibility.
 * Please import directly from the modular exports:
 * - ApiClient from './api/ApiClient'
 * - CacheManager from './cache/CacheManager'
 * - TokenManager from './api/TokenManager'
 * - ErrorHandler from './api/ErrorHandler'
 * - UserProfileCache from './cache/UserProfileCache'
 * - AvatarManager from './cache/AvatarManager'
 * - DataSyncManager from './sync/DataSyncManager'
 */

// Re-export all classes and utilities from modular structure
export { ApiClient } from "./api/ApiClient";
export { TokenManager } from "./api/TokenManager";
export { ErrorHandler } from "./api/ErrorHandler";
export { CacheManager } from "./cache/CacheManager";
export { UserProfileCache } from "./cache/UserProfileCache";
export { AvatarManager } from "./cache/AvatarManager";
export { DataSyncManager } from "./sync/DataSyncManager";

// Re-export types
export type {
  CacheItem,
  FetchOptions,
  UserData,
} from "./api/types";

// Export singleton instances
import { ApiClient } from "./api/ApiClient";
import { CacheManager } from "./cache/CacheManager";
import { DataSyncManager } from "./sync/DataSyncManager";
import { TokenManager } from "./api/TokenManager";
import { UserProfileCache } from "./cache/UserProfileCache";
import { AvatarManager } from "./cache/AvatarManager";

export const apiClient = new ApiClient();
export const avatarManager = AvatarManager;
export const dataSyncManager = DataSyncManager.getInstance();
export const tokenManager = TokenManager;
export const cacheManager = CacheManager.getInstance();
export const userProfileCache = UserProfileCache;

// Convenience functions
import { ErrorHandler } from "./api/ErrorHandler";

export const fetchUserProfile = () => apiClient.getUserProfile();
export const fetchMediaList = (params?: any) => apiClient.getMediaList(params);
export const getAvatarUrl = (userId: string) =>
  AvatarManager.getAvatarUrl(userId);
export const normalizeAvatarUrl = (url: string) =>
  AvatarManager.normalizeAvatarUrl(url);
export const handleApiError = (error: any) =>
  ErrorHandler.handleApiError(error);
export const enrichContentWithUserData = (content: any) =>
  UserProfileCache.enrichContentWithUserData(content);
export const enrichContentArray = (contentArray: any[]) =>
  UserProfileCache.enrichContentArray(contentArray);
