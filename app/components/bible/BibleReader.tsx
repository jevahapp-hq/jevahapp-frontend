import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BibleVerse, bibleApiService } from "../../services/bibleApiService";

interface BibleReaderProps {
  bookName: string;
  chapterNumber: number;
  onNavigateChapter: (direction: "prev" | "next") => void;
  canNavigatePrev: boolean;
  canNavigateNext: boolean;
}

export default function BibleReader({
  bookName,
  chapterNumber,
  onNavigateChapter,
  canNavigatePrev,
  canNavigateNext,
}: BibleReaderProps) {
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVerses();
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

  const renderVerse = ({ item }: { item: BibleVerse }) => (
    <View style={styles.verseContainer}>
      <Text style={styles.verseNumber}>{item.verseNumber}</Text>
      <Text style={styles.verseText}>{item.text}</Text>
    </View>
  );

  const renderNavigationControls = () => (
    <View style={styles.navigationContainer}>
      <TouchableOpacity
        style={[styles.navButton, !canNavigatePrev && styles.navButtonDisabled]}
        onPress={() => onNavigateChapter("prev")}
        disabled={!canNavigatePrev}
      >
        <Ionicons
          name="chevron-back"
          size={20}
          color={canNavigatePrev ? "#256E63" : "#9CA3AF"}
        />
        <Text
          style={[
            styles.navButtonText,
            !canNavigatePrev && styles.navButtonTextDisabled,
          ]}
        >
          Previous Chapter
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navButton, !canNavigateNext && styles.navButtonDisabled]}
        onPress={() => onNavigateChapter("next")}
        disabled={!canNavigateNext}
      >
        <Text
          style={[
            styles.navButtonText,
            !canNavigateNext && styles.navButtonTextDisabled,
          ]}
        >
          Next Chapter
        </Text>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={canNavigateNext ? "#256E63" : "#9CA3AF"}
        />
      </TouchableOpacity>
    </View>
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
      <FlatList
        data={verses}
        renderItem={renderVerse}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.versesContainer}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={renderNavigationControls}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
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
    paddingBottom: 100,
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
