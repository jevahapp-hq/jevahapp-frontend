/**
 * Public author attribution API.
 *
 * Import from `src/shared/author` only — do not re-implement name/avatar logic elsewhere.
 */
export {
  ANONYMOUS_AUTHOR_LABEL,
  type AuthorCarrier,
  type AuthorId,
  type AuthorProfile,
} from "./types";

export { extractAuthorId, isObjectId } from "./extractAuthorId";

export {
  hasUsableAuthorName,
  isPlaceholderName,
  normalizeAuthorProfile,
  nameFromUserLike,
} from "./normalizeAuthor";

export {
  ensureAuthorProfile,
  ensureAuthorProfiles,
  getAuthorProfile,
  putAuthorProfile,
  seedAuthorFromSession,
} from "./authorProfileStore";

export {
  resolveAuthorAvatar,
  resolveAuthorName,
  seedAuthorsFromItem,
} from "./resolveAuthor";

export {
  applyAuthorsToMedia,
  enrichContentWithAuthor,
  ensureFeedAuthors,
  feedNeedsAuthorEnrichment,
} from "./enrichFeedAuthors";
