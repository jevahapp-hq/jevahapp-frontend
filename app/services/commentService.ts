import AsyncStorage from '@react-native-async-storage/async-storage';
import { PerformanceOptimizer } from '../utils/performance';

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
          const storedComments = await AsyncStorage.getItem(`comments-${contentId}`);
          if (storedComments) {
            const parsedComments = JSON.parse(storedComments).map((c: any) => ({
              ...c,
              timestamp: new Date(c.timestamp),
            }));
            this.commentsCache.set(contentId, parsedComments);
            return parsedComments;
          }

          // Mock API call - replace with actual API
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Mock comments data
          const mockComments: Comment[] = [
            {
              id: '1',
              text: 'This is really helpful! Thank you for sharing.',
              userId: 'user456',
              userName: 'Sarah Wilson',
              timestamp: new Date(Date.now() - 3600000), // 1 hour ago
              likes: 3,
              contentId,
            },
            {
              id: '2',
              text: 'Great content! I learned a lot from this.',
              userId: 'user789',
              userName: 'Mike Johnson',
              timestamp: new Date(Date.now() - 7200000), // 2 hours ago
              likes: 1,
              contentId,
            },
            {
              id: '3',
              text: 'Amazing! This really helped me understand the topic better.',
              userId: 'user101',
              userName: 'Emily Davis',
              timestamp: new Date(Date.now() - 10800000), // 3 hours ago
              likes: 5,
              contentId,
            },
          ];

          // Cache the comments
          this.commentsCache.set(contentId, mockComments);
          
          // Persist to AsyncStorage
          await AsyncStorage.setItem(`comments-${contentId}`, JSON.stringify(mockComments));
          
          return mockComments;
        },
        {
          cacheDuration: 5 * 60 * 1000, // 5 minutes
          background: true,
        }
      );
    } catch (error) {
      console.error('Failed to get comments:', error);
      return [];
    }
  }

  // Post a new comment
  async postComment(contentId: string, commentData: {
    text: string;
    userId: string;
    userName: string;
    userAvatar?: string;
  }): Promise<Comment | null> {
    try {
      const newComment: Comment = {
        id: Date.now().toString(),
        text: commentData.text.trim(),
        userId: commentData.userId,
        userName: commentData.userName,
        userAvatar: commentData.userAvatar,
        timestamp: new Date(),
        likes: 0,
        contentId,
      };

      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Add to cache
      const existingComments = this.commentsCache.get(contentId) || [];
      const updatedComments = [newComment, ...existingComments];
      this.commentsCache.set(contentId, updatedComments);

      // Persist to AsyncStorage
      await AsyncStorage.setItem(`comments-${contentId}`, JSON.stringify(updatedComments));

      // Clear performance cache to force refresh
      PerformanceOptimizer.clearCache(`comments-${contentId}`);

      return newComment;
    } catch (error) {
      console.error('Failed to post comment:', error);
      return null;
    }
  }

  // Like a comment
  async likeComment(contentId: string, commentId: string): Promise<boolean> {
    try {
      const comments = this.commentsCache.get(contentId) || [];
      const updatedComments = comments.map(comment =>
        comment.id === commentId
          ? { ...comment, likes: comment.likes + 1 }
          : comment
      );

      this.commentsCache.set(contentId, updatedComments);
      await AsyncStorage.setItem(`comments-${contentId}`, JSON.stringify(updatedComments));

      return true;
    } catch (error) {
      console.error('Failed to like comment:', error);
      return false;
    }
  }

  // Get comment count for content
  async getCommentCount(contentId: string): Promise<number> {
    try {
      const comments = await this.getComments(contentId);
      return comments.length;
    } catch (error) {
      console.error('Failed to get comment count:', error);
      return 0;
    }
  }

  // Delete a comment (only for comment owner)
  async deleteComment(contentId: string, commentId: string, userId: string): Promise<boolean> {
    try {
      const comments = this.commentsCache.get(contentId) || [];
      const commentToDelete = comments.find(c => c.id === commentId);
      
      if (!commentToDelete || commentToDelete.userId !== userId) {
        return false; // Not authorized or comment not found
      }

      const updatedComments = comments.filter(c => c.id !== commentId);
      this.commentsCache.set(contentId, updatedComments);
      await AsyncStorage.setItem(`comments-${contentId}`, JSON.stringify(updatedComments));

      // Clear performance cache
      PerformanceOptimizer.clearCache(`comments-${contentId}`);

      return true;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      return false;
    }
  }

  // Clear all comments for a content (admin function)
  async clearComments(contentId: string): Promise<boolean> {
    try {
      this.commentsCache.delete(contentId);
      await AsyncStorage.removeItem(`comments-${contentId}`);
      PerformanceOptimizer.clearCache(`comments-${contentId}`);
      return true;
    } catch (error) {
      console.error('Failed to clear comments:', error);
      return false;
    }
  }

  // Get recent comments across all content
  async getRecentComments(limit: number = 10): Promise<Comment[]> {
    try {
      const allComments: Comment[] = [];
      
      // Get all comment keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const commentKeys = keys.filter(key => key.startsWith('comments-'));
      
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
      console.error('Failed to get recent comments:', error);
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
        const commentKeys = keys.filter(key => key.startsWith('comments-'));
        
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
      return comments.filter(comment =>
        comment.text.toLowerCase().includes(lowerQuery) ||
        comment.userName.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Failed to search comments:', error);
      return [];
    }
  }
}

export default CommentService;
