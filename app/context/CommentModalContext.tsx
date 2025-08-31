import React, { createContext, ReactNode, useContext, useState } from 'react';
import { useInteractionStore } from '../store/useInteractionStore';

interface Comment {
  id: string;
  userName: string;
  avatar: string;
  timestamp: string;
  comment: string;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
  parentId?: string; // ID of the parent comment if this is a reply
}

interface CommentModalContextType {
  isVisible: boolean;
  comments: Comment[];
  showCommentModal: (comments: Comment[], contentId?: string) => void;
  hideCommentModal: () => void;
  addComment: (comment: Comment) => void;
  updateComment: (commentId: string, updates: Partial<Comment>) => void;
  likeComment: (commentId: string) => void;
  replyToComment: (commentId: string, replyText: string) => void;
}

const CommentModalContext = createContext<CommentModalContextType | undefined>(undefined);

export const useCommentModal = () => {
  const context = useContext(CommentModalContext);
  if (!context) {
    throw new Error('useCommentModal must be used within a CommentModalProvider');
  }
  return context;
};

interface CommentModalProviderProps {
  children: ReactNode;
}

export const CommentModalProvider: React.FC<CommentModalProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentContentId, setCurrentContentId] = useState<string>('');

  const { addComment: addCommentToStore, toggleCommentLike } = useInteractionStore();

  const showCommentModal = (newComments: Comment[], contentId?: string) => {
    setComments(newComments);
    if (contentId) {
      setCurrentContentId(contentId);
    }
    setIsVisible(true);
  };

  const hideCommentModal = () => {
    setIsVisible(false);
    setComments([]);
    setCurrentContentId('');
  };

  const addComment = (comment: Comment) => {
    setComments(prev => [comment, ...prev]);
  };

  const updateComment = (commentId: string, updates: Partial<Comment>) => {
    setComments(prev =>
      prev.map(comment =>
        comment.id === commentId ? { ...comment, ...updates } : comment
      )
    );
  };

  const likeComment = async (commentId: string) => {
    try {
      // Update local state immediately for better UX
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { 
                ...comment, 
                isLiked: !comment.isLiked, 
                likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1 
              }
            : comment
        )
      );

      // Update in the store if we have a contentId
      if (currentContentId) {
        await toggleCommentLike(commentId, currentContentId);
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      // Revert the local state if the store update failed
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { 
                ...comment, 
                isLiked: !comment.isLiked, 
                likes: comment.isLiked ? comment.likes + 1 : comment.likes - 1 
              }
            : comment
        )
      );
    }
  };

  const replyToComment = async (commentId: string, replyText: string) => {
    try {
      // Create the new reply comment
      const newReply: Comment = {
        id: Date.now().toString(), // Temporary ID
        userName: 'Current User', // This should come from user context
        avatar: '',
        timestamp: new Date().toISOString(),
        comment: replyText,
        likes: 0,
        isLiked: false,
        parentId: commentId,
      };
      
      // Add the reply to the specific comment's replies array
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? {
                ...comment,
                replies: [...(comment.replies || []), newReply]
              }
            : comment
        )
      );

      // Add the comment to the store if we have a contentId
      if (currentContentId) {
        await addCommentToStore(currentContentId, replyText);
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const value: CommentModalContextType = {
    isVisible,
    comments,
    showCommentModal,
    hideCommentModal,
    addComment,
    updateComment,
    likeComment,
    replyToComment,
  };

  return (
    <CommentModalContext.Provider value={value}>
      {children}
    </CommentModalContext.Provider>
  );
};
