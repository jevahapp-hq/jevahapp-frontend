// Core entity interfaces
export interface BaseEntity {
  _id?: string;
  createdAt: string;
  updatedAt?: string;
}

// Media item interface - matches the original AllContentTikTok interface
export interface MediaItem extends BaseEntity {
  contentType: string;
  fileUrl: string;
  title: string;
  speaker?: string;
  uploadedBy?: string;
  description?: string;
  speakerAvatar?: string | number | { uri: string };
  views?: number;
  sheared?: number;
  saved?: number;
  comment?: number;
  favorite?: number;
  imageUrl?: string | { uri: string };
  thumbnailUrl?: string | { uri: string };
  // Additional fields from API
  likes?: number;
  shares?: number;
  saves?: number;
  comments?: number;
  authorInfo?: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  author?: {
    _id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  viewCount?: number;
  totalViews?: number;
  shareCount?: number;
  totalShares?: number;
  likeCount?: number;
  totalLikes?: number;
  commentCount?: number;
}

// Content type definitions
export type ContentType =
  | "video"
  | "videos"
  | "audio"
  | "music"
  | "sermon"
  | "image"
  | "ebook"
  | "books"
  | "live"
  | "teachings"
  | "e-books";

// Content filtering options
export interface ContentFilter {
  contentType?: ContentType | "ALL";
  page?: number;
  limit?: number;
  search?: string;
}

// Media playback state
export interface MediaPlaybackState {
  isPlaying: boolean;
  isMuted: boolean;
  progress: number; // 0-1
  duration: number; // milliseconds
  position: number; // milliseconds
}

// Video-specific interfaces
export interface VideoCardProps {
  video: MediaItem;
  index: number;
  modalKey: string;
  contentStats: Record<string, any>;
  userFavorites: Record<string, boolean>;
  globalFavoriteCounts: Record<string, number>;
  playingVideos: Record<string, boolean>;
  mutedVideos: Record<string, boolean>;
  progresses: Record<string, number>;
  videoVolume: number;
  currentlyVisibleVideo: string | null;
  onVideoTap: (key: string, video: MediaItem, index: number) => void;
  onTogglePlay: (key: string) => void;
  onToggleMute: (key: string) => void;
  onFavorite: (key: string, item: MediaItem) => void;
  onComment: (key: string, item: MediaItem) => void;
  onSave: (key: string, item: MediaItem) => void;
  onDownload: (item: MediaItem) => void;
  onShare: (key: string, item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
  onModalToggle: (key: string | null) => void;
  modalVisible: string | null;
  comments: Record<string, any[]>;
  checkIfDownloaded: (id: string) => boolean;
  getContentKey: (item: MediaItem) => string;
  getTimeAgo: (createdAt: string) => string;
  getUserDisplayNameFromContent: (item: MediaItem) => string;
  getUserAvatarFromContent: (item: MediaItem) => any;
  onLayout?: (event: any, key: string, type: "video" | "music", uri?: string) => void;
  isAutoPlayEnabled?: boolean;
}

// Music/Audio-specific interfaces
export interface MusicCardProps {
  audio: MediaItem;
  index: number;
  onLike: (item: MediaItem) => void;
  onComment: (item: MediaItem) => void;
  onSave: (item: MediaItem) => void;
  onShare: (item: MediaItem) => void;
  onDownload: (item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
  onPlay: (uri: string, id: string) => void;
  isPlaying?: boolean;
  progress?: number;
  onLayout?: (event: any, key: string, type: "video" | "music", uri?: string) => void;
  onPause?: (id: string) => void;
}

// Ebook-specific interfaces
export interface EbookCardProps {
  ebook: MediaItem;
  index: number;
  onLike: (item: MediaItem) => void;
  onComment: (item: MediaItem) => void;
  onSave: (item: MediaItem) => void;
  onShare: (item: MediaItem) => void;
  onDownload: (item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
  checkIfDownloaded: (itemId: string) => boolean;
}

// Shared media card interface
export interface MediaCardProps {
  item: MediaItem;
  index: number;
  onPress?: (item: MediaItem, index: number) => void;
  onLike?: (item: MediaItem) => void;
  onComment?: (item: MediaItem) => void;
  onSave?: (item: MediaItem) => void;
  onShare?: (item: MediaItem) => void;
  onDownload?: (item: MediaItem) => void;
  layout?: "card" | "list";
  size?: "small" | "medium" | "large";
}

// Interaction buttons interface
export interface InteractionButtonsProps {
  item: MediaItem;
  contentId: string;
  onLike: () => void;
  onComment: () => void;
  onSave: () => void;
  onShare: () => void;
  onDownload: () => void;
  userLikeState?: boolean;
  userSaveState?: boolean;
  likeCount?: number;
  saveCount?: number;
  commentCount?: number;
  viewCount?: number;
  isDownloaded?: boolean;
  layout?: "horizontal" | "vertical";
}

// Comment interface
export interface Comment {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;
  comment: string;
  likes: number;
  isLiked: boolean;
}

// API response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface MediaApiResponse {
  success: boolean;
  media?: MediaItem[];
  total?: number;
  page?: number;
  limit?: number;
  error?: string;
}

// Content stats interface
export interface ContentStats {
  _id: string;
  contentType: string;
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
  createdAt: string;
  updatedAt: string;
}

// Socket manager interface
export interface SocketManagerInterface {
  connect(): Promise<void>;
  disconnect(): void;
  isConnected(): boolean;
  sendLike(contentId: string, contentType: string): void;
  sendComment(contentId: string, comment: string): void;
  sendShare(contentId: string, shareMethod: string): void;
}

// Download item interface
export interface DownloadableItem {
  id: string;
  title: string;
  fileUrl: string;
  contentType: "video" | "audio" | "ebook";
  thumbnailUrl?: string;
  size?: number;
}

// User interface
export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

// Navigation interface
export interface VideoNavigationOptions {
  video: MediaItem;
  index: number;
  allVideos: MediaItem[];
  contentStats: Record<string, any>;
  globalFavoriteCounts: Record<string, number>;
  getContentKey: (item: MediaItem) => string;
  getTimeAgo: (createdAt: string) => string;
  getDisplayName: (speaker?: string, uploadedBy?: string) => string;
}

// Error interface
export interface AppError {
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// Store interfaces
export interface MediaStoreState {
  allContent: MediaItem[];
  defaultContent: MediaItem[];
  allContentLoading: boolean;
  defaultContentLoading: boolean;
  allContentError: string | null;
  defaultContentError: string | null;
  allContentTotal: number;
  defaultContentPagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fetchAllContent: (useAuth?: boolean) => Promise<void>;
  refreshAllContent: () => Promise<void>;
  fetchDefaultContent: (params?: ContentFilter) => Promise<void>;
  loadMoreDefaultContent: () => Promise<void>;
  refreshDefaultContent: () => Promise<void>;
}

export interface GlobalMediaStoreState {
  playingVideos: Record<string, boolean>;
  mutedVideos: Record<string, boolean>;
  progresses: Record<string, number>;
  showOverlay: Record<string, boolean>;
  currentlyPlayingMedia: string | null;
  currentlyPlayingType: "video" | "audio" | null;
  isAutoPlayEnabled: boolean;
  playMediaGlobally: (mediaId: string, type: "video" | "audio") => void;
  pauseAllMedia: () => void;
  toggleVideoMute: (videoId: string) => void;
  setVideoProgress: (videoId: string, progress: number) => void;
  setOverlayVisible: (videoId: string, visible: boolean) => void;
  enableAutoPlay: () => void;
  disableAutoPlay: () => void;
}

export interface InteractionStoreState {
  contentStats: Record<string, ContentStats>;
  loadingStats: Record<string, boolean>;
  loadingInteraction: Record<string, boolean>;
  comments: Record<string, Comment[]>;
  loadingComments: Record<string, boolean>;
  savedContent: MediaItem[];
  savedContentLoading: boolean;
  toggleLike: (contentId: string, contentType: string) => Promise<void>;
  toggleSave: (contentId: string, contentType: string) => Promise<void>;
  recordShare: (
    contentId: string,
    contentType: string,
    shareMethod?: string
  ) => Promise<void>;
  recordView: (
    contentId: string,
    contentType: string,
    duration?: number
  ) => Promise<void>;
  addComment: (
    contentId: string,
    comment: string,
    contentType?: string,
    parentCommentId?: string
  ) => Promise<void>;
  loadComments: (
    contentId: string,
    contentType?: string,
    page?: number
  ) => Promise<void>;
  toggleCommentLike: (commentId: string, contentId: string) => Promise<void>;
  loadContentStats: (contentId: string, contentType?: string) => Promise<void>;
  loadBatchContentStats: (
    contentIds: string[],
    contentType?: string
  ) => Promise<void>;
  loadUserSavedContent: (contentType?: string, page?: number) => Promise<void>;
  getContentStat: (
    contentId: string,
    statType: keyof ContentStats["userInteractions"]
  ) => boolean;
  getContentCount: (
    contentId: string,
    countType: "likes" | "saves" | "shares" | "views" | "comments"
  ) => number;
  clearCache: () => void;
  refreshContentStats: (contentId: string) => Promise<void>;
}

// Hook interfaces
export interface UseMediaOptions {
  immediate?: boolean;
  contentType?: ContentType | "ALL";
  page?: number;
  limit?: number;
}

export interface UseMediaReturn {
  allContent: MediaItem[];
  defaultContent: MediaItem[];
  loading: boolean;
  error: string | null;
  hasContent: boolean;
  total: number;
  refreshAllContent: () => Promise<void>;
  refreshDefaultContent: () => Promise<void>;
  loadMoreContent: () => Promise<void>;
  getFilteredContent: (filter: ContentFilter) => MediaItem[];
}
