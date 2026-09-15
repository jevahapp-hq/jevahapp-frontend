import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { pausePlaybackSession } from "../../src/shared/audio";
import {
  EbookChapter,
  EbookWordPosition,
  buildWordPositions,
  firstReadableChapter,
  joinWords,
  nextReadableChapter,
  prevReadableChapter,
  readableChapterAtOrAfter,
  splitWords,
} from "./pdfText/buildEbookChapters";

type Props = {
  title?: string;
  chapters: EbookChapter[];
  totalPages: number;
  extractedPages: number;
  status: "idle" | "preparing" | "extracting" | "ready" | "error";
  error: string | null;
  onRetry: () => void;
  onChapterChange?: (chapterNumber: number) => void;
  /** PDF page the user was on when they tapped Listen. */
  startChapterNumber?: number;
};

export default function EbookReadAloud({
  title,
  chapters,
  totalPages,
  extractedPages,
  status,
  error,
  onRetry,
  onChapterChange,
  startChapterNumber,
}: Props) {
  const insets = useSafeAreaInsets();
  const requestedStart = Math.max(1, startChapterNumber || 1);
  const first = firstReadableChapter(chapters);
  const [chapterNumber, setChapterNumber] = useState(requestedStart);
  const [currentWordPosition, setCurrentWordPosition] =
    useState<EbookWordPosition | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const playbackOffsetRef = useRef(0);
  const resumeWordIndexRef = useRef(0);
  const autoPlayedRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const continueAfterDoneRef = useRef(true);
  const utteranceIdRef = useRef(0);
  const userPausedRef = useRef(false);

  const chapter = chapters.find((c) => c.chapterNumber === chapterNumber);
  const blocks = chapter?.blocks ?? [];
  const allWords = useMemo(() => buildWordPositions(blocks), [blocks]);
  const allWordsRef = useRef(allWords);
  allWordsRef.current = allWords;
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;
  const chapterNumberRef = useRef(chapterNumber);
  chapterNumberRef.current = chapterNumber;
  const currentWordPositionRef = useRef(currentWordPosition);
  currentWordPositionRef.current = currentWordPosition;

  const applyChapter = useCallback(
    (next: number, play: boolean) => {
      setCurrentWordPosition(null);
      playbackOffsetRef.current = 0;
      resumeWordIndexRef.current = 0;
      setChapterNumber(next);
      onChapterChange?.(next);
      pendingPlayRef.current = play;
      if (!play) setUserPaused(false);
    },
    [onChapterChange]
  );

  const progressRef = useRef((_p: { currentWord: number }) => {});
  const doneRef = useRef(() => {});
  const stoppedRef = useRef(() => {});

  progressRef.current = ({ currentWord }) => {
    if (userPausedRef.current) return;
    const words = allWordsRef.current;
    const index = currentWord - 1 + playbackOffsetRef.current;
    if (currentWord > 0 && index >= 0 && index < words.length) {
      const wordPos = words[index];
      resumeWordIndexRef.current = index;
      setCurrentWordPosition(wordPos);
      if (wordPos) {
        flatListRef.current?.scrollToIndex({
          index: wordPos.blockIndex,
          animated: true,
          viewPosition: 0.3,
        });
      }
    }
  };

  const {
    isSpeaking,
    speak,
    stop,
    setRate,
    rate,
  } = useTextToSpeech({
    onStart: () => {
      void pausePlaybackSession();
    },
    onDone: () => doneRef.current(),
    onStopped: () => stoppedRef.current(),
    onProgress: (p) => progressRef.current(p),
  });

  const speakRef = useRef(speak);
  speakRef.current = speak;
  const stopRef = useRef(stop);
  stopRef.current = stop;
  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;

  useEffect(() => {
    userPausedRef.current = userPaused;
  }, [userPaused]);

  doneRef.current = () => {
    if (userPausedRef.current) return;
    setCurrentWordPosition(null);
    if (!continueAfterDoneRef.current) return;
    const finishedId = utteranceIdRef.current;
    const nxt = nextReadableChapter(
      chaptersRef.current,
      chapterNumberRef.current
    );
    if (!nxt) return;
    setTimeout(() => {
      if (utteranceIdRef.current !== finishedId) return;
      if (!continueAfterDoneRef.current) return;
      if (userPausedRef.current) return;
      applyChapter(nxt.chapterNumber, true);
    }, 250);
  };

  stoppedRef.current = () => {
    if (userPausedRef.current) return;
    setCurrentWordPosition(null);
  };

  useEffect(() => {
    const current = chapters.find((c) => c.chapterNumber === chapterNumber);
    if (current && !current.isEmpty) return;
    const stillWaitingForPage =
      status === "preparing" ||
      status === "extracting" ||
      status === "idle";
    if (stillWaitingForPage && extractedPages < chapterNumber) return;
    const fallback = readableChapterAtOrAfter(chapters, chapterNumber) || first;
    if (fallback && fallback.chapterNumber !== chapterNumber) {
      setChapterNumber(fallback.chapterNumber);
      onChapterChange?.(fallback.chapterNumber);
    }
  }, [
    chapters,
    chapterNumber,
    first,
    onChapterChange,
    status,
    extractedPages,
  ]);

  useEffect(() => {
    onChapterChange?.(chapterNumber);
  }, [chapterNumber, onChapterChange]);

  useEffect(() => {
    return () => {
      utteranceIdRef.current += 1;
      continueAfterDoneRef.current = false;
      void stopRef.current();
    };
  }, []);

  const rememberResumeIndex = useCallback(() => {
    const words = allWordsRef.current;
    const pos = currentWordPositionRef.current;
    if (!pos) return;
    const idx = words.findIndex(
      (w) => w.blockIndex === pos.blockIndex && w.wordIndex === pos.wordIndex
    );
    if (idx >= 0) resumeWordIndexRef.current = idx;
  }, []);

  const startReadingFromWord = useCallback(async (wordIndex: number) => {
    const words = allWordsRef.current;
    if (words.length === 0) return;
    const start = Math.max(0, Math.min(wordIndex, words.length - 1));
    playbackOffsetRef.current = start;
    resumeWordIndexRef.current = start;
    const text = joinWords(words.slice(start));
    if (!text) return;
    utteranceIdRef.current += 1;
    continueAfterDoneRef.current = true;
    setUserPaused(false);
    void pausePlaybackSession();
    await speakRef.current(text);
  }, []);

  const startChapter = useCallback(async () => {
    await startReadingFromWord(0);
  }, [startReadingFromWord]);

  const pauseReading = useCallback(async () => {
    rememberResumeIndex();
    userPausedRef.current = true;
    setUserPaused(true);
    continueAfterDoneRef.current = false;
    utteranceIdRef.current += 1;
    await stopRef.current();
  }, [rememberResumeIndex]);

  const resumeReading = useCallback(async () => {
    await startReadingFromWord(resumeWordIndexRef.current);
  }, [startReadingFromWord]);

  // Auto-play from the PDF page the user was on, once that chapter's text is in.
  useEffect(() => {
    if (autoPlayedRef.current) return;
    const ready =
      chapters.find((c) => c.chapterNumber === requestedStart && !c.isEmpty) ||
      (status === "ready"
        ? readableChapterAtOrAfter(chapters, requestedStart)
        : undefined);
    if (!ready) return;
    if (chapterNumber !== ready.chapterNumber) {
      setChapterNumber(ready.chapterNumber);
      return;
    }
    if (allWords.length === 0) return;
    autoPlayedRef.current = true;
    const t = setTimeout(() => {
      void startChapter();
    }, 400);
    return () => clearTimeout(t);
  }, [
    chapters,
    requestedStart,
    chapterNumber,
    allWords.length,
    startChapter,
    status,
  ]);

  // Play after next/prev chapter once that chapter's word map is ready.
  useEffect(() => {
    if (!pendingPlayRef.current) return;
    if (allWords.length === 0) return;
    pendingPlayRef.current = false;
    const t = setTimeout(() => {
      void startChapter();
    }, 200);
    return () => clearTimeout(t);
  }, [allWords, chapterNumber, startChapter]);

  const listening = isSpeaking && !userPaused;

  const handlePlayPause = async () => {
    if (listening) {
      await pauseReading();
      return;
    }
    if (userPaused) {
      await resumeReading();
      return;
    }
    if (allWords.length === 0) return;
    await startChapter();
  };

  const handleStop = async () => {
    utteranceIdRef.current += 1;
    continueAfterDoneRef.current = false;
    userPausedRef.current = false;
    setUserPaused(false);
    playbackOffsetRef.current = 0;
    resumeWordIndexRef.current = 0;
    setCurrentWordPosition(null);
    await stop();
  };

  const goPrev = () => {
    const prev = prevReadableChapter(chapters, chapterNumber);
    if (!prev) return;
    utteranceIdRef.current += 1;
    continueAfterDoneRef.current = false;
    void stop();
    applyChapter(prev.chapterNumber, listening);
  };

  const goNext = () => {
    const nxt = nextReadableChapter(chapters, chapterNumber);
    if (!nxt) return;
    utteranceIdRef.current += 1;
    continueAfterDoneRef.current = false;
    void stop();
    applyChapter(nxt.chapterNumber, listening);
  };

  const onBlockPress = (index: number) => {
    if (listening) {
      void pauseReading();
      return;
    }
    // Silent reading: tapping a paragraph does not restart audio.
  };

  const renderBlock = ({ item, index }: { item: string; index: number }) => {
    const words = splitWords(item);
    const isCurrent = currentWordPosition?.blockIndex === index;
    return (
      <TouchableOpacity
        style={styles.blockRow}
        activeOpacity={listening ? 0.7 : 1}
        onPress={() => onBlockPress(index)}
        onLongPress={() => {
          const found = allWords.findIndex((w) => w.blockIndex === index);
          void startReadingFromWord(found >= 0 ? found : 0);
        }}
      >
        <Text style={styles.blockNumber}>{index + 1}</Text>
        <View style={styles.blockTextWrap}>
          {words.map((word, wordIndex) => {
            const highlighted =
              isCurrent && currentWordPosition?.wordIndex === wordIndex;
            return (
              <Text
                key={`${index}-${wordIndex}`}
                style={[styles.word, highlighted && styles.highlightedWord]}
              >
                {word}{" "}
              </Text>
            );
          })}
        </View>
      </TouchableOpacity>
    );
  };

  if (status === "error") {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>
          {error || "Could not extract text from this PDF."}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!chapter || chapter.isEmpty) {
    const waiting =
      status === "preparing" ||
      status === "extracting" ||
      status === "idle";
    return (
      <View style={styles.center}>
        {waiting ? (
          <>
            <ActivityIndicator size="large" color="#256E63" />
            <Text style={styles.loadingText}>
              {status === "preparing"
                ? "Preparing the PDF…"
                : extractedPages > 0
                ? extractedPages < requestedStart
                  ? `Opening page ${requestedStart}… extracted ${extractedPages}${
                      totalPages ? ` of ${totalPages}` : ""
                    }`
                  : `Extracting chapter ${extractedPages}${
                      totalPages ? ` of ${totalPages}` : ""
                    }…`
                : `Extracting text from page ${requestedStart}…`}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              This PDF has no selectable text. Audio reading works with
              text-based PDFs, not scanned images.
            </Text>
          </>
        )}
      </View>
    );
  }

  const hasPrev = !!prevReadableChapter(chapters, chapterNumber);
  const hasNext = !!nextReadableChapter(chapters, chapterNumber);
  const knownTotal = Math.max(totalPages, chapters.length);
  const showBusy =
    (status === "extracting" || status === "preparing") &&
    extractedPages < knownTotal;
  const dockPad = Math.max(insets.bottom, 12);

  return (
    <View style={styles.container}>
      <View style={styles.floatingPlayContainer} pointerEvents="box-none">
        {Platform.OS !== "web" ? (
          <BlurView intensity={80} tint="light" style={styles.glassBar}>
            <TransportBar
              listening={listening}
              rate={rate}
              onStop={handleStop}
              onPlayPause={handlePlayPause}
              onSlower={() => setRate(Math.max(0.5, rate - 0.25))}
              onFaster={() => setRate(Math.min(2.0, rate + 0.25))}
            />
          </BlurView>
        ) : (
          <View style={[styles.glassBar, styles.glassBarWeb]}>
            <TransportBar
              listening={listening}
              rate={rate}
              onStop={handleStop}
              onPlayPause={handlePlayPause}
              onSlower={() => setRate(Math.max(0.5, rate - 0.25))}
              onFaster={() => setRate(Math.min(2.0, rate + 0.25))}
            />
          </View>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={blocks}
        renderItem={renderBlock}
        keyExtractor={(_, index) => `${chapterNumber}-${index}`}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 88 + dockPad },
        ]}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          }, 100);
        }}
        ListHeaderComponent={
          <View style={styles.chapterHeader}>
            <Text style={styles.chapterTitle}>
              Chapter {chapterNumber}
              {knownTotal > 0 ? ` of ${knownTotal}` : ""}
            </Text>
            {title ? (
              <Text style={styles.bookTitle} numberOfLines={2}>
                {title}
              </Text>
            ) : null}
            <Text style={styles.readHint}>
              {listening
                ? "Tap the page to pause and read silently"
                : userPaused
                ? "Paused — read here, or press play to continue"
                : "Press play to hear this chapter. Long-press a paragraph to start there."}
            </Text>
            {showBusy ? (
              <Text style={styles.extractHint}>
                Still extracting later chapters… {extractedPages}/{knownTotal}
              </Text>
            ) : null}
          </View>
        }
      />

      <View
        style={[styles.chapterDock, { paddingBottom: dockPad }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={[styles.dockNav, !hasPrev && styles.dockNavDisabled]}
          onPress={goPrev}
          disabled={!hasPrev}
          accessibilityLabel="Previous chapter"
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={hasPrev ? "#FFFFFF" : "rgba(255,255,255,0.45)"}
          />
          <Text
            style={[styles.dockNavText, !hasPrev && styles.dockNavTextDisabled]}
          >
            Prev
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dockPlay}
          onPress={handlePlayPause}
          activeOpacity={0.85}
          accessibilityLabel={listening ? "Pause reading" : "Play reading"}
        >
          <Ionicons
            name={listening ? "pause" : "play"}
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dockStop}
          onPress={handleStop}
          accessibilityLabel="Stop reading"
        >
          <Ionicons name="stop" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dockNav, !hasNext && styles.dockNavDisabled]}
          onPress={goNext}
          disabled={!hasNext}
          accessibilityLabel="Next chapter"
        >
          <Text
            style={[styles.dockNavText, !hasNext && styles.dockNavTextDisabled]}
          >
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={hasNext ? "#FFFFFF" : "rgba(255,255,255,0.45)"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TransportBar({
  listening,
  rate,
  onStop,
  onPlayPause,
  onSlower,
  onFaster,
}: {
  listening: boolean;
  rate: number;
  onStop: () => void;
  onPlayPause: () => void;
  onSlower: () => void;
  onFaster: () => void;
}) {
  return (
    <View style={styles.glassBarContent}>
      <View style={styles.controlsRow}>
        <View style={styles.controlsLeft}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onStop}
            activeOpacity={0.7}
            accessibilityLabel="Stop reading"
          >
            <Ionicons name="stop" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.controlsCenter}>
          <View style={styles.speedControlsCenter}>
            <TouchableOpacity style={styles.speedButtonSmall} onPress={onSlower}>
              <Text style={styles.speedTextSmall}>−</Text>
            </TouchableOpacity>
            <Text style={styles.speedValueDisplay}>{rate.toFixed(1)}x</Text>
            <TouchableOpacity style={styles.speedButtonSmall} onPress={onFaster}>
              <Text style={styles.speedTextSmall}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.controlsRight}>
          <TouchableOpacity
            style={styles.controlButtonRight}
            onPress={onPlayPause}
            activeOpacity={0.8}
            accessibilityLabel={listening ? "Pause reading" : "Play reading"}
          >
            <Ionicons
              name={listening ? "pause" : "play"}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#EF4444",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#256E63",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#FFFFFF",
  },
  floatingPlayContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 20,
  },
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
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#256E63",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  controlButtonRight: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#256E63",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  speedControlsCenter: {
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
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#1F2937",
    lineHeight: 24,
  },
  speedValueDisplay: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#1F2937",
    minWidth: 40,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 88,
  },
  chapterHeader: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  chapterTitle: {
    fontSize: 20,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#256E63",
  },
  bookTitle: {
    marginTop: 4,
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#667085",
  },
  readHint: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#667085",
    lineHeight: 18,
  },
  extractHint: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#98A2B3",
  },
  blockRow: {
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  blockNumber: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#256E63",
    marginRight: 12,
    marginTop: 2,
    minWidth: 20,
    textAlign: "right",
  },
  blockTextWrap: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  word: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans-Regular",
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
  chapterDock: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#256E63",
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingTop: 4,
    minHeight: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 30,
  },
  dockNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    minWidth: 52,
  },
  dockNavDisabled: {
    opacity: 0.45,
  },
  dockNavText: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#FFFFFF",
  },
  dockNavTextDisabled: {
    color: "rgba(255,255,255,0.45)",
  },
  dockPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  dockStop: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
  },
});
