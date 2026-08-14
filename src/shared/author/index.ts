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
  clearAuthorFetchFailures,
  ensureAuthorProfile,
  ensureAuthorProfiles,
  getAuthorProfile,
  hydrateAuthorProfilesSync,
  putAuthorProfile,
  seedAuthorFromSession,
  useAuthorStoreVersion,
} from "./authorProfileStore";

export { AUTHOR_DISK_KEY } from "./authorDiskCache";

export {
  resolveAuthorAvatar,
  resolveAuthorName,
  seedAuthorsFromItem,
} from "./resolveAuthor";

export {
  applyAuthorsToMedia,
  enrichContentWithAuthor,
  ensureFeedAuthors,
  feedItemsNeedFullAuthorRefetch,
  feedNeedsAuthorEnrichment,
  paintAuthorsFromCache,
} from "./enrichFeedAuthors";

export {
  mergeAuthorFieldsByMediaId,
  hydrateAuthorsFromPublicIndex,
} from "./publicAuthorIndex";
