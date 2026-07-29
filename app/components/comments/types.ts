export const COMMENT_COMPOSER_COLORS = {
  sheet: "#FFFFFF",
  text: "#161823",
  meta: "#8A8B91",
  border: "#F1F1F2",
  heart: "#FE2C55",
  heartIdle: "#161823",
  creatorBg: "#FE2C55",
  inputBg: "#F1F1F2",
  handle: "#D0D1D3",
  mention: "#065FD4",
  bannerBg: "#FFF4F6",
} as const;

export type CommentMention = {
  userId: string;
  displayName: string;
};

export type MentionCandidate = {
  userId: string;
  displayName: string;
  avatar?: string;
  isCreator?: boolean;
};

export type CommentImageAttachment = {
  uri: string;
  type: string;
  name: string;
};

export type SubmitCommentPayload = {
  text: string;
  mentions?: CommentMention[];
  localImage?: CommentImageAttachment | null;
  clearImage?: boolean;
};

export type CommentReply = {
  id: string;
  userName: string;
  avatar?: string;
  timestamp: string;
  comment: string;
  likes?: number;
  isLiked?: boolean;
  userId?: string;
  imageUrl?: string;
  mentions?: CommentMention[];
  isEdited?: boolean;
  editedAt?: string;
  parentId?: string;
};

export type CommentThreadItem = {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;
  comment: string;
  likes: number;
  isLiked: boolean;
  replies?: CommentReply[];
  parentId?: string;
  userId?: string;
  imageUrl?: string;
  mentions?: CommentMention[];
  isEdited?: boolean;
  editedAt?: string;
};

export type CommentCreatorInfo = {
  userId: string;
  displayName: string;
  avatar?: string;
};

export type OwnMenuTarget = {
  id: string;
  comment: string;
  imageUrl?: string;
  timestamp: string;
};

export const COMMENT_IMAGE_UNSUPPORTED = "COMMENT_IMAGE_UNSUPPORTED";
export const COMMENT_MAX_LENGTH = 500;
