// ============= COMMUNITY API SERVICE =============
import { CommunityAPIClient } from "./client";
import { forumApiMethods } from "./forumApi";
import { groupsApiMethods } from "./groupsApi";
import { pollsApiMethods } from "./pollsApi";
import { prayerApiMethods } from "./prayerApi";

/**
 * Composed public API — identical surface to the former monolithic CommunityAPIService.
 */
export class CommunityAPIService extends CommunityAPIClient {
  // Prayer Wall
  createPrayer = prayerApiMethods.createPrayer;
  getPrayers = prayerApiMethods.getPrayers;
  searchPrayers = prayerApiMethods.searchPrayers;
  likePrayer = prayerApiMethods.likePrayer;
  getPrayerComments = prayerApiMethods.getPrayerComments;
  commentOnPrayer = prayerApiMethods.commentOnPrayer;
  updatePrayer = prayerApiMethods.updatePrayer;
  deletePrayer = prayerApiMethods.deletePrayer;

  // Forum
  createForum = forumApiMethods.createForum;
  getForums = forumApiMethods.getForums;
  getForumPosts = forumApiMethods.getForumPosts;
  createForumPost = forumApiMethods.createForumPost;
  updateForumPost = forumApiMethods.updateForumPost;
  deleteForumPost = forumApiMethods.deleteForumPost;
  likeForumPost = forumApiMethods.likeForumPost;
  getForumPostComments = forumApiMethods.getForumPostComments;
  commentOnForumPost = forumApiMethods.commentOnForumPost;
  likeForumComment = forumApiMethods.likeForumComment;

  // Groups
  createGroup = groupsApiMethods.createGroup;
  updateGroup = groupsApiMethods.updateGroup;
  getMyGroups = groupsApiMethods.getMyGroups;
  exploreGroups = groupsApiMethods.exploreGroups;
  getGroupDetails = groupsApiMethods.getGroupDetails;
  addGroupMembers = groupsApiMethods.addGroupMembers;
  joinGroup = groupsApiMethods.joinGroup;
  leaveGroup = groupsApiMethods.leaveGroup;
  removeGroupMember = groupsApiMethods.removeGroupMember;

  // Polls
  createPoll = pollsApiMethods.createPoll;
  getPolls = pollsApiMethods.getPolls;
  getMyPolls = pollsApiMethods.getMyPolls;
  getPollDetails = pollsApiMethods.getPollDetails;
  voteOnPoll = pollsApiMethods.voteOnPoll;
  updatePoll = pollsApiMethods.updatePoll;
  deletePoll = pollsApiMethods.deletePoll;
}

export const communityAPI = new CommunityAPIService();
export default communityAPI;
