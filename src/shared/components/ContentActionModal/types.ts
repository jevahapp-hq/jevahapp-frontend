export interface ContentActionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onSaveToLibrary: () => void;
  onDownload: () => void;
  isSaved: boolean;
  isDownloaded: boolean;
  contentTitle?: string;
  // Delete functionality props
  mediaId?: string;
  uploadedBy?: string | { _id: string };
  mediaItem?: any; // Full media item for ownership checking (optional)
  onDelete?: () => void;
  showDelete?: boolean; // If provided, use it; otherwise check ownership internally
  // Report functionality props
  onReport?: () => void;
}
