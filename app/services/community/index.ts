// Community Services Index
// Central export point for all community-related services, hooks, and utilities

// Services
export { communityService, default } from "../communityService";
export { communityAPI } from "../../utils/communityAPI";

// Types
export type {
  PrayerRequest,
  CreatePrayerRequest,
  PrayerComment,
  Forum,
  ForumPost,
  ForumComment,
  Group,
  Poll,
  PollOption,
  ApiResponse,
  PaginationResponse,
} from "../../utils/communityAPI";

export type {
  CommunityModuleKey,
  CommunityModuleDescriptor,
  CommunityModulesResponse,
} from "../communityService";

// Error Handling
export { ApiErrorHandler } from "../../utils/apiErrorHandler";
export type { ApiError } from "../../utils/apiErrorHandler";

// Hooks
export { usePrayers, useSearchPrayers } from "../../hooks/usePrayers";
export {
  useForums,
  useForumPosts,
  useForumPostComments,
} from "../../hooks/useForums";
export {
  useMyGroups,
  useExploreGroups,
  useGroupDetails,
} from "../../hooks/useGroups";
export { usePolls, usePollDetails } from "../../hooks/usePolls";

// Utilities
export {
  validatePrayerForm,
  validateForumPostForm,
  validateGroupForm,
  validatePollForm,
  isValidUrl,
  extractLinkMetadata,
  pickAndResizeImage,
  debounce,
  formatTimestamp,
  retryApiCall,
} from "../../utils/communityHelpers";
export type {
  ValidationResult,
  ImagePickerResult,
} from "../../utils/communityHelpers";

