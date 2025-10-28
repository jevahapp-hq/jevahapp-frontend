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
import { bibleApiService, BibleChapter } from "../../services/bibleApiService";

interface BibleChapterSelectorProps {
  bookName: string;
  onChapterSelect: (chapter: BibleChapter) => void;
  selectedChapter?: BibleChapter | null;
}

export default function BibleChapterSelector({
  bookName,
  onChapterSelect,
  selectedChapter,
}: BibleChapterSelectorProps) {
  const [chapters, setChapters] = useState<BibleChapter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookName) {
      loadChapters();
    }
  }, [bookName]);

  const loadChapters = async () => {
    try {
      setLoading(true);
      const bookChapters = await bibleApiService.getBookChapters(bookName);

      // Load verse counts for each chapter
      const chaptersWithCounts = await Promise.all(
        bookChapters.map(async (chapter) => {
          try {
            const chapterInfo = await bibleApiService.getChapter(
              bookName,
              chapter.chapterNumber
            );
            return {
              ...chapter,
              verseCount:
                (chapterInfo as any).actualVerseCount ||
                (chapterInfo as any).verseCount ||
                chapter.verseCount,
            };
          } catch (error) {
            console.error(
              `Failed to load verse count for ${bookName} ${chapter.chapterNumber}:`,
              error
            );
            return chapter;
          }
        })
      );

      setChapters(chaptersWithCounts);
    } catch (error) {
      console.error("Failed to load chapters:", error);
      // Fallback to generating chapters based on book name
      setChapters(generateFallbackChapters(bookName));
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackChapters = (bookName: string): BibleChapter[] => {
    // Fallback chapter counts for each book
    const chapterCounts: Record<string, number> = {
      Genesis: 50,
      Exodus: 40,
      Leviticus: 27,
      Numbers: 36,
      Deuteronomy: 34,
      Joshua: 24,
      Judges: 21,
      Ruth: 4,
      "1 Samuel": 31,
      "2 Samuel": 24,
      "1 Kings": 22,
      "2 Kings": 25,
      "1 Chronicles": 29,
      "2 Chronicles": 36,
      Ezra: 10,
      Nehemiah: 13,
      Esther: 10,
      Job: 42,
      Psalms: 150,
      Proverbs: 31,
      Ecclesiastes: 12,
      "Song of Songs": 8,
      Isaiah: 66,
      Jeremiah: 52,
      Lamentations: 5,
      Ezekiel: 48,
      Daniel: 12,
      Hosea: 14,
      Joel: 3,
      Amos: 9,
      Obadiah: 1,
      Jonah: 4,
      Micah: 7,
      Nahum: 3,
      Habakkuk: 3,
      Zephaniah: 3,
      Haggai: 2,
      Zechariah: 14,
      Malachi: 4,
      Matthew: 28,
      Mark: 16,
      Luke: 24,
      John: 21,
      Acts: 28,
      Romans: 16,
      "1 Corinthians": 16,
      "2 Corinthians": 13,
      Galatians: 6,
      Ephesians: 6,
      Philippians: 4,
      Colossians: 4,
      "1 Thessalonians": 5,
      "2 Thessalonians": 3,
      "1 Timothy": 6,
      "2 Timothy": 4,
      Titus: 3,
      Philemon: 1,
      Hebrews: 13,
      James: 5,
      "1 Peter": 5,
      "2 Peter": 3,
      "1 John": 5,
      "2 John": 1,
      "3 John": 1,
      Jude: 1,
      Revelation: 22,
    };

    const chapterCount = chapterCounts[bookName] || 1;
    return Array.from({ length: chapterCount }, (_, i) => ({
      _id: `${bookName}-${i + 1}`,
      bookName,
      chapterNumber: i + 1,
      verseCount: 0, // Will be loaded when chapter is selected
    }));
  };

  const renderChapterItem = ({ item }: { item: BibleChapter }) => {
    const isSelected = selectedChapter?.chapterNumber === item.chapterNumber;

    return (
      <TouchableOpacity
        style={[styles.chapterItem, isSelected && styles.selectedChapterItem]}
        onPress={() => onChapterSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.chapterContent}>
          <Text
            style={[
              styles.chapterNumber,
              isSelected && styles.selectedChapterNumber,
            ]}
          >
            {item.chapterNumber}
          </Text>
          <Text
            style={[styles.verseCount, isSelected && styles.selectedVerseCount]}
          >
            {item.verseCount > 0
              ? `${item.verseCount} ${
                  item.verseCount === 1 ? "verse" : "verses"
                }`
              : "—"}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color="#256E63" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#256E63" />
        <Text style={styles.loadingText}>Loading chapters...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chapters in {bookName}</Text>
        <Text style={styles.headerSubtitle}>
          {chapters.length} chapter{chapters.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={chapters}
        renderItem={renderChapterItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chaptersList}
        numColumns={3}
        columnWrapperStyle={styles.chapterRow}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontFamily: "Rubik_400Regular",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
  },
  chaptersList: {
    padding: 16,
  },
  chapterRow: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chapterItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flex: 1,
    marginHorizontal: 4,
    minHeight: 80,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedChapterItem: {
    backgroundColor: "#F0FDF4",
    borderColor: "#256E63",
    borderWidth: 2,
  },
  chapterContent: {
    alignItems: "center",
  },
  chapterNumber: {
    fontSize: 24,
    fontFamily: "Rubik_700Bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  selectedChapterNumber: {
    color: "#256E63",
  },
  verseCount: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
    textAlign: "center",
  },
  selectedVerseCount: {
    color: "#059669",
  },
});
