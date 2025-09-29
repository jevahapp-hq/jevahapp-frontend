import AsyncStorage from "@react-native-async-storage/async-storage";
import allMediaAPI from "../utils/allMediaAPI";
import { PerformanceOptimizer } from "../utils/performance";

export interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: Date;
  likes: number;
  contentId: string;
}

export interface CommentResponse {
  success: boolean;
  data?: Comment[];
  message?: string;
  error?: string;
}

class CommentService {
  private static instance: CommentService;
  private commentsCache = new Map<string, Comment[]>();

  static getInstance(): CommentService {
    if (!CommentService.instance) {
      CommentService.instance = new CommentService();
    }
    return CommentService.instance;
  }

  // Get comments for a specific content
  async getComments(contentId: string): Promise<Comment[]> {
    try {
      // Use performance optimizer for caching
      return await PerformanceOptimizer.optimizedFetch(
        `comments-${contentId}`,
        async () => {
          // Check cache first
          if (this.commentsCache.has(contentId)) {
            return this.commentsCache.get(contentId)!;
          }

          // Check AsyncStorage for persisted comments
          const storedComments = await AsyncStorage.getItem(
            `comments-${contentId}`
          );
          if (storedComments) {
            const parsedComments = JSON.parse(storedComments).map((c: any) => ({
              ...c,
              timestamp: new Date(c.timestamp),
            }));
            this.commentsCache.set(contentId, parsedComments);
            return parsedComments;
          }

          // Real API call
          console.log(`🔄 Fetching comments for content: ${contentId}`);
          const response = await allMediaAPI.getComments(
            "media",
            contentId,
            1,
            50
          );

          if (response.success && response.data?.comments) {
            // Transform API response to our Comment interface
            const apiComments: Comment[] = response.data.comments.map(
              (apiComment: any) => ({
                id: apiComment._id,
                text: apiComment.comment,
                userId: apiComment.author?._id || "unknown",
                userName: `${apiComment.author?.firstName || "Unknown"} ${
                  apiComment.author?.lastName || "User"
                }`,
                userAvatar: apiComment.author?.avatar || "",
                timestamp: new Date(apiComment.createdAt),
                likes: apiComment.likeCount || 0,
                contentId,
              })
            );

            // Cache the comments
            this.commentsCache.set(contentId, apiComments);

            // Persist to AsyncStorage
            await AsyncStorage.setItem(
              `comments-${contentId}`,
              JSON.stringify(apiComments)
            );

            console.log(
              `✅ Loaded ${apiComments.length} comments for content: ${contentId}`
            );
            return apiComments;
          } else {
            console.log(`⚠️ No comments found for content: ${contentId}`);
            return [];
          }
        },
        {
          cacheDuration: 5 * 60 * 1000, // 5 minutes
          background: true,
        }
      );
    } catch (error) {
      console.error("Failed to get comments:", error);
      return [];
    }
  }

  // Post a new comment
  async postComment(
    contentId: string,
    commentData: {
      text: string;
      userId: string;
      userName: string;
      userAvatar?: string;
    }
  ): Promise<Comment | null> {
    try {
      console.log(`🔄 Posting comment for content: ${contentId}`);

      // Real API call
      const response = await allMediaAPI.addComment(
        "media",
        contentId,
        commentData.text.trim()
      );

      if (response.success && response.data?.comment) {
        const apiComment = response.data.comment;

        // Transform API response to our Comment interface
        const newComment: Comment = {
          id: apiComment._id,
          text: apiComment.comment,
          userId: apiComment.author?._id || "unknown",
          userName: `${apiComment.author?.firstName || "Unknown"} ${
            apiComment.author?.lastName || "User"
          }`,
          userAvatar: apiComment.author?.avatar || "",
          timestamp: new Date(apiComment.createdAt),
          likes: apiComment.likeCount || 0,
          contentId,
        };

        // Add to cache
        const existingComments = this.commentsCache.get(contentId) || [];
        const updatedComments = [newComment, ...existingComments];
        this.commentsCache.set(contentId, updatedComments);

        // Persist to AsyncStorage
        await AsyncStorage.setItem(
          `comments-${contentId}`,
          JSON.stringify(updatedComments)
        );

        // Clear performance cache to force refresh
        // PerformanceOptimizer.clearCache(`comments-${contentId}`);

        console.log(`✅ Comment posted successfully for content: ${contentId}`);
        return newComment;
      } else {
        console.error(`❌ Failed to post comment: ${response.error}`);
        return null;
      }
    } catch (error) {
      console.error("Failed to post comment:", error);
      return null;
    }
  }

