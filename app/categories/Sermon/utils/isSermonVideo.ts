export function isSermonVideo(item: any): boolean {
  const fileUrlString = typeof item?.fileUrl === "string" ? item.fileUrl : "";
  return (
    fileUrlString.includes(".mp4") ||
    fileUrlString.includes(".mov") ||
    fileUrlString.includes(".avi")
  );
}
