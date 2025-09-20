// Define interface for media items
export interface MediaItem {
  _id?: string;
  contentType: string;
  fileUrl: string;
  title: string;
  speaker?: string;
  uploadedBy?: string;
  description?: string;
  createdAt: string;
  speakerAvatar?: string | number | { uri: string };
  views?: number;
  sheared?: number;
  saved?: number;
  comment?: number;
  favorite?: number;
  imageUrl?: string | { uri: string };
}

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
  onFavorite: (key: string, video: MediaItem) => void;
  onComment: (key: string, video: MediaItem) => void;
  onSave: (key: string, video: MediaItem) => void;
  onDownload: (video: MediaItem) => void;
  onShare: (key: string, video: MediaItem) => void;
  onModalToggle: (modalKey: string) => void;
  modalVisible: string | null;
  comments: Record<string, any[]>;
  checkIfDownloaded: (id: string) => boolean;
  getContentKey: (item: MediaItem) => string;
  getTimeAgo: (createdAt: string) => string;
  getUserDisplayNameFromContent: (item: MediaItem) => string;
  getUserAvatarFromContent: (item: MediaItem) => any;
}
