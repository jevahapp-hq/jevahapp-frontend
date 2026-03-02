import { useEffect } from "react";

interface SocketParams {
  socketManager: any;
  contentId: string;
  setIsLiked: React.Dispatch<React.SetStateAction<boolean>>;
  setLikeCount: React.Dispatch<React.SetStateAction<number>>;
  setCommentCount: React.Dispatch<React.SetStateAction<number>>;
  setShareCount: React.Dispatch<React.SetStateAction<number>>;
  setViewerCount: React.Dispatch<React.SetStateAction<number>>;
  animateLike: () => void;
}

export function useContentCardSocket(params: SocketParams) {
  const {
    socketManager,
    contentId,
    setIsLiked,
    setLikeCount,
    setCommentCount,
    setShareCount,
    setViewerCount,
    animateLike,
  } = params;

  useEffect(() => {
    if (!socketManager) return;

    socketManager.joinContentRoom(contentId, "media");

    const originalHandlers = {
      onContentReaction: socketManager.handleContentReaction,
      onCountUpdate: socketManager.handleCountUpdate,
      onViewerCountUpdate: socketManager.handleViewerCountUpdate,
    };

    socketManager.setEventHandlers({
      ...originalHandlers,
      onContentReaction: (data: any) => {
        if (data.contentId === contentId) {
          setIsLiked(data.liked);
          setLikeCount(data.count);
          animateLike();
        }
        originalHandlers.onContentReaction?.(data);
      },
      onCountUpdate: (data: any) => {
        if (data.contentId === contentId) {
          setLikeCount(data.likeCount);
          setCommentCount(data.commentCount);
          setShareCount(data.shareCount);
        }
        originalHandlers.onCountUpdate?.(data);
      },
      onViewerCountUpdate: (data: any) => {
        if (data.contentId === contentId) {
          setViewerCount(data.viewerCount);
        }
        originalHandlers.onViewerCountUpdate?.(data);
      },
    });

    return () => {
      socketManager.leaveContentRoom(contentId, "media");
    };
  }, [contentId, socketManager, setIsLiked, setLikeCount, setCommentCount, setShareCount, setViewerCount, animateLike]);
}
