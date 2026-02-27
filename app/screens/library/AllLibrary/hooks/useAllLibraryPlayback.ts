/**
 * useAllLibraryPlayback - Video and audio playback for AllLibrary media cards
 */
import { Audio, ResizeMode } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGlobalVideoStore } from "../../../../store/useGlobalVideoStore";

export function useAllLibraryPlayback() {
  const globalVideoStore = useGlobalVideoStore();

  const [playingVideos, setPlayingVideos] = useState<Record<string, boolean>>({});
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<Record<string, number>>({});
  const [audioDuration, setAudioDuration] = useState<Record<string, number>>({});
  const [audioPosition, setAudioPosition] = useState<Record<string, number>>({});
  const [audioMuted, setAudioMuted] = useState<Record<string, boolean>>({});

  const videoRefs = useRef<Record<string, any>>({});
  const audioRefs = useRef<Record<string, Audio.Sound>>({});

  useEffect(() => {
    return () => {
      Object.keys(audioRefs.current).forEach(async (itemId) => {
        try {
          const sound = audioRefs.current[itemId];
          if (sound) {
            const status = await sound.getStatusAsync();
            if (status.isLoaded) await sound.unloadAsync();
          }
        } catch {
          // Ignore cleanup errors
        }
      });
      audioRefs.current = {};
    };
  }, []);

  const togglePlay = useCallback(
    (
      itemId: string,
      setShowOverlay: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
    ) => {
      Object.keys(playingVideos).forEach((id) => {
        if (id !== itemId) {
          setPlayingVideos((prev) => ({ ...prev, [id]: false }));
          setShowOverlay((prev) => ({ ...prev, [id]: true }));
        }
      });
      globalVideoStore.pauseAllVideos();

      const isPlaying = playingVideos[itemId] ?? false;
      setPlayingVideos((prev) => ({ ...prev, [itemId]: !isPlaying }));
      setShowOverlay((prev) => ({ ...prev, [itemId]: isPlaying }));
    },
    [playingVideos, globalVideoStore]
  );

  const seekVideo = useCallback(async (itemId: string, progress: number) => {
    try {
      const videoRef = videoRefs.current[itemId];
      if (videoRef) {
        const status = await videoRef.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          await videoRef.setPositionAsync(progress * status.durationMillis);
        }
      }
    } catch (err) {
      console.error("Error seeking video:", err);
    }
  }, []);

  const toggleAudioPlay = useCallback(
    async (itemId: string, fileUrl: string) => {
      try {
        if (playingAudio === itemId) {
          if (audioRefs.current[itemId]) {
            try {
              const status = await audioRefs.current[itemId].getStatusAsync();
              if (status.isLoaded) await audioRefs.current[itemId].pauseAsync();
            } catch {
              /* ignore */
            }
          }
          setPlayingAudio(null);
        } else {
          if (playingAudio && audioRefs.current[playingAudio]) {
            try {
              const status = await audioRefs.current[playingAudio].getStatusAsync();
              if (status.isLoaded) {
                await audioRefs.current[playingAudio].pauseAsync();
              }
            } catch {
              delete audioRefs.current[playingAudio];
            }
          }

          if (!audioRefs.current[itemId]) {
            const { sound } = await Audio.Sound.createAsync(
              { uri: fileUrl },
              { shouldPlay: true, isMuted: audioMuted[itemId] || false },
              (status) => {
                if (status.isLoaded && status.durationMillis && status.positionMillis) {
                  const duration = status.durationMillis;
                  const position = status.positionMillis;
                  setAudioProgress((prev) => ({ ...prev, [itemId]: position / duration }));
                  setAudioPosition((prev) => ({ ...prev, [itemId]: position }));
                  setAudioDuration((prev) => ({ ...prev, [itemId]: duration }));
                  if (status.didJustFinish) {
                    setPlayingAudio(null);
                    setAudioProgress((prev) => ({ ...prev, [itemId]: 0 }));
                    setAudioPosition((prev) => ({ ...prev, [itemId]: 0 }));
                    delete audioRefs.current[itemId];
                  }
                }
              }
            );
            audioRefs.current[itemId] = sound;
          } else {
            try {
              const status = await audioRefs.current[itemId].getStatusAsync();
              if (status.isLoaded) {
                await audioRefs.current[itemId].playAsync();
              } else {
                delete audioRefs.current[itemId];
                const { sound } = await Audio.Sound.createAsync({ uri: fileUrl }, { shouldPlay: true });
                audioRefs.current[itemId] = sound;
              }
            } catch {
              delete audioRefs.current[itemId];
              const { sound } = await Audio.Sound.createAsync({ uri: fileUrl }, { shouldPlay: true });
              audioRefs.current[itemId] = sound;
            }
          }
          setPlayingAudio(itemId);
        }
      } catch (err) {
        console.error("Error toggling audio playback:", err);
        setPlayingAudio(null);
        delete audioRefs.current[itemId];
      }
    },
    [playingAudio, audioMuted]
  );

  const toggleAudioMute = useCallback(async (itemId: string) => {
    const newMuted = !(audioMuted[itemId] || false);
    setAudioMuted((prev) => ({ ...prev, [itemId]: newMuted }));
    try {
      if (audioRefs.current[itemId]) {
        await audioRefs.current[itemId].setIsMutedAsync(newMuted);
      }
    } catch {
      /* ignore */
    }
  }, [audioMuted]);

  const seekAudio = useCallback(async (itemId: string, progress: number) => {
    try {
      if (audioRefs.current[itemId] && audioDuration[itemId]) {
        const position = progress * audioDuration[itemId];
        await audioRefs.current[itemId].setPositionAsync(position);
        setAudioPosition((prev) => ({ ...prev, [itemId]: position }));
        setAudioProgress((prev) => ({ ...prev, [itemId]: progress }));
      }
    } catch (err) {
      console.error("Error seeking audio:", err);
    }
  }, [audioDuration]);

  return {
    playingVideos,
    setPlayingVideos,
    playingAudio,
    videoRefs,
    audioRefs,
    audioProgress,
    audioDuration,
    audioPosition,
    audioMuted,
    togglePlay,
    seekVideo,
    toggleAudioPlay,
    toggleAudioMute,
    seekAudio,
  };
}
