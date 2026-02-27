/**
 * Transform backend song format to frontend format
 */
export function transformBackendSong(backendSong: any): any {
  const id = backendSong.id ?? backendSong._id ?? "";
  const audioUrl = backendSong.audioUrl ?? backendSong.fileUrl ?? "";
  const rawViews = backendSong.views ?? backendSong.viewCount ?? 0;
  const likes = backendSong.likes ?? backendSong.likeCount ?? 0;
  const views = Math.max(Number(rawViews) || 0, Number(likes) || 0);
  const artist = backendSong.artist ?? backendSong.singer ?? "";

  return {
    id,
    _id: id,
    title: backendSong.title,
    artist,
    year: backendSong.year,
    audioUrl,
    thumbnailUrl: backendSong.thumbnailUrl,
    category: backendSong.category,
    duration: backendSong.duration,
    contentType: backendSong.contentType,
    description: backendSong.description,
    speaker: backendSong.speaker ?? artist,
    uploadedBy: backendSong.uploadedBy,
    createdAt: backendSong.createdAt,
    views,
    viewCount: views,
    likes,
    likeCount: likes,
    isLiked: backendSong.isLiked ?? false,
    isInLibrary: backendSong.isInLibrary ?? false,
    isPublicDomain: backendSong.isPublicDomain ?? true,
  };
}
