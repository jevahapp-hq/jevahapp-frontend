/**
 * Facade over the media API modules in ./allMediaAPI/.
 *
 * The singleton's method surface is unchanged — consumers keep calling
 * `allMediaAPI.getAllMedia(...)` — while each domain lives in its own module.
 */
import * as bookmarks from "./allMediaAPI/bookmarks";
import * as comments from "./allMediaAPI/comments";
import * as content from "./allMediaAPI/content";
import * as diagnostics from "./allMediaAPI/diagnostics";
import * as discovery from "./allMediaAPI/discovery";
import * as interactions from "./allMediaAPI/interactions";

export type {
  AllMediaItem,
  AllMediaResponse,
  ApiResult,
  ContentListResult,
  DefaultContentResult,
  Pagination,
} from "./allMediaAPI/types";

class AllMediaAPI {
  // Discovery
  getAllMedia = discovery.getAllMedia;
  getTrendingMedia = discovery.getTrendingMedia;
  getMostCommentedMedia = discovery.getMostCommentedMedia;
  getMostLikedMedia = discovery.getMostLikedMedia;
  getLatestMedia = discovery.getLatestMedia;
  searchAllMedia = discovery.searchAllMedia;
  getDefaultContent = discovery.getDefaultContent;

  // Content lists
  getAllContentPublic = content.getAllContentPublic;
  getAllContentWithAuth = content.getAllContentWithAuth;

  // Interactions
  toggleLike = interactions.toggleLike;
  shareContent = interactions.shareContent;

  // Comments
  addComment = comments.addComment;
  getComments = comments.getComments;
  deleteComment = comments.deleteComment;

  // Bookmarks
  bookmarkContent = bookmarks.bookmarkContent;
  unbookmarkContent = bookmarks.unbookmarkContent;
  toggleBookmark = bookmarks.toggleBookmark;
  getSavedContent = bookmarks.getSavedContent;
  isContentBookmarked = bookmarks.isContentBookmarked;

  // Diagnostics
  checkServerHealth = diagnostics.checkServerHealth;
  testAvailableEndpoints = diagnostics.testAvailableEndpoints;
}

export default new AllMediaAPI();
