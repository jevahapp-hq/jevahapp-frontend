export function getTimeAgo(createdAt: string): string {
  const now = new Date();
  const posted = new Date(createdAt);
  const diff = now.getTime() - posted.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return "NOW";
  if (minutes < 60) return `${minutes}MIN AGO`;
  if (hours < 24) return `${hours}HRS AGO`;
  return `${days}DAYS AGO`;
}
