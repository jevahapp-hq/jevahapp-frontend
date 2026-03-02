import { useCallback, useState, useEffect } from "react";
import { Alert } from "react-native";
import copyrightFreeMusicAPI from "../../services/copyrightFreeMusicAPI";

export function useSongInteractions(song: any) {
  const [isLiked, setIsLiked] = useState(song?.isLiked || false);
  const [likeCount, setLikeCount] = useState(song?.likeCount || song?.likes || 0);
  const [viewCount, setViewCount] = useState(
    song?.viewCount ?? song?.views ?? Math.max(song?.likeCount ?? 0, song?.likes ?? 0)
  );
  const [isTogglingLike, setIsTogglingLike] = useState(false);

  useEffect(() => {
    if (song) {
      setIsLiked(song.isLiked || false);
      setLikeCount(song.likeCount || song.likes || 0);
      setViewCount(Math.max(song.viewCount ?? song.views ?? 0, song.likeCount ?? song.likes ?? 0));
    }
  }, [song]);

  const handleToggleLike = useCallback(async () => {
    if (!song || isTogglingLike) return;
    const songId = song._id || song.id;
    if (!songId) return;
    const previousLiked = isLiked;
    const previousLikeCount = likeCount;
    setIsLiked(!previousLiked);
    setLikeCount(previousLiked ? previousLikeCount - 1 : previousLikeCount + 1);
    setIsTogglingLike(true);
    try {
      const result = await copyrightFreeMusicAPI.toggleLike(songId);
      if (result.success && result.data) {
        setIsLiked(result.data.liked);
        setLikeCount(result.data.likeCount);
        if (result.data.viewCount !== undefined) {
          setViewCount(Math.max(result.data.viewCount, result.data.likeCount ?? 0));
        }
      } else {
        setIsLiked(previousLiked);
        setLikeCount(previousLikeCount);
        Alert.alert("Error", "Failed to update like");
      }
    } catch (error) {
      setIsLiked(previousLiked);
      setLikeCount(previousLikeCount);
      Alert.alert("Error", "Failed to update like");
    } finally {
      setIsTogglingLike(false);
    }
  }, [song, isLiked, likeCount, isTogglingLike]);

  return {
    isLiked,
    likeCount,
    viewCount,
    isTogglingLike,
    setIsLiked,
    setLikeCount,
    setViewCount,
    handleToggleLike,
  };
}
