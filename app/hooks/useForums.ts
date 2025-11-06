// Forum Hooks
import { useState, useEffect, useCallback } from "react";
import {
  communityAPI,
  Forum,
  ForumPost,
  ForumComment,
} from "../utils/communityAPI";
import { ApiErrorHandler, ApiError } from "../utils/apiErrorHandler";

export function useForums() {
  const [forums, setForums] = useState<Forum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const loadForums = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await communityAPI.getForums({ page: 1, limit: 50 });

      if (response.success && response.data) {
        setForums(response.data.forums);
      } else {
        const apiError = ApiErrorHandler.handle(response);
        setError(apiError);
      }
    } catch (err: any) {
      const apiError = ApiErrorHandler.handle(err);
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, []);

  const createForum = useCallback(
    async (forumData: { title: string; description: string }) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.createForum(forumData);
        if (response.success && response.data) {
          setForums((prev) => [response.data!, ...prev]);
          return response.data;
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadForums();
  }, [loadForums]);

  return { forums, loading, error, loadForums, createForum };
}

export function useForumPosts(forumId: string) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<ApiError | null>(null);

  const loadPosts = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;

      try {
        setLoading(true);
        setError(null);
        const currentPage = reset ? 1 : page;
        const response = await communityAPI.getForumPosts(forumId, {
          page: currentPage,
          limit: 20,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (response.success && response.data) {
          const { posts: newPosts, pagination } = response.data;
          if (reset) {
            setPosts(newPosts);
          } else {
            setPosts((prev) => [...prev, ...newPosts]);
          }

          setHasMore(pagination.hasMore);
          setPage(currentPage + 1);
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
      } finally {
        setLoading(false);
      }
    },
    [forumId, page, loading, hasMore]
  );

  const createPost = useCallback(
    async (postData: {
      content: string;
      embeddedLinks?: Array<{
        url: string;
        title?: string;
        description?: string;
        thumbnail?: string;
        type: "video" | "article" | "resource" | "other";
      }>;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.createForumPost(forumId, postData);
        if (response.success && response.data) {
          setPosts((prev) => [response.data!, ...prev]);
          return response.data;
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [forumId]
  );

  const likePost = useCallback(
    async (postId: string, currentLiked: boolean, currentLikesCount: number) => {
      // Optimistic update
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                userLiked: !currentLiked,
                likesCount: currentLiked
                  ? currentLikesCount - 1
                  : currentLikesCount + 1,
              }
            : post
        )
      );

      try {
        const response = await communityAPI.likeForumPost(postId);
        if (response.success && response.data) {
          // Update with actual server response
          setPosts((prev) =>
            prev.map((post) =>
              post._id === postId
                ? {
                    ...post,
                    userLiked: response.data!.liked,
                    likesCount: response.data!.likesCount,
                  }
                : post
            )
          );
          return response.data;
        } else {
          // Revert optimistic update on error
          setPosts((prev) =>
            prev.map((post) =>
              post._id === postId
                ? {
                    ...post,
                    userLiked: currentLiked,
                    likesCount: currentLikesCount,
                  }
                : post
            )
          );
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        // Revert optimistic update on error
        setPosts((prev) =>
          prev.map((post) =>
            post._id === postId
              ? {
                  ...post,
                  userLiked: currentLiked,
                  likesCount: currentLikesCount,
                }
              : post
          )
        );
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      }
    },
    []
  );

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    loadPosts(true);
  }, [loadPosts]);

  useEffect(() => {
    if (forumId) {
      loadPosts(true);
    }
  }, [forumId]);

  return {
    posts,
    loading,
    error,
    hasMore,
    loadMore: () => loadPosts(false),
    refresh,
    createPost,
    likePost,
  };
}

export function useForumPostComments(postId: string) {
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<ApiError | null>(null);

  const loadComments = useCallback(
    async (reset = false) => {
      if (loading || (!hasMore && !reset)) return;

      try {
        setLoading(true);
        setError(null);
        const currentPage = reset ? 1 : page;
        const response = await communityAPI.getForumPostComments(postId, {
          page: currentPage,
          limit: 20,
          includeReplies: true,
        });

        if (response.success && response.data) {
          const { comments: newComments, pagination } = response.data;
          if (reset) {
            setComments(newComments);
          } else {
            setComments((prev) => [...prev, ...newComments]);
          }

          setHasMore(pagination.hasMore);
          setPage(currentPage + 1);
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
      } finally {
        setLoading(false);
      }
    },
    [postId, page, loading, hasMore]
  );

  const addComment = useCallback(
    async (commentData: {
      content: string;
      parentCommentId?: string;
    }) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.commentOnForumPost(
          postId,
          commentData
        );
        if (response.success && response.data) {
          if (commentData.parentCommentId) {
            // Add as reply to parent comment
            setComments((prev) =>
              prev.map((comment) =>
                comment._id === commentData.parentCommentId
                  ? {
                      ...comment,
                      replies: [...(comment.replies || []), response.data!],
                    }
                  : comment
              )
            );
          } else {
            // Add as top-level comment
            setComments((prev) => [response.data!, ...prev]);
          }
          return response.data;
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [postId]
  );

  const likeComment = useCallback(
    async (
      commentId: string,
      currentLiked: boolean,
      currentLikesCount: number
    ) => {
      // Optimistic update
      const updateComment = (comment: ForumComment): ForumComment => {
        if (comment._id === commentId) {
          return {
            ...comment,
            userLiked: !currentLiked,
            likesCount: currentLiked
              ? currentLikesCount - 1
              : currentLikesCount + 1,
          };
        }
        if (comment.replies) {
          return {
            ...comment,
            replies: comment.replies.map(updateComment),
          };
        }
        return comment;
      };

      setComments((prev) => prev.map(updateComment));

      try {
        const response = await communityAPI.likeForumComment(commentId);
        if (response.success && response.data) {
          // Update with actual server response
          const updateWithServerData = (comment: ForumComment): ForumComment => {
            if (comment._id === commentId) {
              return {
                ...comment,
                userLiked: response.data!.liked,
                likesCount: response.data!.likesCount,
              };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map(updateWithServerData),
              };
            }
            return comment;
          };

          setComments((prev) => prev.map(updateWithServerData));
          return response.data;
        } else {
          // Revert optimistic update on error
          const revertUpdate = (comment: ForumComment): ForumComment => {
            if (comment._id === commentId) {
              return {
                ...comment,
                userLiked: currentLiked,
                likesCount: currentLikesCount,
              };
            }
            if (comment.replies) {
              return {
                ...comment,
                replies: comment.replies.map(revertUpdate),
              };
            }
            return comment;
          };

          setComments((prev) => prev.map(revertUpdate));
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return null;
        }
      } catch (err: any) {
        // Revert optimistic update on error
        const revertUpdate = (comment: ForumComment): ForumComment => {
          if (comment._id === commentId) {
            return {
              ...comment,
              userLiked: currentLiked,
              likesCount: currentLikesCount,
            };
          }
          if (comment.replies) {
            return {
              ...comment,
              replies: comment.replies.map(revertUpdate),
            };
          }
          return comment;
        };

        setComments((prev) => prev.map(revertUpdate));
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return null;
      }
    },
    []
  );

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    loadComments(true);
  }, [loadComments]);

  useEffect(() => {
    if (postId) {
      loadComments(true);
    }
  }, [postId]);

  return {
    comments,
    loading,
    error,
    hasMore,
    loadMore: () => loadComments(false),
    refresh,
    addComment,
    likeComment,
  };
}

