/**
 * Format a timestamp as a relative "time ago" string for media cards.
 */
export const getTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const posted = new Date(timestamp);
  const diffMs = now.getTime() - posted.getTime();

  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}MIN AGO`;
  if (hours < 24) return `${hours}HRS AGO`;
  return `${days}DAYS AGO`;
};
