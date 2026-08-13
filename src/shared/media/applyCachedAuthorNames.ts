/**
 * @deprecated Use ensureFeedAuthors / applyAuthorsToMedia from src/shared/author
 */
export {
  applyAuthorsToMedia as applyCachedAuthorNames,
  feedNeedsAuthorEnrichment as feedItemsNeedAuthorEnrichment,
  ensureFeedAuthors,
} from "../author";
