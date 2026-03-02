import { useCallback } from 'react';

interface VideoViewportHook {
  calculateVideoVisibility: (scrollY: number, screenHeight: number, videos: any[]) => string | null;
  getVideoPositionInScroll: (index: number, offset?: number) => { startY: number; endY: number };
}

const useVideoViewport = (): VideoViewportHook => {
  // Default layout measurements
  const VIDEO_HEIGHT = 400;
  const VIDEO_MARGIN_BOTTOM = 40;
  const TITLE_SECTION_HEIGHT = 80;
  const FOOTER_HEIGHT = 100;
  const CARD_TOTAL_HEIGHT = VIDEO_HEIGHT + FOOTER_HEIGHT + VIDEO_MARGIN_BOTTOM;
  
  // Minimum visibility percentage to trigger auto-play
  const MIN_VISIBILITY_THRESHOLD = 0.5; // 50%

  const getVideoPositionInScroll = useCallback((index: number, offset = 0): { startY: number; endY: number } => {
    const videoStartY = TITLE_SECTION_HEIGHT + offset + (index * CARD_TOTAL_HEIGHT);
    const videoEndY = videoStartY + VIDEO_HEIGHT;
    
    return { startY: videoStartY, endY: videoEndY };
  }, []);

  const calculateVideoVisibility = useCallback((
    scrollY: number, 
    screenHeight: number, 
    videos: any[]
  ): string | null => {
    let mostVisibleVideo: string | null = null;
    let maxVisibilityRatio = 0;

    videos.forEach((video, index) => {
      // Generate consistent video key
      const videoKey = `video-${video._id || video.fileUrl || index}`;
      
      // Calculate this video's position
      const { startY: videoStartY, endY: videoEndY } = getVideoPositionInScroll(index);
      
      // Calculate viewport intersection
      const viewportTop = scrollY;
      const viewportBottom = scrollY + screenHeight;
      
      const intersectionTop = Math.max(viewportTop, videoStartY);
      const intersectionBottom = Math.min(viewportBottom, videoEndY);
      const visibleHeight = Math.max(0, intersectionBottom - intersectionTop);
      const visibilityRatio = visibleHeight / VIDEO_HEIGHT;
      
      // Consider video for auto-play if it meets visibility threshold
      if (visibilityRatio >= MIN_VISIBILITY_THRESHOLD && visibilityRatio > maxVisibilityRatio) {
        maxVisibilityRatio = visibilityRatio;
        mostVisibleVideo = videoKey;
      }
    });

    return mostVisibleVideo;
  }, [getVideoPositionInScroll]);

  return {
    calculateVideoVisibility,
    getVideoPositionInScroll
  };
};

export default useVideoViewport;
