/**
 * Facade over the media API modules in ./media/.
 *
 * The `mediaApi` singleton's method surface is unchanged — consumers keep
 * calling `mediaApi.getAllContentPublic(...)` — while each domain lives in
 * its own module.
 */
import * as comments from "./media/comments";
import * as diagnostics from "./media/diagnostics";
import * as engagement from "./media/engagement";
import * as feeds from "./media/feeds";
import * as playback from "./media/playback";
import * as stats from "./media/stats";
import * as uploads from "./media/uploads";

export type { Result } from "./media/envelope";
export { parseMediaListPayload } from "./media/parseMediaList";

class MediaApi {
  // Feeds
  getAllContentPublic = feeds.getAllContentPublic;
  getAllContentWithAuth = feeds.getAllContentWithAuth;
  getDefaultContent = feeds.getDefaultContent;
  getContentById = feeds.getContentById;
  getMediaById = feeds.getMediaById;

  // Stats
  getContentStats = stats.getContentStats;
  batchGetContentStats = stats.batchGetContentStats;

  // Engagement
  toggleLike = engagement.toggleLike;
  toggleMediaLike = engagement.toggleMediaLike;
  toggleSave = engagement.toggleSave;
  toggleMediaBookmark = engagement.toggleMediaBookmark;
  recordShare = engagement.recordShare;
  recordView = engagement.recordView;
  getUserSavedContent = engagement.getUserSavedContent;
  getActionStatus = engagement.getActionStatus;
  getBookmarkStatus = engagement.getBookmarkStatus;

  // Comments
  getComments = comments.getComments;
  addComment = comments.addComment;
  toggleCommentLike = comments.toggleCommentLike;

  // Uploads
  uploadMedia = uploads.uploadMedia;

  // Playback sessions
  startPlaybackSession = playback.startPlaybackSession;
  updatePlaybackProgress = playback.updatePlaybackProgress;
  pausePlayback = playback.pausePlayback;
  resumePlayback = playback.resumePlayback;
  endPlaybackSession = playback.endPlaybackSession;
  getActivePlaybackSession = playback.getActivePlaybackSession;

  // Diagnostics
  testAvailableEndpoints = diagnostics.testAvailableEndpoints;
}

// Export singleton instance
export const mediaApi = new MediaApi();
export default mediaApi;
