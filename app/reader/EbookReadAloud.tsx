import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { TapGestureHandler } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BibleFontSheet from "../components/bible/BibleFontSheet";
import BibleVoiceSheet from "../components/bible/BibleVoiceSheet";
import { BIBLE_NARRATORS } from "../services/bibleNarrationApi";
import { useBibleReadingStyle } from "../utils/bibleReadingStyle";
import {
  EbookChapter,
  firstReadableChapter,
  nextReadableChapter,
  prevReadableChapter,
  readableChapterAtOrAfter,
  splitWords,
} from "./pdfText/buildEbookChapters";
import { useEbookNarration } from "./useEbookNarration";

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
  const reading = useBibleReadingStyle();
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fontOpen, setFontOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const chromeTapAt = useRef(0);
  const requestedStart = Math.max(1, startChapterNumber || 1);
  const first = firstReadableChapter(chapters);
  const [chapterNumber, setChapterNumber] = useState(requestedStart);
  const flatListRef = useRef<FlatList>(null);
  const autoPlayedRef = useRef(false);
  const pendingPlayRef = useRef(false);

  const chapter = chapters.find((c) => c.chapterNumber === chapterNumber);
  const blocks = chapter?.blocks ?? [];
  const chaptersRef = useRef(chapters);
  chaptersRef.current = chapters;
  const chapterNumberRef = useRef(chapterNumber);
  chapterNumberRef.current = chapterNumber;

  const applyChapter = useCallback(
    (next: number, play: boolean) => {
      setChapterNumber(next);
      onChapterChange?.(next);
      pendingPlayRef.current = play;
    },
    [onChapterChange]
  );

  const narration = useEbookNarration({
    blocks,
    chapterNumber,
    onChapterEnded: () => {
      const nxt = nextReadableChapter(
        chaptersRef.current,
        chapterNumberRef.current
      );
      if (!nxt) return;
      applyChapter(nxt.chapterNumber, true);
    },
  });

  const listening = narration.isPlaying;
  const playFromBlockRef = useRef(narration.playFromBlock);
  playFromBlockRef.current = narration.playFromBlock;

  useEffect(() => {
    if (narration.activeBlockIndex == null) return;
    flatListRef.current?.scrollToIndex({
      index: narration.activeBlockIndex,
      animated: false,
      viewPosition: 0.28,
    });
  }, [narration.activeBlockIndex]);

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
    if (blocks.length === 0) return;
    const timer = setTimeout(() => {
      autoPlayedRef.current = true;
      void playFromBlockRef.current(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [blocks.length, chapterNumber, chapters, requestedStart, status]);

  useEffect(() => {
    if (!pendingPlayRef.current) return;
    if (blocks.length === 0) return;
    pendingPlayRef.current = false;
    const timer = setTimeout(() => {
      void playFromBlockRef.current(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [blocks.length, chapterNumber]);

  const handleSelectVoice = (id: string) => {
    narration.setReader(id);
  };

  const toggleChrome = () => {
    const now = Date.now();
    if (now - chromeTapAt.current < 700) return;
    chromeTapAt.current = now;
    setControlsVisible((visible) => !visible);
  };

  const handlePlayPause = async () => {
    if (narration.preparing || blocks.length === 0) return;
    await narration.togglePlayback();
  };

  const handleStop = async () => {
    await narration.stop();
  };

  const goPrev = () => {
    const prev = prevReadableChapter(chapters, chapterNumber);
    if (!prev) return;
    void narration.stop();
    applyChapter(prev.chapterNumber, listening);
  };

  const goNext = () => {
    const nxt = nextReadableChapter(chapters, chapterNumber);
    if (!nxt) return;
    void narration.stop();
    applyChapter(nxt.chapterNumber, listening);
  };

  const onBlockPress = (_index: number) => {
    if (Date.now() - chromeTapAt.current < 500) return;
  };

  const renderBlock = ({ item, index }: { item: string; index: number }) => {
    const words = splitWords(item);
    const isCurrent = narration.activeBlockIndex === index;
    const verseType = {
      fontFamily: reading.fontFamily,
      fontSize: reading.fontSize,
      lineHeight: reading.lineHeight,
    };
    return (
      <TouchableOpacity
        style={[styles.blockRow, isCurrent && styles.blockActive]}
        activeOpacity={listening ? 0.7 : 1}
        onPress={() => onBlockPress(index)}
        onLongPress={() => {
          if (Date.now() - chromeTapAt.current < 700) return;
          void narration.playFromBlock(index);
        }}
      >
        <Text style={styles.blockNumber}>{index + 1}</Text>
        <View style={styles.blockTextWrap}>
          {words.map((word, wordIndex) => (
              <Text
                key={`${index}-${wordIndex}`}
                style={[styles.word, verseType]}
              >
                {word}{" "}
              </Text>
            ))}
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
      <TapGestureHandler numberOfTaps={2} onActivated={toggleChrome}>
        <View style={{ flex: 1 }} collapsable={false}>
      <FlatList
        ref={flatListRef}
        data={blocks}
        renderItem={renderBlock}
        keyExtractor={(_, index) => `${chapterNumber}-${index}`}
        extraData={`${narration.activeBlockIndex ?? ""}-${reading.fontId}-${reading.fontSize}`}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: controlsVisible ? 108 : 56, paddingBottom: controlsVisible ? 88 + dockPad : 24 },
        ]}
        showsVerticalScrollIndicator={false}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
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
              {narration.preparing
                ? "Preparing the narrator…"
                : narration.error
                ? narration.error
                : listening
                ? "Double-tap the page to hide the player"
                : narration.isPaused
                ? "Paused — press play to continue"
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
        </View>
      </TapGestureHandler>

      <View style={styles.toolRow}>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => {
            setFontOpen(false);
            setVoiceOpen(true);
          }}
          accessibilityLabel="Choose voice"
        >
          <Ionicons name="mic-outline" size={18} color="#1F2937" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={() => {
            setVoiceOpen(false);
            setFontOpen(true);
          }}
          accessibilityLabel="Text style"
        >
          <Text style={[styles.toolAa, { fontFamily: reading.fontFamily }]}>Aa</Text>
        </TouchableOpacity>
      </View>

      {controlsVisible ? (
      <View style={styles.floatingPlayContainer} pointerEvents="box-none">
        {Platform.OS !== "web" ? (
          <View style={styles.glassBar}>
            <BlurView
              pointerEvents="none"
              intensity={80}
              tint="light"
              style={StyleSheet.absoluteFill}
            />
            <TransportBar
              listening={listening}
              preparing={narration.preparing}
              rate={narration.rate}
              onStop={handleStop}
              onPlayPause={handlePlayPause}
              onSlower={() => narration.setRate(Math.max(0.5, narration.rate - 0.25))}
              onFaster={() => narration.setRate(Math.min(2.0, narration.rate + 0.25))}
            />
          </View>
        ) : (
          <View style={[styles.glassBar, styles.glassBarWeb]}>
            <TransportBar
              listening={listening}
              preparing={narration.preparing}
              rate={narration.rate}
              onStop={handleStop}
              onPlayPause={handlePlayPause}
              onSlower={() => narration.setRate(Math.max(0.5, narration.rate - 0.25))}
              onFaster={() => narration.setRate(Math.min(2.0, narration.rate + 0.25))}
            />
          </View>
        )}
      </View>
      ) : null}

      {controlsVisible ? (
      <View
        style={[styles.chapterDock, { paddingBottom: dockPad }]}
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
          {narration.preparing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={listening ? "pause" : "play"}
              size={22}
              color="#FFFFFF"
            />
          )}
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
      ) : null}
      <BibleFontSheet visible={fontOpen} onClose={() => setFontOpen(false)} />
      <BibleVoiceSheet
        visible={voiceOpen}
        voices={BIBLE_NARRATORS.map((voice) => ({
          id: voice.id,
          name: voice.name,
          description: "Narrator",
        }))}
        selectedId={narration.readerId}
        onSelect={handleSelectVoice}
        onClose={() => setVoiceOpen(false)}
      />
    </View>
  );
}

function TransportBar({
  listening,
  preparing,
  rate,
  onStop,
  onPlayPause,
  onSlower,
  onFaster,
}: {
  listening: boolean;
  preparing: boolean;
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
            {preparing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name={listening ? "pause" : "play"}
                size={24}
                color="#FFFFFF"
              />
            )}
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
    top: 56,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 30,
    elevation: 30,
  },
  toolRow: {
    position: "absolute",
    top: 12,
    right: 16,
    flexDirection: "row",
    gap: 8,
    zIndex: 31,
    elevation: 31,
  },
  toolButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  toolAa: {
    fontSize: 16,
    color: "#1F2937",
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
    paddingTop: 156,
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
    paddingVertical: 4,
    borderRadius: 10,
  },
  blockActive: {
    backgroundColor: "#FDE68A",
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
    zIndex: 30,
    elevation: 30,
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
