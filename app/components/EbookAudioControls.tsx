import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Slider from "@react-native-community/slider";
import { useTextToSpeech } from "../hooks/useTextToSpeech";

interface EbookAudioControlsProps {
  text: string;
  title?: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  showProgress?: boolean;
  autoCollapse?: boolean;
}

export default function EbookAudioControls({
  text,
  title = "Audio Reader",
  onPlayStart,
  onPlayEnd,
  showProgress = true,
  autoCollapse = true,
}: EbookAudioControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);

  const {
    isSpeaking,
    isPaused,
    progress,
    currentWordIndex,
    totalWords,
    rate,
    pitch,
    speak,
    pause,
    resume,
    stop,
    setRate,
    setPitch,
    getAvailableVoices,
    setVoice,
  } = useTextToSpeech({
    onStart: () => {
      console.log("🎙️ Audio started");
      onPlayStart?.();
    },
    onDone: () => {
      console.log("🎙️ Audio completed");
      onPlayEnd?.();
      if (autoCollapse) {
        setIsExpanded(false);
      }
    },
  });

  // Load available voices
  useEffect(() => {
    const loadVoices = async () => {
      const voices = await getAvailableVoices();
      setAvailableVoices(voices);
      
      // Select default English voice
      const defaultVoice = voices.find(
        (v) => v.language.includes("en") && v.quality === "Enhanced"
      ) || voices.find((v) => v.language.includes("en"));
      
      if (defaultVoice) {
        setSelectedVoice(defaultVoice.identifier);
        setVoice(defaultVoice.identifier);
      }
    };
    loadVoices();
  }, []);

  const handlePlayPause = () => {
    if (!isSpeaking) {
      speak(text);
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const handleStop = () => {
    stop();
    setIsExpanded(false);
  };

  return (
    <View
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 8,
        paddingBottom: 20,
      }}
    >
      {/* Collapsed View */}
      {!isExpanded && (
        <TouchableOpacity
          onPress={() => setIsExpanded(true)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#FEA74E",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="book" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontFamily: "Rubik-SemiBold",
                  color: "#1D2939",
                }}
                numberOfLines={1}
              >
                {title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Rubik",
                  color: "#667085",
                  marginTop: 2,
                }}
              >
                {isSpeaking
                  ? isPaused
                    ? "Paused"
                    : "Reading..."
                  : "Tap to listen"}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={handlePlayPause} style={{ padding: 8 }}>
            <Ionicons
              name={
                !isSpeaking ? "play-circle" : isPaused ? "play-circle" : "pause-circle"
              }
              size={32}
              color="#FEA74E"
            />
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Expanded View */}
      {isExpanded && (
        <View style={{ padding: 20 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: "#FEA74E",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="book" size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Rubik-SemiBold",
                    color: "#1D2939",
                  }}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Rubik",
                    color: "#667085",
                    marginTop: 2,
                  }}
                >
                  Audio Reader
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setIsExpanded(false)}
              style={{ padding: 4 }}
            >
              <Ionicons name="chevron-down" size={24} color="#667085" />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          {showProgress && isSpeaking && (
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  height: 4,
                  backgroundColor: "#E5E7EB",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: "100%",
                    width: `${progress}%`,
                    backgroundColor: "#FEA74E",
                  }}
                />
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Rubik",
                    color: "#667085",
                  }}
                >
                  {currentWordIndex} / {totalWords} words
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: "Rubik",
                    color: "#667085",
                  }}
                >
                  {progress.toFixed(0)}%
                </Text>
              </View>
            </View>
          )}

          {/* Playback Controls */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            {/* Stop */}
            <TouchableOpacity
              onPress={handleStop}
              disabled={!isSpeaking}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: isSpeaking ? "#FEE" : "#F3F4F6",
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: 8,
              }}
            >
              <MaterialIcons
                name="stop"
                size={24}
                color={isSpeaking ? "#EF4444" : "#9CA3AF"}
              />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              onPress={handlePlayPause}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#FEA74E",
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: 16,
                shadowColor: "#FEA74E",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons
                name={
                  !isSpeaking ? "play" : isPaused ? "play" : "pause"
                }
                size={32}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            {/* Restart */}
            <TouchableOpacity
              onPress={() => speak(text)}
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#F3F4F6",
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: 8,
              }}
            >
              <MaterialIcons name="replay" size={24} color="#667085" />
            </TouchableOpacity>
          </View>

          {/* Speed Control */}
          <View style={{ marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Rubik-SemiBold",
                  color: "#1D2939",
                }}
              >
                Speed
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Rubik-SemiBold",
                  color: "#FEA74E",
                }}
              >
                {rate.toFixed(1)}x
              </Text>
            </View>
            <Slider
              value={rate}
              onValueChange={setRate}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.1}
              minimumTrackTintColor="#FEA74E"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#FEA74E"
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>0.5x</Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>2.0x</Text>
            </View>
          </View>

          {/* Pitch Control */}
          <View style={{ marginBottom: 8 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Rubik-SemiBold",
                  color: "#1D2939",
                }}
              >
                Pitch
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Rubik-SemiBold",
                  color: "#FEA74E",
                }}
              >
                {pitch.toFixed(1)}
              </Text>
            </View>
            <Slider
              value={pitch}
              onValueChange={setPitch}
              minimumValue={0.5}
              maximumValue={2.0}
              step={0.1}
              minimumTrackTintColor="#FEA74E"
              maximumTrackTintColor="#E5E7EB"
              thumbTintColor="#FEA74E"
            />
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Lower</Text>
              <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Higher</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

