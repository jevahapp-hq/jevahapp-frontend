import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { TapGestureHandler } from "react-native-gesture-handler";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";
import { BibleVerse, bibleApiService } from "../../services/bibleApiService";

interface BibleReaderProps {
  bookName: string;
  chapterNumber: number;
  onNavigateChapter: (direction: "prev" | "next") => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  onScreenTap?: () => void;
}

interface WordPosition {
  verseIndex: number;
  wordIndex: number;
  word: string;
}

export default function BibleReader({
  bookName,
  chapterNumber,
  onNavigateChapter,
  canNavigatePrev,
  canNavigateNext,
  onScreenTap,
}: BibleReaderProps) {
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [verseCount, setVerseCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWordPosition, setCurrentWordPosition] = useState<WordPosition | null>(null);
  const [allWords, setAllWords] = useState<WordPosition[]>([]);
  const flatListRef = useRef<FlatList>(null);

  // Slide controls
  const screenWidth = Dimensions.get("window").width;
  const topSlideX = useRef(new Animated.Value(0)).current;
  const [isTopHidden, setIsTopHidden] = useState(false);

  const slideTop = (hide: boolean) => {
    setIsTopHidden(hide);
    Animated.timing(topSlideX, {
      toValue: hide ? screenWidth : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
    
  };

  const toggleTopControls = () => {
    // Toggle the visibility of the top play controls
    const nextHidden = !isTopHidden;
    slideTop(nextHidden);
    // Notify parent to toggle bottom nav bar too
    if (onScreenTap) onScreenTap();
  };

  // bottom nav removed

  // Initialize TTS
  const {
    isSpeaking,
    isPaused,
    currentWordIndex,
    speak,
    pause,
    resume,
    stop,
    setRate,
    rate,
  } = useTextToSpeech({
    onStart: () => {
      console.log("🎙️ Bible audio started");
    },
    onDone: () => {
      console.log("✅ Bible audio completed");
      setCurrentWordPosition(null);
    },
    onStopped: () => {
      console.log("⏹️ Bible audio stopped");
      setCurrentWordPosition(null);
    },
    onProgress: ({ currentWord }) => {
      // Update current word position for highlighting
      if (currentWord > 0 && currentWord <= allWords.length) {
        const wordPos = allWords[currentWord - 1];
        setCurrentWordPosition(wordPos);
        
        // Auto-scroll to current verse
        if (wordPos) {
          scrollToVerse(wordPos.verseIndex);
        }
      }
    },
  });

  useEffect(() => {
    loadVerses();
    loadChapterInfo();
    // Stop any ongoing speech when chapter changes
    const cleanup = () => {
      stop();
      setCurrentWordPosition(null);
    };
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookName, chapterNumber]);

  // Build word mapping when verses change
  useEffect(() => {
    if (verses.length > 0) {
      const words: WordPosition[] = [];
      verses.forEach((verse, verseIndex) => {
        const verseWords = verse.text.split(/\s+/).filter((w) => w.length > 0);
        verseWords.forEach((word, wordIndex) => {
          words.push({
            verseIndex,
            wordIndex,
            word,
          });
        });
      });
      setAllWords(words);
    }
  }, [verses]);

  // Auto-scroll to verse helper
  const scrollToVerse = (verseIndex: number) => {
    if (flatListRef.current && verseIndex >= 0 && verseIndex < verses.length) {
      flatListRef.current.scrollToIndex({
        index: verseIndex,
        animated: true,
        viewPosition: 0.3, // Show verse near top
      });
    }
  };

  const loadChapterInfo = async () => {
    try {
      // Get chapter info with verse count
      const chapter = await bibleApiService.getChapter(bookName, chapterNumber);
      // Use actualVerseCount if available, otherwise use verseCount or verses length
      setVerseCount(
        (chapter as any).actualVerseCount ||
          (chapter as any).verseCount ||
          verses.length
      );
    } catch (err) {
      console.error("Error loading chapter info:", err);
      // Will be set when verses load
    }
  };

  const loadVerses = async () => {
    setLoading(true);
    setError(null);
    try {
      const chapterVerses = await bibleApiService.getChapterVerses(
        bookName,
        chapterNumber
      );
      setVerses(chapterVerses);
      // Update verse count from loaded verses if not already set
      if (chapterVerses.length > 0 && verseCount === 0) {
        setVerseCount(chapterVerses.length);
      }
    } catch (err) {
      setError("Failed to load verses. Please try again.");
      console.error("Error loading verses:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get full text of all verses for TTS (must match allWords structure)
  const getFullText = () => {
    // Use the same word splitting logic to ensure perfect alignment
    return allWords.map((wp) => wp.word).join(" ");
  };

  // Handle play/pause
  const handlePlayPause = async () => {
    if (!isSpeaking && !isPaused) {
      // Ensure words are mapped before speaking
      if (allWords.length === 0) {
        console.warn("No words available to speak");
        return;
      }
      const fullText = getFullText();
      console.log(`🎙️ Speaking ${allWords.length} words`);
      await speak(fullText);
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  // Handle stop
  const handleStop = () => {
    stop();
    setCurrentWordPosition(null);
  };

  const renderVerse = ({ item, index }: { item: BibleVerse; index: number }) => {
    const words = item.text.split(/\s+/).filter((w) => w.length > 0);
    const isCurrentVerse = currentWordPosition?.verseIndex === index;

    return (
      <View style={styles.verseContainer}>
        <Text style={styles.verseNumber}>{item.verseNumber}</Text>
        <View style={styles.verseTextContainer}>
          {words.map((word, wordIndex) => {
            const isHighlighted =
              isCurrentVerse &&
              currentWordPosition?.wordIndex === wordIndex;

            return (
              <Text
                key={`${index}-${wordIndex}`}
                style={[
                  styles.verseWord,
                  isHighlighted && styles.highlightedWord,
                ]}
              >
                {word}{" "}
              </Text>
            );
          })}
        </View>
      </View>
    );
  };

  const renderNavigationControls = () => (
    <View style={styles.navigationContainer} />
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#256E63" />
        <Text style={styles.loadingText}>Loading verses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVerses}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (verses.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="book-outline" size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>No verses found for this chapter.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Floating Audio Controls at Top with Glass Background */}
      {verses.length > 0 && (
        <View style={styles.floatingPlayContainer}>
          <View style={styles.topBarRow}>
            {Platform.OS !== "web" ? (
              <Animated.View style={{ transform: [{ translateX: topSlideX }] }}>
                <BlurView intensity={80} tint="light" style={styles.glassBar}>
                  <View style={styles.glassBarContent}>
                  {/* Show full controls when playing/paused, or just play button when idle */}
                  {isSpeaking || isPaused || (currentWordIndex > 0 && currentWordIndex < allWords.length) ? (
                    <View style={styles.controlsRow}>
                      <View style={styles.controlsLeft}>
                        <TouchableOpacity
                          style={styles.controlButton}
                          onPress={handleStop}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="stop" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.controlsCenter}>
                        <View style={styles.speedControlsCenter}>
                          <TouchableOpacity
                            style={styles.speedButtonSmall}
                            onPress={() => setRate(Math.max(0.5, rate - 0.25))}
                          >
                            <Text style={styles.speedTextSmall}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.speedValueDisplay}>{rate.toFixed(1)}x</Text>
                          <TouchableOpacity
                            style={styles.speedButtonSmall}
                            onPress={() => setRate(Math.min(2.0, rate + 0.25))}
                          >
                            <Text style={styles.speedTextSmall}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.controlsRight}>
                        <TouchableOpacity
                          style={styles.controlButtonRight}
                          onPress={handlePlayPause}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={isPaused ? "play" : "pause"}
                              size={24}
                              color="#FFFFFF"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    /* Just Play Button when idle - center perfectly with spacers */
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <View style={{ width: 40 }} />
                      <View style={{ alignItems: "center", justifyContent: "center" }}>
                        <TouchableOpacity
                          style={styles.controlButtonRight}
                          onPress={handlePlayPause}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="play" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                      <View style={{ width: 40 }} />
                    </View>
                  )}
                  </View>
                </BlurView>
              </Animated.View>
            ) : (
              <Animated.View style={{ transform: [{ translateX: topSlideX }] }}>
                <View style={[styles.glassBar, styles.glassBarWeb]}>
                  <View style={styles.glassBarContent}>
                  {isSpeaking || isPaused || (currentWordIndex > 0 && currentWordIndex < allWords.length) ? (
                    <View style={styles.controlsRow}>
                      <View style={styles.controlsLeft}>
                        <TouchableOpacity
                          style={styles.controlButton}
                          onPress={handleStop}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="stop" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.controlsCenter}>
                        <View style={styles.speedControlsCenter}>
                          <TouchableOpacity
                            style={styles.speedButtonSmall}
                            onPress={() => setRate(Math.max(0.5, rate - 0.25))}
                          >
                            <Text style={styles.speedTextSmall}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.speedValueDisplay}>{rate.toFixed(1)}x</Text>
                          <TouchableOpacity
                            style={styles.speedButtonSmall}
                            onPress={() => setRate(Math.min(2.0, rate + 0.25))}
                          >
                            <Text style={styles.speedTextSmall}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.controlsRight}>
                        <TouchableOpacity
                          style={styles.controlButtonRight}
                          onPress={handlePlayPause}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name={isPaused ? "play" : "pause"}
                              size={24}
                              color="#FFFFFF"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                      <TouchableOpacity
                        style={styles.controlButtonRight}
                        onPress={handlePlayPause}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play" size={24} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  )}
                  </View>
                </View>
              </Animated.View>
            )}
            {/* Arrow removed; double-tap anywhere to toggle */}
          </View>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <TapGestureHandler numberOfTaps={2} onActivated={toggleTopControls}>
          <View style={{ flex: 1 }}>
            <FlatList
              ref={flatListRef}
              data={verses}
              renderItem={renderVerse}
              keyExtractor={(item) => item._id}
              contentContainerStyle={[styles.versesContainer, { paddingTop: 88 }]}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={renderNavigationControls}
              onScrollToIndexFailed={(info) => {
                // Handle scroll errors gracefully
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                  });
                }, 100);
              }}
            />
          </View>
        </TapGestureHandler>
      </View>

      {/* bottom prev/next removed */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  floatingPlayContainer: {
    position: "absolute",
    top: 20,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 20,
  },
  // bottom nav removed
  glassBar: {
    width: 270,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  glassBarWeb: {
    backgroundColor: "rgba(37, 110, 99, 0.15)",
    backdropFilter: "blur(10px)",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  glassBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    height: "100%",
    paddingHorizontal: 8,
    backgroundColor: "rgba(37, 110, 99, 0.15)",
  },
  topBarRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  inlineSlideToggle: {
    position: "absolute",
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#256E63",
    alignItems: "center",
    justifyContent: "center",
  },
  slideToggleTop: {
    position: "absolute",
    right: 0,
    top: -10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 25,
  },
  slideToggleBottom: {},
  playButtonAlone: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#256E63",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    borderWidth: 0,
    borderColor: "transparent",
  },
  controlButtonRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#256E63",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 0,
    borderColor: "transparent",
  },
  speedControlsCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  speedButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  speedTextSmall: {
    fontSize: 20,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
    lineHeight: 24,
  },
  speedValueDisplay: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
    minWidth: 40,
    textAlign: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  controlsLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  controlsCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  controlsRight: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  versesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  verseContainer: {
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  verseNumber: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
    color: "#256E63",
    marginRight: 12,
    marginTop: 2,
    minWidth: 20,
    textAlign: "right",
  },
  verseTextContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  verseWord: {
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#1F2937",
    lineHeight: 24,
  },
  highlightedWord: {
    backgroundColor: "#256E63",
    color: "#FFFFFF",
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 3,
  },
  verseText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#1F2937",
    lineHeight: 24,
  },
  navigationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 24,
    marginTop: 32,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    color: "#256E63",
    marginHorizontal: 8,
  },
  navButtonTextDisabled: {
    color: "#9CA3AF",
  },
  playButtonInBar: { },
  loadingText: {
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#EF4444",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#256E63",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: "#FFFFFF",
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
  },
});
