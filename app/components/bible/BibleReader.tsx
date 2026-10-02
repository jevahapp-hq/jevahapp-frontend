import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { useBibleNarration } from "./useBibleNarration";
import { BibleVerse, bibleApiService } from "../../services/bibleApiService";
import { markBreathAtBoundary } from "../../utils/chunkSpeechText";
import { useBibleReadingStyle } from "../../utils/bibleReadingStyle";
import type { BibleVoiceChoice } from "./BibleVoiceSheet";

interface BibleReaderProps {
  bookName: string;
  chapterNumber: number;
  onNavigateChapter: (direction: "prev" | "next") => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  onScreenTap?: () => void;
  onChromeChange?: (hidden: boolean) => void;
  chromeVisible?: boolean;
  onVoiceMenu?: (menu: {
    voices: BibleVoiceChoice[];
    selectedId: string;
    onSelect: (id: string) => void;
  } | null) => void;
  // Verses already fetched by the verse picker screen - when provided,
  // skips a redundant network request and shows content instantly.
  initialVerses?: BibleVerse[];
  // Verse number the user picked - the reader scrolls to it on open.
  initialVerseNumber?: number | null;
  translationId?: string;
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
  onChromeChange,
  chromeVisible = true,
  onVoiceMenu,
  initialVerses,
  initialVerseNumber,
  translationId,
}: BibleReaderProps) {
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWordPosition, setCurrentWordPosition] = useState<WordPosition | null>(null);
  const [allWords, setAllWords] = useState<WordPosition[]>([]);
  const flatListRef = useRef<FlatList>(null);
  // Word index the current speech utterance started from - needed to map
  // TTS progress (relative to the text we handed it) back onto the full
  // allWords array when playback starts partway through a chapter.
  const playbackOffsetRef = useRef(0);
  const autoPlayedForRef = useRef<string | null>(null);
  const narration = useBibleNarration({
    bookName,
    chapterNumber,
    translationId,
    verses,
    onChapterEnded: () => {
      if (canNavigateNext) onNavigateChapter("next");
    },
  });
  const reading = useBibleReadingStyle();

  // Slide controls
  const screenWidth = Dimensions.get("window").width;
  const topSlideX = useRef(new Animated.Value(0)).current;
  const [isTopHidden, setIsTopHidden] = useState(false);

  const slideTop = (hide: boolean) => {
    setIsTopHidden(hide);
    Animated.timing(topSlideX, {
      toValue: hide ? screenWidth : 0,
      duration: 220,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    
  };

  const chromeTapAt = useRef(0);
  const lastVerseTapAt = useRef(0);
  const verseTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleTopControls = () => {
    const now = Date.now();
    if (now - chromeTapAt.current < 380) return;
    chromeTapAt.current = now;
    if (verseTapTimer.current) {
      clearTimeout(verseTapTimer.current);
      verseTapTimer.current = null;
    }
    if (onScreenTap) onScreenTap();
    else slideTop(!isTopHidden);
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
      // Update current word position for highlighting - offset by where
      // this utterance started in case playback began mid-chapter.
      const index = currentWord - 1 + playbackOffsetRef.current;
      if (currentWord > 0 && index < allWords.length) {
        const wordPos = allWords[index];
        setCurrentWordPosition(wordPos);
        
        // Auto-scroll to current verse
        if (wordPos) {
          scrollToVerse(wordPos.verseIndex);
        }
      }
    },
  });

  useEffect(() => {
    if (initialVerses && initialVerses.length > 0) {
      setVerses(initialVerses);
      setLoading(false);
      setError(null);
    } else {
      loadVerses();
    }
    autoPlayedForRef.current = null;
    playbackOffsetRef.current = 0;
    const cleanup = () => {
      stop();
      setCurrentWordPosition(null);
    };
    return cleanup;
    // Don't depend on initialVerses identity — a new array of the same
    // chapter would stop TTS before autoplay can start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookName, chapterNumber]);

  // Scroll to the verse the user picked, once it's rendered.
  useEffect(() => {
    if (!initialVerseNumber || verses.length === 0) return;
    const index = verses.findIndex(
      (v) => v.verseNumber === initialVerseNumber
    );
    if (index < 0) return;
    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index,
        animated: false,
        viewPosition: 0.1,
      });
    }, 150);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verses, initialVerseNumber]);

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

  // Auto-play the audio starting from the verse the user picked in the
  // verse selector, once everything needed to speak it is ready.
  useEffect(() => {
    if (!initialVerseNumber || allWords.length === 0) return;
    if (!narration.available) return;
    const key = `${translationId || "selected"}-${bookName}-${chapterNumber}-${initialVerseNumber}`;
    if (autoPlayedForRef.current === key) return;
    const timeout = setTimeout(() => {
      autoPlayedForRef.current = key;
      void stop();
      void narration.playFromVerse(initialVerseNumber);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allWords, initialVerseNumber, bookName, chapterNumber, narration.available]);

  useEffect(() => {
    if (narration.activeVerseNumber == null) return;
    const index = verses.findIndex(
      (verse) => verse.verseNumber === narration.activeVerseNumber
    );
    if (index >= 0) scrollToVerse(index);
  }, [narration.activeVerseNumber, verses]);

  const scrollToVerse = (verseIndex: number) => {
    if (flatListRef.current && verseIndex >= 0 && verseIndex < verses.length) {
      flatListRef.current.scrollToIndex({
        index: verseIndex,
        animated: false,
        viewPosition: 0.28,
      });
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
    } catch (err) {
      setError("Failed to load verses. Please try again.");
      console.error("Error loading verses:", err);
    } finally {
      setLoading(false);
    }
  };

  // Get full text of all verses for TTS (must match allWords structure)
  const getFullText = () => {
    return allWords
      .map((wp, index) => {
        const next = allWords[index + 1];
        const verseEnded = !next || next.verseIndex !== wp.verseIndex;
        return markBreathAtBoundary(wp.word, verseEnded);
      })
      .join(" ");
  };

  // Handle play/pause
  const usingNarration = narration.available;
  const showTransport = usingNarration
    ? narration.hasStarted
    : isSpeaking ||
      isPaused ||
      (currentWordIndex > 0 && currentWordIndex < allWords.length);
  const transportPaused = usingNarration ? narration.isPaused : isPaused;
  const playbackRate = usingNarration ? narration.rate : rate;

  const handlePlayPause = async () => {
    if (usingNarration) {
      if (narration.preparing) return;
      await narration.togglePlayback(initialVerseNumber || 1);
      return;
    }
    if (!isSpeaking && !isPaused) {
      // Ensure words are mapped before speaking
      if (allWords.length === 0) {
        console.warn("No words available to speak");
        return;
      }
      playbackOffsetRef.current = 0;
      const fullText = getFullText();
      console.log(`🎙️ Speaking ${allWords.length} words`);
      await speak(fullText);
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  const voiceMenu = useMemo(() => {
    if (narration.available) {
      return {
        voices: narration.readers.map((reader) => ({
          id: reader.id,
          name: reader.name,
          description: "Narrator",
        })),
        selectedId: narration.readerId,
        onSelect: narration.setReader,
      };
    }
    return null;
  }, [
    narration.available,
    narration.readerId,
    narration.readers,
    narration.setReader,
  ]);
  const voiceMenuRef = useRef(onVoiceMenu);
  voiceMenuRef.current = onVoiceMenu;
  useEffect(() => {
    voiceMenuRef.current?.(voiceMenu);
  }, [voiceMenu]);
  useEffect(() => {
    return () => voiceMenuRef.current?.(null);
  }, []);

  // Start reading aloud from a specific verse rather than the top of the
  // chapter - used when the user picks a verse from the verse selector.
  const startReadingFromVerse = async (verseNumber: number) => {
    if (allWords.length === 0) return;
    const startIndex = allWords.findIndex(
      (w) => verses[w.verseIndex]?.verseNumber === verseNumber
    );
    const offset = startIndex >= 0 ? startIndex : 0;
    playbackOffsetRef.current = offset;
    const textFromVerse = allWords
      .slice(offset)
      .map((wp, index, slice) => {
        const next = slice[index + 1];
        const verseEnded = !next || next.verseIndex !== wp.verseIndex;
        return markBreathAtBoundary(wp.word, verseEnded);
      })
      .join(" ");
    if (!textFromVerse) return;
    console.log(`🎙️ Speaking from verse ${verseNumber} (word ${offset})`);
    await speak(textFromVerse);
  };

  // Handle stop
  const handleStop = () => {
    if (usingNarration) {
      void narration.stop();
    }
    stop();
    playbackOffsetRef.current = 0;
    setCurrentWordPosition(null);
  };

  const onVersePress = (verseNumber: number) => {
    const now = Date.now();
    const doubleTap = now - lastVerseTapAt.current < 320;
    lastVerseTapAt.current = now;
    if (verseTapTimer.current) {
      clearTimeout(verseTapTimer.current);
      verseTapTimer.current = null;
    }
    if (doubleTap) {
      toggleTopControls();
      return;
    }
    verseTapTimer.current = setTimeout(() => {
      verseTapTimer.current = null;
      if (Date.now() - chromeTapAt.current < 400) return;
      if (narration.available) {
        void stop();
        void narration.playFromVerse(verseNumber);
        return;
      }
      void startReadingFromVerse(verseNumber);
    }, 320);
  };

  const slower = () => {
    const next = Math.max(0.5, playbackRate - 0.25);
    if (usingNarration) void narration.setRate(next);
    else setRate(next);
  };
  const faster = () => {
    const next = Math.min(2, playbackRate + 0.25);
    if (usingNarration) void narration.setRate(next);
    else setRate(next);
  };

  const renderVerse = ({ item, index }: { item: BibleVerse; index: number }) => {
    const spoken =
      usingNarration && narration.hasStarted
        ? narration.spokenVerses.find(
            (verse) => verse.verseNumber === item.verseNumber
          )?.text
        : null;
    const words = (spoken || item.text).split(/\s+/).filter((w) => w.length > 0);
    const narrationVerse =
      usingNarration && narration.activeVerseNumber === item.verseNumber;
    const isCurrentVerse =
      narrationVerse || currentWordPosition?.verseIndex === index;
    const verseType = {
      fontFamily: reading.fontFamily,
      fontSize: reading.fontSize,
      lineHeight: reading.lineHeight,
    };

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => onVersePress(item.verseNumber)}
        style={[styles.verseContainer, narrationVerse && styles.narrationVerse]}
      >
        <Text
          style={[
            styles.verseNumber,
            narrationVerse && styles.verseNumberActive,
            { fontSize: Math.max(12, reading.fontSize - 5) },
          ]}
        >
          {item.verseNumber}
        </Text>
        <View style={styles.verseTextContainer}>
          {words.map((word, wordIndex) => {
            const isHighlighted =
              !usingNarration &&
              isCurrentVerse &&
              currentWordPosition?.wordIndex === wordIndex;

            return (
              <Text
                key={`${index}-${wordIndex}`}
                style={[
                  styles.verseWord,
                  verseType,
                  isHighlighted && styles.highlightedWord,
                ]}
              >
                {word}{" "}
              </Text>
            );
          })}
        </View>
      </TouchableOpacity>
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

      <View style={{ flex: 1 }}>
        <TapGestureHandler numberOfTaps={2} onActivated={toggleTopControls}>
          <View style={{ flex: 1 }} collapsable={false}>
            <FlatList
              ref={flatListRef}
              data={verses}
              renderItem={renderVerse}
              keyExtractor={(item) => item._id}
              extraData={`${narration.activeVerseNumber ?? ""}-${reading.fontId}-${reading.fontSize}`}
              contentContainerStyle={[
                styles.versesContainer,
                { paddingTop: chromeVisible ? 100 : 16 },
              ]}
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
      {chromeVisible && verses.length > 0 && (
        <View style={styles.floatingPlayContainer}>
          <View style={styles.topBarRow}>
            <View>
            {!isTopHidden ? (
            <TouchableOpacity
              style={styles.cardClose}
              onPress={() => {
                slideTop(true);
                onChromeChange?.(true);
              }}
              accessibilityLabel="Close player"
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color="#1F2937" />
            </TouchableOpacity>
            ) : null}
            {Platform.OS !== "web" ? (
              <Animated.View
                pointerEvents={isTopHidden ? "none" : "auto"}
                style={{ transform: [{ translateX: topSlideX }] }}
              >
                <View style={styles.glassBar}>
                  <BlurView
                    pointerEvents="none"
                    intensity={80}
                    tint="light"
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.glassBarContent}>
                  {/* Show full controls when playing/paused, or just play button when idle */}
                  {showTransport ? (
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
                            onPress={slower}
                          >
                            <Text style={styles.speedTextSmall}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.speedValueDisplay}>{playbackRate.toFixed(1)}x</Text>
                          <TouchableOpacity
                            style={styles.speedButtonSmall}
                            onPress={faster}
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
                          {narration.preparing ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Ionicons
                              name={transportPaused ? "play" : "pause"}
                              size={24}
                              color="#FFFFFF"
                            />
                          )}
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
                          {narration.preparing ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Ionicons name="play" size={24} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      </View>
                      <View style={{ width: 40 }} />
                    </View>
                  )}
                  </View>
                </View>
              </Animated.View>
            ) : (
              <Animated.View
                pointerEvents={isTopHidden ? "none" : "auto"}
                style={{
                  transform: [{ translateX: topSlideX }],
                  opacity: isTopHidden ? 0 : 1,
                }}
              >
                <View style={[styles.glassBar, styles.glassBarWeb]}>
                  <View style={styles.glassBarContent}>
                  {showTransport ? (
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
                            onPress={slower}
                          >
                            <Text style={styles.speedTextSmall}>−</Text>
                          </TouchableOpacity>
                          <Text style={styles.speedValueDisplay}>{playbackRate.toFixed(1)}x</Text>
                          <TouchableOpacity
                            style={styles.speedButtonSmall}
                            onPress={faster}
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
                          {narration.preparing ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Ionicons
                              name={transportPaused ? "play" : "pause"}
                              size={24}
                              color="#FFFFFF"
                            />
                          )}
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
                        {narration.preparing ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Ionicons name="play" size={24} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                  </View>
                </View>
              </Animated.View>
            )}
            </View>
          </View>
          {isTopHidden ? (
            <TouchableOpacity
              style={styles.reopenPlayer}
              onPress={() => {
                slideTop(false);
                onChromeChange?.(false);
              }}
              accessibilityLabel="Show player"
            >
              <Ionicons name="play" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

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
    zIndex: 30,
    elevation: 30,
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
  cardClose: {
    position: "absolute",
    right: -4,
    top: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  reopenPlayer: {
    marginTop: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#256E63",
    alignItems: "center",
    justifyContent: "center",
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
    paddingVertical: 4,
    borderRadius: 10,
  },
  narrationVerse: {
    backgroundColor: "#FDE68A",
  },
  verseNumberActive: {
    color: "#92400E",
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
