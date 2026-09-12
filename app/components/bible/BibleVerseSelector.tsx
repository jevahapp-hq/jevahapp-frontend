import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { bibleApiService, BibleVerse } from "../../services/bibleApiService";

interface BibleVerseSelectorProps {
  bookName: string;
  chapterNumber: number;
  onVerseSelect: (verseNumber: number, verses: BibleVerse[]) => void;
  onBack?: () => void;
  selectedVerseNumber?: number | null;
}

export default function BibleVerseSelector({
  bookName,
  chapterNumber,
  onVerseSelect,
  onBack,
  selectedVerseNumber,
}: BibleVerseSelectorProps) {
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (bookName && chapterNumber) {
      loadVerses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookName, chapterNumber]);

  const loadVerses = async () => {
    try {
      setLoading(true);
      setError(null);
      const chapterVerses = await bibleApiService.getChapterVerses(
        bookName,
        chapterNumber
      );
      if (!isMountedRef.current) return;
      setVerses(chapterVerses);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load verses:", err);
      if (!isMountedRef.current) return;
      setError("Failed to load verses. Please try again.");
      setLoading(false);
    }
  };

  const renderVerseItem = ({ item }: { item: BibleVerse }) => {
    const isSelected = selectedVerseNumber === item.verseNumber;

    return (
      <TouchableOpacity
        style={[styles.verseRow, isSelected && styles.selectedVerseRow]}
        onPress={() => onVerseSelect(item.verseNumber, verses)}
        activeOpacity={0.7}
      >
        <View style={styles.verseBadge}>
          <Text style={styles.verseBadgeText}>{item.verseNumber}</Text>
        </View>
        <Text style={styles.versePreview} numberOfLines={2} ellipsizeMode="tail">
          {item.text}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </TouchableOpacity>
    );
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
      <View style={styles.loadingContainer}>
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
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerBackButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#256E63" />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.headerTitle}>
            {bookName} {chapterNumber}
          </Text>
          <Text style={styles.headerSubtitle}>
            {verses.length} verse{verses.length !== 1 ? "s" : ""} • Select a
            verse to start reading
          </Text>
        </View>
      </View>

      <FlatList
        data={verses}
        renderItem={renderVerseItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.versesList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FCFCFD",
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontFamily: "Rubik_400Regular",
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  headerBackButton: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Rubik_700Bold",
    color: "#1F2937",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
  },
  versesList: {
    padding: 16,
  },
  verseRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedVerseRow: {
    borderColor: "#256E63",
    borderWidth: 2,
    backgroundColor: "#F0FDF4",
  },
  verseBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#256E63",
    alignItems: "center",
    justifyContent: "center",
  },
  verseBadgeText: {
    fontSize: 13,
    fontFamily: "Rubik_600SemiBold",
    color: "#FFFFFF",
  },
  versePreview: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    color: "#1F2937",
    lineHeight: 21,
  },
});