  // Like a comment
  async likeComment(contentId: string, commentId: string): Promise<boolean> {
    try {
      const comments = this.commentsCache.get(contentId) || [];
      const updatedComments = comments.map((comment) =>
        comment.id === commentId
          ? { ...comment, likes: comment.likes + 1 }
          : comment
      );

      this.commentsCache.set(contentId, updatedComments);
      await AsyncStorage.setItem(
        `comments-${contentId}`,
        JSON.stringify(updatedComments)
      );

      return true;
    } catch (error) {
      console.error("Failed to like comment:", error);
      return false;
    }
  }

  // Get comment count for content
  async getCommentCount(contentId: string): Promise<number> {
    try {
      const comments = await this.getComments(contentId);
      return comments.length;
    } catch (error) {
      console.error("Failed to get comment count:", error);
      return 0;
    }
  }

  // Delete a comment (only for comment owner)
  async deleteComment(
    contentId: string,
    commentId: string,
    userId: string
  ): Promise<boolean> {
    try {
      console.log(
        `🔄 Deleting comment: ${commentId} for content: ${contentId}`
      );

      // Real API call
      const response = await allMediaAPI.deleteComment(commentId);

      if (response.success) {
        // Update local cache
        const comments = this.commentsCache.get(contentId) || [];
        const updatedComments = comments.filter((c) => c.id !== commentId);
        this.commentsCache.set(contentId, updatedComments);
        await AsyncStorage.setItem(
          `comments-${contentId}`,
          JSON.stringify(updatedComments)
        );

        // Clear performance cache
        // PerformanceOptimizer.clearCache(`comments-${contentId}`);

        console.log(`✅ Comment deleted successfully: ${commentId}`);
        return true;
      } else {
        console.error(`❌ Failed to delete comment: ${response.error}`);
        return false;
      }
    } catch (error) {
      console.error("Failed to delete comment:", error);
      return false;
    }
  }

  // Clear all comments for a content (admin function)
  async clearComments(contentId: string): Promise<boolean> {
    try {
      this.commentsCache.delete(contentId);
      await AsyncStorage.removeItem(`comments-${contentId}`);
      // PerformanceOptimizer.clearCache(`comments-${contentId}`);
      return true;
    } catch (error) {
      console.error("Failed to clear comments:", error);
      return false;
    }
  }

  // Get recent comments across all content
  async getRecentComments(limit: number = 10): Promise<Comment[]> {
    try {
      const allComments: Comment[] = [];

      // Get all comment keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const commentKeys = keys.filter((key) => key.startsWith("comments-"));

      // Load all comments
      for (const key of commentKeys) {
        const storedComments = await AsyncStorage.getItem(key);
        if (storedComments) {
          const parsedComments = JSON.parse(storedComments).map((c: any) => ({
            ...c,
            timestamp: new Date(c.timestamp),
          }));
          allComments.push(...parsedComments);
        }
      }

      // Sort by timestamp and return recent ones
      return allComments
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error("Failed to get recent comments:", error);
      return [];
    }
  }

  // Search comments
  async searchComments(query: string, contentId?: string): Promise<Comment[]> {
    try {
      let comments: Comment[] = [];

      if (contentId) {
        comments = await this.getComments(contentId);
      } else {
        // Search across all comments
        const keys = await AsyncStorage.getAllKeys();
        const commentKeys = keys.filter((key) => key.startsWith("comments-"));

        for (const key of commentKeys) {
          const storedComments = await AsyncStorage.getItem(key);
          if (storedComments) {
            const parsedComments = JSON.parse(storedComments).map((c: any) => ({
              ...c,
              timestamp: new Date(c.timestamp),
            }));
            comments.push(...parsedComments);
          }
        }
      }

      // Filter by query
      const lowerQuery = query.toLowerCase();
      return comments.filter(
        (comment) =>
          comment.text.toLowerCase().includes(lowerQuery) ||
          comment.userName.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error("Failed to search comments:", error);
      return [];
    }
  }
}

export default CommentService;
