import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { useGlobalMediaStore } from "../../../store/useGlobalMediaStore";

export function useSermonAudio() {
  const globalMediaStore = useGlobalMediaStore();

  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [soundMap, setSoundMap] = useState<Record<string, Audio.Sound>>({});
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [pausedAudioMap, setPausedAudioMap] = useState<Record<string, number>>(
    {}
  );
  const [audioProgressMap, setAudioProgressMap] = useState<
    Record<string, number>
  >({});
  const [audioDurationMap, setAudioDurationMap] = useState<
    Record<string, number>
  >({});
  const [audioMuteMap, setAudioMuteMap] = useState<Record<string, boolean>>(
    {}
  );

  const soundMapRef = useRef(soundMap);
  soundMapRef.current = soundMap;

  // Unload all sounds on unmount
  useEffect(() => {
    return () => {
      Object.values(soundMapRef.current).forEach((sound) => {
        sound.unloadAsync().catch(() => {});
      });
    };
  }, []);

  const playAudio = async (uri: string, id: string) => {
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

    console.log(`🎵 Playing audio sermon "${id}":`, {
      audioUri: uri,
      id,
      uriLength: uri.length,
    });

    setIsLoadingAudio(true);
    try {
      // ✅ Use unified media store for consistent playback (same as AllContentTikTok)
      globalMediaStore.playMediaGlobally(id, "audio");

      // Pause currently playing if different
      if (playingAudioId && playingAudioId !== id && soundMap[playingAudioId]) {
        try {
          await soundMap[playingAudioId].pauseAsync();
          const status = await soundMap[playingAudioId].getStatusAsync();
          if (status.isLoaded) {
            setPausedAudioMap((prev) => ({
              ...prev,
              [playingAudioId]: status.positionMillis ?? 0,
            }));
          }
        } catch {}
      }

      const existing = soundMap[id];
      if (existing) {
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

            let duration = audioDurationMap[id];
            if (!duration) {
              const updated = await existing.getStatusAsync();
              if (updated.isLoaded && updated.durationMillis) {
                duration = updated.durationMillis;
                setAudioDurationMap((prev) => ({ ...prev, [id]: duration! }));
              }
            }
            setAudioProgressMap((prev) => ({
              ...prev,
              [id]: (resumePos || 0) / Math.max(duration || 1, 1),
            }));
          }
          setIsLoadingAudio(false);
          return;
        } else {
          setSoundMap((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
          });
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
    } finally {
      setIsLoadingAudio(false);
    }
  };

  return {
    isLoadingAudio,
    soundMap,
    playingAudioId,
    audioProgressMap,
    audioDurationMap,
    audioMuteMap,
    playAudio,
  };
}
