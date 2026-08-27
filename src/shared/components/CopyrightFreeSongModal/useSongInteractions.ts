import { useCallback, useState, useEffect } from "react";
import { Alert } from "react-native";
import copyrightFreeMusicAPI from "@/app/services/copyrightFreeMusicAPI";

export function useSongInteractions(song: any) {
  const [isLiked, setIsLiked] = useState(song?.isLiked || false);
  const [likeCount, setLikeCount] = useState(song?.likeCount || song?.likes || 0);
  const [viewCount, setViewCount] = useState(
    song?.viewCount ?? song?.views ?? 0
  );
  const [shareCount, setShareCount] = useState(song?.shareCount || 0);
  const [saveCount, setSaveCount] = useState(song?.saveCount || 0);
  const [isInLibrary, setIsInLibrary] = useState(
    Boolean(song?.isInLibrary ?? song?.isSaved)
  );
  const [isTogglingLike, setIsTogglingLike] = useState(false);
  const [isTogglingSave, setIsTogglingSave] = useState(false);

  useEffect(() => {
    if (song) {
      setIsLiked(song.isLiked || false);
      setLikeCount(song.likeCount || song.likes || 0);
      setViewCount(song.viewCount ?? song.views ?? 0);
      setShareCount(song.shareCount || 0);
      setSaveCount(song.saveCount || 0);
      setIsInLibrary(Boolean(song.isInLibrary ?? song.isSaved));
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
        if (typeof result.data.viewCount === "number") {
          setViewCount(result.data.viewCount);
        }
      } else {
        setIsLiked(previousLiked);
        setLikeCount(previousLikeCount);
        Alert.alert("Error", "Failed to update like");
      }
    } catch {
      setIsLiked(previousLiked);
      setLikeCount(previousLikeCount);
      Alert.alert("Error", "Failed to update like");
    } finally {
      setIsTogglingLike(false);
    }
  }, [song, isLiked, likeCount, isTogglingLike]);

  const handleToggleSave = useCallback(async () => {
    if (!song || isTogglingSave) return;
    const songId = song._id || song.id;
    if (!songId) return;
    const previousSaved = isInLibrary;
    const previousCount = saveCount;
    setIsInLibrary(!previousSaved);
    setSaveCount(previousSaved ? Math.max(0, previousCount - 1) : previousCount + 1);
    setIsTogglingSave(true);
    try {
      const result = await copyrightFreeMusicAPI.toggleSave(songId);
      if (result.success && result.data) {
        const saved =
          result.data.saved ?? result.data.bookmarked ?? result.data.isInLibrary ?? false;
        setIsInLibrary(Boolean(saved));
        const nextCount =
          result.data.saveCount ?? result.data.bookmarkCount ?? previousCount;
        setSaveCount(Number(nextCount) || 0);
      } else {
        setIsInLibrary(previousSaved);
        setSaveCount(previousCount);
        Alert.alert("Error", "Failed to update library");
      }
    } catch {
      setIsInLibrary(previousSaved);
      setSaveCount(previousCount);
      Alert.alert("Error", "Failed to update library");
    } finally {
      setIsTogglingSave(false);
    }
  }, [song, isInLibrary, saveCount, isTogglingSave]);

  return {
    isLiked,
    likeCount,
    viewCount,
    shareCount,
    saveCount,
    isInLibrary,
    isTogglingLike,
    isTogglingSave,
    setIsLiked,
    setLikeCount,
    setViewCount,
    setShareCount,
    setSaveCount,
    setIsInLibrary,
    handleToggleLike,
    handleToggleSave,
  };
}
