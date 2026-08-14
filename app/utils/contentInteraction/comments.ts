/** Barrel — stable public surface for contentInteraction comments. */
export {
  peekCachedComments,
  putCachedComments,
  writeDiskCommentsCache,
  hydrateCommentsCacheFromDisk,
  peekDiskComments,
  invalidateDiskCommentsCache,
  diskCommentsCacheKey,
} from "./commentCache";
export {
  commentPathType,
  transformComment,
  extractCommentArray,
  extractTotal,
} from "./commentTransform";
export { addComment } from "./commentCreate";
export { getComments } from "./commentFetch";
export { toggleCommentLike } from "./commentReactions";
export { editComment, deleteComment } from "./commentMutate";
export { searchUsersForMentions } from "./commentMentions";
