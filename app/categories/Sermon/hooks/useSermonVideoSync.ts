import { MutableRefObject, useEffect } from "react";
import { useGlobalVideoStore } from "../../../store/useGlobalVideoStore";

export function useSermonVideoSync(
  videoRefs: MutableRefObject<Record<string, any>>
) {
  const playingVideos = useGlobalVideoStore((state) => state.playingVideos);

  useEffect(() => {
    console.log(
      "🔄 Sermon video sync effect triggered, playingVideos:",
      playingVideos
    );
    Object.keys(videoRefs.current).forEach(async (modalKey) => {
      const videoRef = videoRefs.current[modalKey];
      const shouldBePlaying = playingVideos[modalKey] ?? false;

      if (videoRef) {
        try {
          const status = await videoRef.getStatusAsync();
          console.log(
            `🎬 Sermon video ${modalKey} - shouldBePlaying: ${shouldBePlaying}, isLoaded: ${status.isLoaded}, isPlaying: ${status.isPlaying}`
          );
          if (status.isLoaded) {
            if (shouldBePlaying && !status.isPlaying) {
              console.log("▶️ Starting sermon video playback:", modalKey);
              await videoRef.playAsync();
            } else if (!shouldBePlaying && status.isPlaying) {
              console.log("⏸️ Pausing sermon video:", modalKey);
              await videoRef.pauseAsync();
            }
          } else {
            console.log(`⏳ Sermon video ${modalKey} not loaded yet`);
          }
        } catch (error) {
          console.error("❌ Error syncing sermon video playback:", error);
        }
      } else {
        console.log(`⚠️ No video ref found for ${modalKey}`);
      }
    });
  }, [playingVideos, videoRefs]);
}
