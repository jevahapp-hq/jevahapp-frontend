// Forum Hooks
import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  communityAPI,
  Forum,
  ForumPost,
  ForumComment,
} from "../utils/communityAPI";
import { ApiErrorHandler, ApiError } from "../utils/apiErrorHandler";

export function useForums() {
  const [categories, setCategories] = useState<Forum[]>([]);
  const [discussions, setDiscussions] = useState<Forum[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [discussionsLoading, setDiscussionsLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<ApiError | null>(null);
  const [discussionsError, setDiscussionsError] = useState<ApiError | null>(
    null
  );
  const lastFetchedCategoryIdRef = useRef<string | null>(null);

  const loadCategories = useCallback(async (): Promise<Forum[]> => {
    try {
      setCategoriesLoading(true);
      setCategoriesError(null);
      const response = await communityAPI.getForums({
        page: 1,
        limit: 100,
        view: "categories",
      });

      if (response.success && response.data) {
        const fetchedCategories = response.data.forums;
        setCategories(fetchedCategories);
        return fetchedCategories;
      } else {
        const apiError = ApiErrorHandler.handle(response);
        setCategoriesError(apiError);
      }
    } catch (err: any) {
      const apiError = ApiErrorHandler.handle(err);
      setCategoriesError(apiError);
    } finally {
      setCategoriesLoading(false);
    }

    setCategories([]);
    return [];
  }, []);

  const loadDiscussions = useCallback(
    async (categoryId: string): Promise<Forum[]> => {
      if (!categoryId) {
        setDiscussions([]);
        return [];
      }

      try {
        setDiscussionsLoading(true);
        setDiscussionsError(null);
        const response = await communityAPI.getForums({
          page: 1,
          limit: 100,
          view: "discussions",
          categoryId,
        });

        if (response.success && response.data) {
          const fetchedDiscussions = response.data.forums;
          const filteredDiscussions = fetchedDiscussions.filter(
            (forum) => forum.isCategory !== true
          );
          setDiscussions(filteredDiscussions);
          return filteredDiscussions;
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setDiscussionsError(apiError);
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setDiscussionsError(apiError);
      } finally {
        setDiscussionsLoading(false);
      }

      setDiscussions([]);
      return [];
    },
    []
  );

  const selectCategory = useCallback((categoryId: string) => {
    setSelectedCategoryId(categoryId);
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    if (categories.length === 0) {
      setSelectedCategoryId(null);
      setDiscussions([]);
      lastFetchedCategoryIdRef.current = null;
      return;
    }

    if (
      !selectedCategoryId ||
      !categories.some((category) => category._id === selectedCategoryId)
    ) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories, selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) {
      setDiscussions([]);
      lastFetchedCategoryIdRef.current = null;
      return;
    }

    if (lastFetchedCategoryIdRef.current === selectedCategoryId) {
      return;
    }

    lastFetchedCategoryIdRef.current = selectedCategoryId;
    void loadDiscussions(selectedCategoryId);
  }, [selectedCategoryId, loadDiscussions]);

  const createForum = useCallback(
    async (forumData: {
      categoryId: string;
      title: string;
      description: string;
    }) => {
      try {
        setDiscussionsError(null);
        const response = await communityAPI.createForum(forumData);
        if (response.success && response.data) {
          const createdForum = response.data;
          
          // Optimistically add the forum to discussions if it's in the current category
          if (forumData.categoryId === selectedCategoryId) {
            setDiscussions((prev) => {
              // Check if forum already exists (avoid duplicates)
              const exists = prev.some((f) => f._id === createdForum._id);
              if (exists) return prev;
              // Add at the beginning (newest first)
              return [createdForum, ...prev];
            });
            
            // Also refresh from server to ensure we have the latest data
            lastFetchedCategoryIdRef.current = forumData.categoryId;
            await loadDiscussions(forumData.categoryId);
          } else {
            // If different category, just refresh categories
            void loadCategories();
          }
          return createdForum;
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setDiscussionsError(apiError);
          return null;
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setDiscussionsError(apiError);
        return null;
      }
    },
    [loadDiscussions, loadCategories, selectedCategoryId]
  );

  return {
    categories,
    discussions,
    selectedCategoryId,
    categoriesLoading,
    discussionsLoading,
    categoriesError,
    discussionsError,
    loadCategories,
    loadDiscussions,
    selectCategory,
    createForum,
  };
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

  const updatePost = useCallback(
    async (
      postId: string,
      postData: {
        content?: string;
        embeddedLinks?: Array<{
          url: string;
          title?: string;
          description?: string;
          thumbnail?: string;
          type: "video" | "article" | "resource" | "other";
        }>;
        tags?: string[];
      }
    ) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.updateForumPost(postId, postData);
        if (response.success && response.data) {
          setPosts((prev) => prev.map((p) => (p._id === postId ? response.data! : p)));
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

  const deletePost = useCallback(
    async (postId: string) => {
      try {
        setLoading(true);
        setError(null);
        const response = await communityAPI.deleteForumPost(postId);
        if (response.success) {
          setPosts((prev) => prev.filter((p) => p._id !== postId));
          return true;
        } else {
          const apiError = ApiErrorHandler.handle(response);
          setError(apiError);
          return false;
        }
      } catch (err: any) {
        const apiError = ApiErrorHandler.handle(err);
        setError(apiError);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    posts,
    loading,
    error,
    hasMore,
    loadMore: () => loadPosts(false),
    refresh,
    createPost,
    updatePost,
    deletePost,
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

// Helper to check if current user is post owner
export async function isForumPostOwner(post: ForumPost): Promise<boolean> {
  try {
    const userStr = await AsyncStorage.getItem("user");
    if (!userStr || !post) {
      return false;
    }

    const user = JSON.parse(userStr);
    const currentUserId = user._id || user.id || user.email;

    if (!currentUserId) {
      return false;
    }

    // Check different fields for author ID
    const authorId = 
      post.userId || 
      post.author?._id || 
      post.user?._id;

    return authorId === currentUserId;
  } catch (error) {
    console.error("Error checking forum post ownership:", error);
    return false;
  }
}

