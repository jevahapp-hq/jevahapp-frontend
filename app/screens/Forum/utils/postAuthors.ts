import { ForumPost as ForumPostType } from "../../../utils/communityAPI";

export const getAuthorName = (post: ForumPostType): string => {
  if (post.author?.firstName && post.author?.lastName) {
    return `${post.author.firstName} ${post.author.lastName}`;
  }
  if (post.user?.firstName && post.user?.lastName) {
    return `${post.user.firstName} ${post.user.lastName}`;
  }
  if (post.author?.username) {
    return post.author.username;
  }
  if (post.user?.username) {
    return post.user.username;
  }
  return "User";
};

export const getAuthorInitials = (post: ForumPostType): string => {
  const name = getAuthorName(post);
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
