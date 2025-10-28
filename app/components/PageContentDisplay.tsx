/**
 * Page Content Display Component
 * Shows extracted page content on white background with word-by-word highlighting
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useTextToSpeech } from "../hooks/useTextToSpeech";

interface PageContentDisplayProps {
  visible: boolean;
  pageContent: string;
  pageNumber: number;
  totalPages: number;
  documentTitle?: string;
  onClose: () => void;
  onStartReading: (content: string) => void;
}

export default function PageContentDisplay({
  visible,
  pageContent,
  pageNumber,
  totalPages,
  documentTitle = "Document",
  onClose,
  onStartReading,
}: PageContentDisplayProps) {
  const [isReading, setIsReading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const wordRefs = useRef<{ [key: number]: View | null }>({});

  const {
    isSpeaking,
    isPaused,
    currentWordIndex,
    totalWords,
    progress,
    speak,
    pause,
    resume,
    stop,
  } = useTextToSpeech({
    onStart: () => {
      setIsReading(true);
    },
    onDone: () => {
      setIsReading(false);
    },
  });

  // Split content into words for highlighting
  const words = pageContent ? pageContent.split(/\s+/) : [];

  // Auto-scroll to current word when reading
  useEffect(() => {
    if (isSpeaking && currentWordIndex >= 0 && scrollViewRef.current) {
      const currentWordRef = wordRefs.current[currentWordIndex];
      if (currentWordRef) {
        scrollViewRef.current.scrollTo({
          y: currentWordIndex * 28, // Approximate line height
          animated: true,
        });
      }
    }
  }, [currentWordIndex, isSpeaking]);

  const handleStartReading = () => {
    if (pageContent.trim().length === 0) return;
    onStartReading(pageContent);
    speak(pageContent);
  };

  const handleStopReading = () => {
    console.log("🛑 Stop reading button pressed");
    stop();
    setIsReading(false);
  };

  const handlePauseResume = () => {
    console.log(`⏸️ Pause/Resume: isSpeaking=${isSpeaking}, isPaused=${isPaused}`);
    if (isSpeaking) {
      if (isPaused) {
        console.log("▶️ Resuming reading");
        resume();
      } else {
        console.log("⏸️ Pausing reading");
        pause();
      }
    }
  };

  if (!visible || !pageContent) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingTop: 50,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#3B82F6",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name="document-text" size={20} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontFamily: "Rubik-SemiBold",
                color: "#1D2939",
              }}
              numberOfLines={1}
            >
              Page {pageNumber} Content
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Rubik",
                color: "#667085",
                marginTop: 2,
              }}
            >
              {documentTitle} • {totalPages} pages • {words.length} words
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
          <Ionicons name="close" size={24} color="#667085" />
        </TouchableOpacity>
      </View>

      {/* Reading Controls */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: "#F8FAFC",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        {/* Stop Button */}
        <TouchableOpacity
          onPress={handleStopReading}
          disabled={!isReading}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: isReading ? "#FEE2E2" : "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
            marginHorizontal: 8,
          }}
        >
          <Ionicons
            name="stop"
            size={24}
            color={isReading ? "#EF4444" : "#9CA3AF"}
          />
        </TouchableOpacity>

        {/* Play/Pause Button */}
        <TouchableOpacity
          onPress={isReading ? handlePauseResume : handleStartReading}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: isReading ? "#3B82F6" : "#10B981",
            alignItems: "center",
            justifyContent: "center",
            marginHorizontal: 16,
            shadowColor: isReading ? "#3B82F6" : "#10B981",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
        >
          <Ionicons
            name={
              !isReading 
                ? "play" 
                : isPaused 
                ? "play" 
                : "pause"
            }
            size={32}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* Restart Button */}
        <TouchableOpacity
          onPress={handleStartReading}
          disabled={!pageContent}
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
          <Ionicons 
            name="refresh" 
            size={24} 
            color={pageContent ? "#667085" : "#D1D5DB"} 
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      {isReading && (
        <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#F8FAFC" }}>
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
                backgroundColor: "#3B82F6",
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

      {/* Content Display Area - "Write here" style */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1, backgroundColor: "#F8FAFC" }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* "Write here" Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontFamily: "Rubik-SemiBold",
              color: "#10B981",
              fontStyle: "italic",
            }}
          >
            Write here
          </Text>
        </View>

        {/* Main Content Area */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 16,
            padding: 24,
            minHeight: 300,
            borderWidth: 3,
            borderColor: "#10B981",
            shadowColor: "#10B981",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
          }}
        >
          <Text style={{ lineHeight: 28, fontSize: 16, letterSpacing: 0.3 }}>
            {words.map((word, index) => {
              const isCurrentWord = isReading && index === currentWordIndex;
              const isPastWord = isReading && index < currentWordIndex;
              
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
                      : "#1D2939",
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
        </View>

        {/* Page Info */}
        <View
          style={{
            marginTop: 20,
            padding: 16,
            backgroundColor: "#F8FAFC",
            borderRadius: 8,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
            <Ionicons name="information-circle" size={16} color="#3B82F6" />
            <Text
              style={{
                marginLeft: 8,
                fontSize: 14,
                fontFamily: "Rubik-SemiBold",
                color: "#1D2939",
              }}
            >
              Page Information
            </Text>
          </View>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Rubik",
              color: "#667085",
              lineHeight: 18,
            }}
          >
            This content was extracted from page {pageNumber} of {totalPages} in "{documentTitle}". 
            The text has been copied and is now ready for audio reading with word-by-word highlighting.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

