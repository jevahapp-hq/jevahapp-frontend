// ============= FORUM API =============
// Facade: the methods live in ./forum/ and are bound to CommunityAPIClient
// via `this` when spread onto the service in ./service.ts.
import * as comments from "./forum/forumComments";
import * as posts from "./forum/forumPosts";
import * as forums from "./forum/forums";

export type { ForumPostPayload } from "./forum/forumPosts";

export const forumApiMethods = {
  createForum: forums.createForum,
  getForums: forums.getForums,

  getForumPosts: posts.getForumPosts,
  createForumPost: posts.createForumPost,
  updateForumPost: posts.updateForumPost,
  deleteForumPost: posts.deleteForumPost,
  likeForumPost: posts.likeForumPost,

  getForumPostComments: comments.getForumPostComments,
  commentOnForumPost: comments.commentOnForumPost,
  likeForumComment: comments.likeForumComment,
};
