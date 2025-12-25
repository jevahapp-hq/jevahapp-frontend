import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import {
  EbookTtsVoicePreset,
  generateEbookTts,
  getEbookTts,
} from "../services/ebookTtsApi";
import GlobalAudioInstanceManager from "../utils/globalAudioInstanceManager";

type Props = {
  ebookId: string;
  title?: string;
  autoGenerate?: boolean; // when audio missing
};

type TtsSegment = {
  id: string;
  kind?: "sentence" | "paragraph" | string;
  startMs: number;
  endMs?: number;
  text: string;
};

export default function EbookTtsPlayer({
  ebookId,
  title = "Listen",
  autoGenerate = true,
}: Props) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [voicePreset, setVoicePreset] = useState<EbookTtsVoicePreset>("female");
  const [speed, setSpeed] = useState(1.0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [durationMs, setDurationMs] = useState<number>(0);
  const [positionMs, setPositionMs] = useState<number>(0);

  // Text sync highlighting (segments.v1)
  const [segments, setSegments] = useState<TtsSegment[]>([]);
  const [showTextPanel, setShowTextPanel] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);
  const segmentYRef = useRef<Record<string, number>>({});

  const progressPct = useMemo(() => {
    if (!durationMs) return 0;
    return Math.min(100, Math.max(0, (positionMs / durationMs) * 100));
  }, [positionMs, durationMs]);

  const loadOrGenerate = async () => {
    if (!ebookId) return;
    setError(null);
    setIsLoading(true);
    try {
      const existing = await getEbookTts(ebookId, { includeTimings: true });
      const existingUrl = existing?.data?.audioUrl;
      const existingSegments = (existing as any)?.data?.timings?.segments as
        | TtsSegment[]
        | undefined;
      if (Array.isArray(existingSegments) && existingSegments.length > 0) {
        setSegments(existingSegments);
      } else {
        setSegments([]);
      }
      if (existingUrl) {
        setAudioUrl(existingUrl);
        return;
      }
      // If not generated yet (common response: success=false + canGenerate=true),
      // auto-generate immediately when enabled.
      if (autoGenerate && existing?.data?.canGenerate !== false) {
        setIsGenerating(true);
        const created = await generateEbookTts(ebookId, {
          voice: voicePreset,
          speed,
        });
        const createdUrl = created?.data?.audioUrl;
        const createdSegments = (created as any)?.data?.timings?.segments as
          | TtsSegment[]
          | undefined;
        if (Array.isArray(createdSegments) && createdSegments.length > 0) {
          setSegments(createdSegments);
        }
        if (createdUrl) {
          setAudioUrl(createdUrl);
          return;
        }
        // If backend runs async, it may return 202 w/o audioUrl; user can tap refresh.
        setError(
          created?.message ||
            "Audio is being prepared. Please wait a moment and tap refresh."
        );
      } else {
        setError(existing?.message || "Audio is not available for this ebook.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load audio.");
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // initial load
  useEffect(() => {
    loadOrGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ebookId]);

  // cleanup audio
  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const ensureSoundLoaded = async (): Promise<Audio.Sound> => {
    if (!audioUrl) {
      throw new Error("No audio URL");
    }

    if (soundRef.current) {
      return soundRef.current;
    }

    // Ensure no other audio is playing (global player, etc.)
    try {
      await GlobalAudioInstanceManager.getInstance().stopAllAudio();
    } catch {}

    // Configure audio mode for smoother playback
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch {}

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUrl },
      { shouldPlay: false, rate: speed, shouldCorrectPitch: true },
      (status) => {
        if (!status.isLoaded) return;
        setIsPlaying(status.isPlaying);
        setDurationMs(status.durationMillis ?? 0);
        setPositionMs(status.positionMillis ?? 0);
      }
    );
    soundRef.current = sound;
    return sound;
  };

  const togglePlay = async () => {
    try {
      setError(null);
      const sound = await ensureSoundLoaded();
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (e: any) {
      setError(e?.message || "Playback error");
    }
  };

  const stop = async () => {
    try {
      const sound = soundRef.current;
      if (!sound) return;
      await sound.stopAsync();
      await sound.setPositionAsync(0);
    } catch {}
  };

  const seekToPct = async (pct: number) => {
    const sound = soundRef.current;
    if (!sound || !durationMs) return;
    const nextPos = Math.floor((pct / 100) * durationMs);
    await sound.setPositionAsync(nextPos);
  };

  const seekToMs = async (ms: number) => {
    const sound = soundRef.current;
    if (!sound) return;
    try {
      await sound.setPositionAsync(Math.max(0, ms));
      if (!isPlaying) {
        await sound.playAsync();
      }
    } catch (e: any) {
      setError(e?.message || "Seek failed");
    }
  };

  const applySpeed = async (next: number) => {
    setSpeed(next);
    const sound = soundRef.current;
    if (sound) {
      try {
        await sound.setRateAsync(next, true);
      } catch {}
    }
  };

  const regenerate = async () => {
    // Force regenerate (different voice/speed). Backend may cache by voice; if not, this still works.
    setAudioUrl(null);
    soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    await loadOrGenerate();
  };

  const canPlay = !!audioUrl && !isLoading && !isGenerating;

  const currentSegmentId = useMemo(() => {
    if (!segments.length) return null;
    const seg = segments.find(
      (s) => positionMs >= s.startMs && positionMs < (s.endMs ?? Number.MAX_SAFE_INTEGER)
    );
    return seg?.id || null;
  }, [segments, positionMs]);

  const currentSegmentText = useMemo(() => {
    if (!currentSegmentId) return null;
    const seg = segments.find((s) => s.id === currentSegmentId);
    return seg?.text || null;
  }, [currentSegmentId, segments]);

  // Auto-scroll the text panel as audio progresses
  useEffect(() => {
    if (!showTextPanel) return;
    if (!segments.length) return;
    if (!currentSegmentId) return;
    const y = segmentYRef.current[currentSegmentId];
    if (typeof y === "number") {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 40), animated: true });
    }
  }, [currentSegmentId, showTextPanel, segments]);

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "rgba(223, 147, 14, 0.15)",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Ionicons name="headset-outline" size={20} color="#DF930E" />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontFamily: "Rubik-SemiBold",
              fontSize: 14,
              color: "#1D2939",
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={{
              marginTop: 2,
              fontFamily: "Rubik-Regular",
              fontSize: 12,
              color: "#667085",
            }}
            numberOfLines={2}
          >
            {isGenerating
              ? "Generating narration…"
              : isLoading
              ? "Loading audio…"
              : audioUrl
              ? currentSegmentText
                ? `Now reading: ${currentSegmentText}`
                : "Ready to play"
              : "Tap generate to create audio"}
          </Text>
        </View>

        <TouchableOpacity
          onPress={loadOrGenerate}
          disabled={isLoading || isGenerating}
          style={{ padding: 8, marginRight: 4, opacity: isLoading ? 0.5 : 1 }}
        >
          <Ionicons name="refresh" size={20} color="#667085" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setShowTextPanel((v) => !v)}
          style={{ padding: 8, marginRight: 2, opacity: segments.length ? 1 : 0.5 }}
          disabled={!segments.length}
        >
          <Ionicons name="document-text-outline" size={20} color="#667085" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlay}
          disabled={!canPlay}
          style={{ padding: 6, opacity: canPlay ? 1 : 0.4 }}
        >
          {isLoading || isGenerating ? (
            <ActivityIndicator size="small" color="#DF930E" />
          ) : (
            <Ionicons
              name={isPlaying ? "pause-circle" : "play-circle"}
              size={36}
              color="#DF930E"
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Progress */}
      <View style={{ marginTop: 10 }}>
        <Slider
          value={progressPct}
          onSlidingComplete={seekToPct}
          minimumValue={0}
          maximumValue={100}
          step={1}
          minimumTrackTintColor="#DF930E"
          maximumTrackTintColor="#E5E7EB"
          thumbTintColor="#DF930E"
          disabled={!canPlay || !durationMs}
        />
      </View>

      {/* Text Sync Panel (segments) */}
      {showTextPanel && (
        <View
          style={{
            marginTop: 8,
            borderWidth: 1,
            borderColor: "rgba(229, 231, 235, 1)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              backgroundColor: "rgba(223, 147, 14, 0.06)",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontFamily: "Rubik-Medium", color: "#8C5A00", fontSize: 12 }}>
              Synced text (tap a line to jump)
            </Text>
            <Text style={{ fontFamily: "Rubik-Regular", color: "#8C5A00", fontSize: 12 }}>
              {segments.length} segments
            </Text>
          </View>
          <ScrollView
            ref={(r) => {
              scrollRef.current = r;
            }}
            style={{ maxHeight: 220 }}
            contentContainerStyle={{ padding: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {segments.map((seg) => {
              const active = seg.id === currentSegmentId;
              return (
                <TouchableOpacity
                  key={seg.id}
                  onPress={() => seekToMs(seg.startMs)}
                  activeOpacity={0.8}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    marginBottom: 8,
                    backgroundColor: active ? "rgba(223, 147, 14, 0.15)" : "rgba(17, 24, 39, 0.03)",
                    borderWidth: 1,
                    borderColor: active ? "rgba(223, 147, 14, 0.3)" : "rgba(229, 231, 235, 1)",
                  }}
                  onLayout={(e) => {
                    segmentYRef.current[seg.id] = e.nativeEvent.layout.y;
                  }}
                >
                  <Text
                    style={{
                      fontFamily: active ? "Rubik-Medium" : "Rubik-Regular",
                      color: active ? "#4B2C00" : "#344054",
                      fontSize: 13,
                      lineHeight: 18,
                    }}
                  >
                    {seg.text}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {!segments.length && (
              <Text style={{ fontFamily: "Rubik-Regular", color: "#667085", fontSize: 12 }}>
                No timings returned by backend yet. Audio playback will still work, but highlighting requires backend
                `timings.segments`.
              </Text>
            )}
          </ScrollView>
        </View>
      )}

      {/* Controls row */}
      <View
        style={{
          marginTop: 6,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={stop}
          disabled={!canPlay}
          style={{ paddingVertical: 6, paddingHorizontal: 10, opacity: canPlay ? 1 : 0.4 }}
        >
          <Text style={{ fontFamily: "Rubik-Medium", color: "#667085" }}>
            Stop
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ fontFamily: "Rubik-Regular", color: "#667085", marginRight: 8 }}>
            Speed
          </Text>
          {[0.8, 1.0, 1.2].map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => applySpeed(v)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                marginLeft: 6,
                backgroundColor:
                  Math.abs(speed - v) < 0.01
                    ? "rgba(223, 147, 14, 0.15)"
                    : "rgba(17, 24, 39, 0.04)",
              }}
            >
              <Text
                style={{
                  fontFamily: "Rubik-Medium",
                  color: Math.abs(speed - v) < 0.01 ? "#DF930E" : "#667085",
                }}
              >
                {v}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() =>
              setVoicePreset((p) => (p === "female" ? "male" : "female"))
            }
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: "rgba(17, 24, 39, 0.04)",
              marginRight: 6,
            }}
          >
            <Text style={{ fontFamily: "Rubik-Medium", color: "#667085" }}>
              Voice: {voicePreset}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={regenerate}
            disabled={isLoading || isGenerating}
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: "rgba(223, 147, 14, 0.12)",
              opacity: isLoading || isGenerating ? 0.5 : 1,
            }}
          >
            <Text style={{ fontFamily: "Rubik-Medium", color: "#DF930E" }}>
              Generate
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 12,
            backgroundColor: "rgba(255, 193, 7, 0.12)",
            borderWidth: 1,
            borderColor: "rgba(223, 147, 14, 0.25)",
          }}
        >
          <Text style={{ fontFamily: "Rubik-Regular", color: "#8C5A00", fontSize: 12 }}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
}


