import type {
  CommentCreatorInfo,
  CommentThreadItem,
} from "../components/comments";
import type { CommentMediaAnchor } from "../components/commentSheetAnchor";
import { MEDIA_PEEK_HEIGHT } from "../components/commentSheetLayout";

export type { CommentMediaAnchor, CommentCreatorInfo };
export type Comment = CommentThreadItem;

export type SubmitCommentInput =
  | string
  | {
      text: string;
      mentions?: { userId: string; displayName: string }[];
      localImage?: { uri: string; type: string; name: string } | null;
    };

export type EditCommentInput = {
  content?: string;
  imageUrl?: string;
  clearImage?: boolean;
  localImage?: { uri: string; type: string; name: string } | null;
};

export interface CommentModalContextType {
  /** True while the sheet is on screen */
  isVisible: boolean;
  /** True from dismiss tap until media has snapped home — HUD/chrome must not hang */
  isClosing: boolean;
  comments: Comment[];
  isLoadingComments: boolean;
  loadError: string | null;
  composerError: string | null;
  clearComposerError: () => void;
  mediaPeekHeight: number;
  mediaShiftY: number;
  /** Scale applied to feed while sheet is open (1 = identity) */
  mediaScale: number;
  /** Media `_id` the sheet is open on — used to bind peek playback HUD. */
  contentId?: string;
  showCommentModal: (
    comments: Comment[],
    contentId?: string,
    contentType?: "media" | "devotional",
    contentOwnerName?: string,
    creator?: CommentCreatorInfo | null,
    anchor?: CommentMediaAnchor | null
  ) => void;
  /** Re-dock sheet after feed chrome (tabs/header) collapses while open */
  updateCommentMediaLayout: (anchor: CommentMediaAnchor | null) => void;
  /** Same-frame start of dismiss — hide peek HUD and restore media with the sheet */
  beginCommentDismiss: () => void;
  hideCommentModal: () => void;
  addComment: (comment: Comment) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  likeComment: (commentId: string) => void;
  replyToComment: (
    commentId: string,
    replyTextOrPayload: SubmitCommentInput
  ) => Promise<void>;
  submitComment: (textOrPayload: SubmitCommentInput) => Promise<void>;
  editComment: (commentId: string, input: EditCommentInput) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  loadMoreComments: () => Promise<void>;
  retryLoadComments: () => Promise<void>;
  contentOwnerName?: string;
  contentCreator?: CommentCreatorInfo | null;
  typingUsers: { userId: string; displayName: string }[];
  setLocalTyping: (isTyping: boolean) => void;
}

export const COMMENT_MODAL_NOOP: CommentModalContextType = {
  isVisible: false,
  isClosing: false,
  comments: [],
  isLoadingComments: false,
  loadError: null,
  composerError: null,
  clearComposerError: () => {},
  mediaPeekHeight: MEDIA_PEEK_HEIGHT,
  mediaShiftY: 0,
  mediaScale: 1,
  contentId: undefined,
  showCommentModal: () => {},
  updateCommentMediaLayout: () => {},
  beginCommentDismiss: () => {},
  hideCommentModal: () => {},
  addComment: () => {},
  updateComment: () => {},
  likeComment: () => {},
  replyToComment: async () => {},
  submitComment: async () => {},
  editComment: async () => {},
  deleteComment: async () => {},
  loadMoreComments: async () => {},
  retryLoadComments: async () => {},
  contentOwnerName: undefined,
  contentCreator: null,
  typingUsers: [],
  setLocalTyping: () => {},
};
