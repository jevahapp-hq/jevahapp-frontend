import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useTextToSpeech } from "../hooks/useTextToSpeech";

interface EbookAudioControlsProps {
  text: string;
  title?: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  showProgress?: boolean;
  autoCollapse?: boolean;
  showContentWarning?: boolean;
  currentPage?: number;
  totalPages?: number;
}

export default function EbookAudioControls({
  text,
  title = "Audio Reader",
  onPlayStart,
  onPlayEnd,
  showProgress = true,
  autoCollapse = true,
  showContentWarning = false,
  currentPage = 1,
  totalPages = 1,
}: EbookAudioControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const wordRefs = useRef<{ [key: number]: View | null }>({});

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

  // Split text into words for highlighting
  const words = useMemo(() => {
    return text ? text.split(/\s+/) : [];
  }, [text]);

  // Auto-scroll to current word when speaking
  useEffect(() => {
    if (isSpeaking && currentWordIndex >= 0 && scrollViewRef.current) {
      const currentWordRef = wordRefs.current[currentWordIndex];
      if (currentWordRef) {
        // Scroll to the current word with a smooth animation
        scrollViewRef.current.scrollTo({
          y: currentWordIndex * 24, // Approximate line height
          animated: true,
        });
      }
    }
  }, [currentWordIndex, isSpeaking]);

  const handlePlayPause = () => {
    console.log(`🎵 HandlePlayPause: showContentWarning=${showContentWarning}, text.length=${text?.length || 0}, isSpeaking=${isSpeaking}, isPaused=${isPaused}`);
    
    // Prevent playing if no content is available
    if (showContentWarning || !text || text.trim().length === 0) {
      console.warn("🚫 Cannot play: no content available");
      return;
    }
    
    if (!isSpeaking) {
      console.log("🎵 Starting playback...");
      // Use custom onPlayStart if provided (for page-by-page reading)
      if (onPlayStart) {
        console.log("🎵 Using custom onPlayStart");
        onPlayStart();
      } else {
        console.log("🎵 Using direct speak");
        speak(text);
      }
    } else if (isPaused) {
      console.log("🎵 Resuming playback");
      resume();
    } else {
      console.log("🎵 Pausing playback");
      pause();
    }
  };

  const handleStop = () => {
    console.log("🛑 Stop button pressed");
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
                {showContentWarning
                  ? "Loading content..."
                  : isSpeaking
                  ? isPaused
                    ? `Paused - Page ${currentPage}/${totalPages}`
                    : `Reading page ${currentPage}/${totalPages}`
                  : totalPages > 1 
                  ? `Tap to listen - Page ${currentPage}/${totalPages}`
                  : "Tap to listen"}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            onPress={handlePlayPause} 
            style={{ padding: 8 }}
            disabled={showContentWarning}
          >
            <Ionicons
              name={
                !isSpeaking ? "play-circle" : isPaused ? "play-circle" : "pause-circle"
              }
              size={32}
              color={showContentWarning ? "#9CA3AF" : "#FEA74E"}
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
                {totalPages > 1 ? `Page ${currentPage} of ${totalPages}` : "Audio Reader"}
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

          {/* Text Display Area */}
          {text && text.trim().length > 0 && (
            <View
              style={{
                marginBottom: 16,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                minHeight: 120,
                maxHeight: 200,
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
            >
              <ScrollView
                ref={scrollViewRef}
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                contentContainerStyle={{ flexGrow: 1, paddingVertical: 8 }}
              >
                <Text style={{ lineHeight: 28, fontSize: 16, letterSpacing: 0.3 }}>
                  {words.map((word, index) => {
                    const isCurrentWord = isSpeaking && index === currentWordIndex;
                    const isPastWord = isSpeaking && index < currentWordIndex;
                    
                    return (
                      <Text
                        key={index}
                        ref={(ref) => {
                          wordRefs.current[index] = ref as any;
                        }}
                        style={{
                          color: isCurrentWord 
                            ? "#FFFFFF" 
                            : isPastWord 
                            ? "#10B981" 
                            : "#374151",
                          backgroundColor: isCurrentWord ? "#FEA74E" : "transparent",
                          fontFamily: isCurrentWord ? "Rubik-Bold" : isPastWord ? "Rubik-Medium" : "Rubik",
                          paddingHorizontal: isCurrentWord ? 6 : 0,
                          paddingVertical: isCurrentWord ? 3 : 0,
                          borderRadius: isCurrentWord ? 8 : 0,
                          shadowColor: isCurrentWord ? "#FEA74E" : "transparent",
                          shadowOffset: isCurrentWord ? { width: 0, height: 3 } : { width: 0, height: 0 },
                          shadowOpacity: isCurrentWord ? 0.4 : 0,
                          shadowRadius: isCurrentWord ? 6 : 0,
                          elevation: isCurrentWord ? 5 : 0,
                          fontSize: isCurrentWord ? 18 : 16,
                          transform: isCurrentWord ? [{ scale: 1.05 }] : [{ scale: 1 }],
                        }}
                      >
                        {word}{index < words.length - 1 ? " " : ""}
                      </Text>
                    );
                  })}
                </Text>
              </ScrollView>
            </View>
          )}

          {/* Content Warning */}
          {showContentWarning && (
            <View
              style={{
                marginBottom: 16,
                backgroundColor: "#FEF3C7",
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: "#FCD34D",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 14,
                    fontFamily: "Rubik-SemiBold",
                    color: "#92400E",
                  }}
                >
                  Content Loading
                </Text>
              </View>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  fontFamily: "Rubik",
                  color: "#92400E",
                  lineHeight: 16,
                }}
              >
                {totalPages > 1 
                  ? `Document ready! You're viewing page ${currentPage} of ${totalPages}. Tap play to hear current page information.`
                  : "Please wait while the document is loading. Audio will be available once ready."
                }
              </Text>
            </View>
          )}

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
              disabled={showContentWarning}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: showContentWarning ? "#E5E7EB" : "#FEA74E",
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: 16,
                shadowColor: showContentWarning ? "#E5E7EB" : "#FEA74E",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: showContentWarning ? 0.1 : 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons
                name={
                  !isSpeaking ? "play" : isPaused ? "play" : "pause"
                }
                size={32}
                color={showContentWarning ? "#9CA3AF" : "#FFFFFF"}
              />
            </TouchableOpacity>

            {/* Restart */}
            <TouchableOpacity
              onPress={() => {
                if (onPlayStart) {
                  onPlayStart();
                } else {
                  speak(text);
                }
              }}
              disabled={showContentWarning || !text}
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
              <MaterialIcons 
                name="replay" 
                size={24} 
                color={showContentWarning || !text ? "#D1D5DB" : "#667085"} 
              />
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

