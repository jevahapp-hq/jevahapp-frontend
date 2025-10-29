import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BibleVerse, bibleApiService } from "../../services/bibleApiService";

interface BibleReaderRedesignedProps {
  bookName: string;
  chapterNumber: number;
  onBack: () => void;
  onNavigateChapter: (direction: "prev" | "next") => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
  onBookChapterPress: () => void;
  onTranslationPress: () => void;
  translation?: string;
}

export default function BibleReaderRedesigned({
  bookName,
  chapterNumber,
  onBack,
  onNavigateChapter,
  canNavigatePrev,
  canNavigateNext,
  onBookChapterPress,
  onTranslationPress,
  translation = "NIV",
}: BibleReaderRedesignedProps) {
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [chapterTitle, setChapterTitle] = useState<string>("");

  useEffect(() => {
    loadVerses();
    loadChapterTitle();
  }, [bookName, chapterNumber]);

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

  const loadChapterTitle = async () => {
    try {
      // Try to get chapter title/metadata
      const chapter = await bibleApiService.getChapter(bookName, chapterNumber);
      if ((chapter as any).title) {
        setChapterTitle((chapter as any).title);
      }
    } catch (err) {
      // Use default titles for known chapters
      if (bookName === "Philippians" && chapterNumber === 2) {
        setChapterTitle("Imitating Christ's Humility");
      }
    }
  };

  const handleAudioToggle = () => {
    setIsPlayingAudio(!isPlayingAudio);
    // TODO: Implement audio playback
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#256E63" />
        <Text style={styles.loadingText}>Loading verses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVerses}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onBookChapterPress}
          style={styles.bookChapterButton}
        >
          <Text style={styles.bookChapterText}>
            {bookName} {chapterNumber}
          </Text>
        </TouchableOpacity>

        <View style={styles.rightButtons}>
          <TouchableOpacity
            onPress={onTranslationPress}
            style={styles.translationButton}
          >
            <Text style={styles.translationText}>{translation}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="bookmark-outline" size={24} color="#256E63" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="search-outline" size={24} color="#256E63" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="settings-outline" size={24} color="#256E63" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Chapter Title */}
        {chapterTitle && (
          <Text style={styles.chapterTitle}>{chapterTitle}</Text>
        )}

        {/* Verses */}
        {verses.map((verse, index) => (
          <View key={verse._id || index} style={styles.verseContainer}>
            <Text style={styles.verseNumber}>{verse.verseNumber}</Text>
            <Text style={styles.verseText}>
              {verse.text}
              {/* Handle footnotes if present */}
              {(verse as any).footnotes?.map((fn: string, i: number) => (
                <Text key={i} style={styles.footnote}>
                  {fn}
                </Text>
              ))}
            </Text>
          </View>
        ))}

        {/* Sub-headings */}
        {verses.some((v) => (v as any).isSubHeading) && (
          <>
            {verses
              .filter((v) => (v as any).isSubHeading)
              .map((verse) => (
                <Text key={verse._id} style={styles.subHeading}>
                  {verse.text}
                </Text>
              ))}
          </>
        )}
      </ScrollView>

      {/* Center audio overlay removed to avoid obstructing reading; floating nav handles play */}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[
            styles.navButton,
            !canNavigatePrev && styles.navButtonDisabled,
          ]}
          onPress={() => canNavigatePrev && onNavigateChapter("prev")}
          disabled={!canNavigatePrev}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={canNavigatePrev ? "#6B7280" : "#D1D5DB"}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navButton,
            !canNavigateNext && styles.navButtonDisabled,
          ]}
          onPress={() => canNavigateNext && onNavigateChapter("next")}
          disabled={!canNavigateNext}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={canNavigateNext ? "#6B7280" : "#D1D5DB"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topNav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  bookChapterButton: {
    backgroundColor: "#E6F2F1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  bookChapterText: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: "#256E63",
  },
  rightButtons: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    gap: 8,
  },
  translationButton: {
    backgroundColor: "#E6F2F1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  translationText: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: "#256E63",
  },
  iconButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  chapterTitle: {
    fontSize: 22,
    fontFamily: "Rubik_600SemiBold",
    fontStyle: "italic",
    color: "#374151",
    marginBottom: 24,
    lineHeight: 32,
  },
  verseContainer: {
    flexDirection: "row",
    marginBottom: 16,
    paddingRight: 8,
  },
  verseNumber: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: "#6B7280",
    marginRight: 12,
    marginTop: 2,
    minWidth: 24,
  },
  verseText: {
    flex: 1,
    fontSize: 17,
    fontFamily: "Rubik_400Regular",
    color: "#1F2937",
    lineHeight: 28,
  },
  footnote: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  subHeading: {
    fontSize: 18,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
    marginTop: 24,
    marginBottom: 16,
  },
  audioButtonContainer: {
    position: "absolute",
    top: "45%",
    left: "50%",
    transform: [{ translateX: -40 }, { translateY: -40 }],
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FEF7ED",
    borderTopWidth: 1,
    borderTopColor: "#FED7AA",
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    backgroundColor: "#FFFFFF",
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
});
