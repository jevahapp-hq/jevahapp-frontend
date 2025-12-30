/**
 * VideoComponent Helper Functions
 * Extracted from VideoComponent.tsx for better modularity
 */

/**
 * Format time from milliseconds to MM:SS format
 */
export const formatTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor((milliseconds || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/**
 * Get video key from file URL
 */
export const getVideoKey = (fileUrl: string): string => `video-${fileUrl}`;

