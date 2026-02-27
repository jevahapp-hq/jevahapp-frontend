/**
 * useAllContentTikTokAudio
 * Audio playback for MusicCard/sermon content in AllContentTikTok.
 * Isolates ~200 lines of audio state and logic.
 */
import { Audio } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UseAllContentTikTokAudioParams {
  playMedia: (key: string, type: "video" | "audio") => void;
  playingVideos: Record<string, boolean>;
}

export function useAllContentTikTokAudio({
  playMedia,
  playingVideos,
}: UseAllContentTikTokAudioParams) {
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [soundMap, setSoundMap] = useState<Record<string, Audio.Sound>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [pausedAudioMap, setPausedAudioMap] = useState<Record<string, number>>({});
  const [audioProgressMap, setAudioProgressMap] = useState<Record<string, number>>({});
  const [audioDurationMap, setAudioDurationMap] = useState<Record<string, number>>({});
  const [audioMuteMap, setAudioMuteMap] = useState<Record<string, boolean>>({});

  const playingAudioIdRef = useRef<string | null>(null);
  const soundMapRef = useRef<Record<string, Audio.Sound>>({});

  useEffect(() => {
    playingAudioIdRef.current = playingAudioId;
  }, [playingAudioId]);

  useEffect(() => {
    soundMapRef.current = soundMap;
  }, [soundMap]);

  const pauseAllAudio = useCallback(async () => {
    try {
      const ids = Object.keys(soundMap);
      for (const id of ids) {
        const snd = soundMap[id];
        if (snd) {
          try {
            const status = await snd.getStatusAsync();
            if (status.isLoaded) {
              await snd.pauseAsync();
            }
          } catch (error) {
            console.warn(`⚠️ Error pausing audio ${id}:`, error);
          }
        }
      }
      setPlayingAudioId(null);
    } catch (error) {
      console.warn("⚠️ Error in pauseAllAudio:", error);
    }
  }, [soundMap]);

  const playAudio = useCallback(
    async (uri: string, id: string) => {
      if (!uri || uri.trim() === "") {
        console.warn("🚨 Audio URI is empty or invalid:", { uri, id });
        return;
      }

      if (isLoadingAudio) {
        console.log("🚨 Audio is already loading, skipping...");
        return;
      }

      if (!uri.startsWith("http://") && !uri.startsWith("https://")) {
        console.warn("🚨 Audio URI is not a valid HTTP/HTTPS URL:", { uri, id });
        return;
      }

      setIsLoadingAudio(true);

      try {
        playMedia(id, "audio");

        if (playingAudioId && playingAudioId !== id && soundMap[playingAudioId]) {
          try {
            const currentSound = soundMap[playingAudioId];
            if (currentSound) {
              const status = await currentSound.getStatusAsync();
              if (status.isLoaded) {
                await currentSound.pauseAsync();
                setPausedAudioMap((prev) => ({
                  ...prev,
                  [playingAudioId]: status.positionMillis ?? 0,
                }));
              }
            }
          } catch (error) {
            console.warn("⚠️ Error pausing current audio:", error);
          }
        }

        const existing = soundMap[id];
        if (existing) {
          try {
            const status = await existing.getStatusAsync();
            if (status.isLoaded) {
              if (status.isPlaying) {
                const pos = status.positionMillis ?? 0;
                await existing.pauseAsync();
                setPausedAudioMap((prev) => ({ ...prev, [id]: pos }));
                setPlayingAudioId(null);
              } else {
                const resumePos = pausedAudioMap[id] ?? 0;
                await existing.playFromPositionAsync(resumePos);
                setPlayingAudioId(id);
              }
              setIsLoadingAudio(false);
              return;
            }
          } catch (error) {
            console.warn("⚠️ Error with existing sound:", error);
          }
        }

        const resumePos = pausedAudioMap[id] ?? 0;
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          {
            shouldPlay: true,
            isMuted: audioMuteMap[id] ?? false,
            positionMillis: resumePos,
          }
        );

        setSoundMap((prev) => ({ ...prev, [id]: sound }));
        setPlayingAudioId(id);

        const initial = await sound.getStatusAsync();
        if (initial.isLoaded && typeof initial.durationMillis === "number") {
          const safeDur = initial.durationMillis || 1;
          setAudioDurationMap((prev) => ({ ...prev, [id]: safeDur }));
          setAudioProgressMap((prev) => ({
            ...prev,
            [id]: (resumePos || 0) / safeDur,
          }));
        }

        sound.setOnPlaybackStatusUpdate(async (status) => {
          if (!status.isLoaded || typeof status.durationMillis !== "number")
            return;
          const safeDur = status.durationMillis || 1;
          setAudioProgressMap((prev) => ({
            ...prev,
            [id]: (status.positionMillis || 0) / safeDur,
          }));
          setAudioDurationMap((prev) => ({ ...prev, [id]: safeDur }));

          if (status.didJustFinish) {
            try {
              await sound.unloadAsync();
            } catch {}
            setSoundMap((prev) => {
              const u = { ...prev };
              delete u[id];
              return u;
            });
            setPlayingAudioId((curr) => (curr === id ? null : curr));
            setPausedAudioMap((prev) => ({ ...prev, [id]: 0 }));
            setAudioProgressMap((prev) => ({ ...prev, [id]: 0 }));
          }
        });
      } catch (err) {
        console.error("❌ Audio playback error:", err);
        setPlayingAudioId(null);
        setSoundMap((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
      } finally {
        setIsLoadingAudio(false);
      }
    },
    [
      playMedia,
      isLoadingAudio,
      playingAudioId,
      soundMap,
      pausedAudioMap,
      audioMuteMap,
    ]
  );

  return {
    isLoadingAudio,
    soundMap,
    playingAudioId,
    pausedAudioMap,
    audioProgressMap,
    audioDurationMap,
    audioMuteMap,
    playAudio,
    pauseAllAudio,
  };
}
