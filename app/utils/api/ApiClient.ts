/**
 * Facade over the modules in ./client/.
 *
 * The public method surface is unchanged; each domain (request pipeline, token
 * refresh, profile, user content, media) lives in its own module and receives
 * `this.request` so it never reaches back into the class.
 */
import { CacheManager } from "../cache/CacheManager";
import * as avatars from "./client/avatarUpload";
import * as media from "./client/mediaEndpoints";
import * as profile from "./client/profileApi";
import { performRequest } from "./client/requestCore";
import { TokenRefresher } from "./client/TokenRefresher";
import * as userContent from "./client/userContentApi";
import { FetchOptions, UserData } from "./types";

export class ApiClient {
  private cache = CacheManager.getInstance();
  private refresher = new TokenRefresher();

  request = <T = any>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> =>
    performRequest<T>(endpoint, options, {
      cache: this.cache,
      refresher: this.refresher,
    });

  // ============= PROFILE =============

  getUserProfile = () => profile.getUserProfile(this.request, this.cache);

  updateUserProfile = (updates: Partial<UserData>) =>
    profile.updateUserProfile(this.request, updates);

  getProfileSettingsConfig = () =>
    profile.getProfileSettingsConfig(this.request);

  getProfile = () => profile.getProfile(this.request);

  updateProfileName = (firstName?: string, lastName?: string) =>
    profile.updateProfileName(this.request, firstName, lastName);

  updateProfileLock = (profileLock: boolean) =>
    profile.updateProfileLock(this.request, profileLock);

  updatePushNotifications = (pushNotifications: boolean) =>
    profile.updatePushNotifications(this.request, pushNotifications);

  updateRecommendations = (recommendationSettings: boolean) =>
    profile.updateRecommendations(this.request, recommendationSettings);

  updateLiveSettings = (liveSettings: boolean) =>
    profile.updateLiveSettings(this.request, liveSettings);

  uploadProfileAvatar = avatars.uploadProfileAvatar;
  uploadAvatar = avatars.uploadAvatar;

  // ============= ACCOUNT & USER CONTENT =============

  getUserPosts = (userId: string, page: number = 1, limit: number = 20) =>
    userContent.getUserPosts(this.request, userId, page, limit);

  getUserMedia = (
    userId: string,
    page: number = 1,
    limit: number = 20,
    type?: "image" | "video"
  ) => userContent.getUserMedia(this.request, userId, page, limit, type);

  getUserVideos = (userId: string, page: number = 1, limit: number = 20) =>
    userContent.getUserVideos(this.request, userId, page, limit);

  getUserAnalytics = (userId: string) =>
    userContent.getUserAnalytics(this.request, userId);

  logout = () => userContent.logout(this.request, this.cache);

  // ============= MEDIA =============

  getMediaList = (
    params: {
      contentType?: string;
      search?: string;
      limit?: number;
      page?: number;
    } = {}
  ) => media.getMediaList(this.request, params);

  getMediaById = (id: string) => media.getMediaById(this.request, id);

  toggleFavorite = (contentId: string) =>
    media.toggleFavorite(this.request, contentId);

  saveContent = (contentId: string) =>
    media.saveContent(this.request, contentId);

  getContentStats = (contentId: string) =>
    media.getContentStats(this.request, contentId);
}
