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
import { bibleApiService, BibleBook } from "../../services/bibleApiService";

interface BibleBookSelectorProps {
  onBookSelect: (book: BibleBook) => void;
  selectedBook?: BibleBook | null;
}

export default function BibleBookSelector({
  onBookSelect,
  selectedBook,
}: BibleBookSelectorProps) {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTestament, setSelectedTestament] = useState<
    "all" | "old" | "new"
  >("all");
  const [filteredBooks, setFilteredBooks] = useState<BibleBook[]>([]);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    filterBooks();
  }, [books, selectedTestament]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const allBooks = await bibleApiService.getAllBooks();
      setBooks(allBooks);
    } catch (error) {
      console.error("Failed to load books:", error);
      // Fallback to hardcoded books if API fails
      setBooks(getFallbackBooks());
    } finally {
      setLoading(false);
    }
  };

  const filterBooks = () => {
    if (selectedTestament === "all") {
      setFilteredBooks(books);
    } else {
      setFilteredBooks(
        books.filter((book) => book.testament === selectedTestament)
      );
    }
  };

  const getFallbackBooks = (): BibleBook[] => {
    // Fallback data in case API is not available
    return [
      // Old Testament
      {
        _id: "1",
        name: "Genesis",
        testament: "old",
        chapterCount: 50,
        verseCount: 1533,
      },
      {
        _id: "2",
        name: "Exodus",
        testament: "old",
        chapterCount: 40,
        verseCount: 1213,
      },
      {
        _id: "3",
        name: "Leviticus",
        testament: "old",
        chapterCount: 27,
        verseCount: 859,
      },
      {
        _id: "4",
        name: "Numbers",
        testament: "old",
        chapterCount: 36,
        verseCount: 1288,
      },
      {
        _id: "5",
        name: "Deuteronomy",
        testament: "old",
        chapterCount: 34,
        verseCount: 959,
      },
      {
        _id: "6",
        name: "Joshua",
        testament: "old",
        chapterCount: 24,
        verseCount: 658,
      },
      {
        _id: "7",
        name: "Judges",
        testament: "old",
        chapterCount: 21,
        verseCount: 618,
      },
      {
        _id: "8",
        name: "Ruth",
        testament: "old",
        chapterCount: 4,
        verseCount: 85,
      },
      {
        _id: "9",
        name: "1 Samuel",
        testament: "old",
        chapterCount: 31,
        verseCount: 810,
      },
      {
        _id: "10",
        name: "2 Samuel",
        testament: "old",
        chapterCount: 24,
        verseCount: 695,
      },
      {
        _id: "11",
        name: "1 Kings",
        testament: "old",
        chapterCount: 22,
        verseCount: 816,
      },
      {
        _id: "12",
        name: "2 Kings",
        testament: "old",
        chapterCount: 25,
        verseCount: 719,
      },
      {
        _id: "13",
        name: "1 Chronicles",
        testament: "old",
        chapterCount: 29,
        verseCount: 942,
      },
      {
        _id: "14",
        name: "2 Chronicles",
        testament: "old",
        chapterCount: 36,
        verseCount: 822,
      },
      {
        _id: "15",
        name: "Ezra",
        testament: "old",
        chapterCount: 10,
        verseCount: 280,
      },
      {
        _id: "16",
        name: "Nehemiah",
        testament: "old",
        chapterCount: 13,
        verseCount: 406,
      },
      {
        _id: "17",
        name: "Esther",
        testament: "old",
        chapterCount: 10,
        verseCount: 167,
      },
      {
        _id: "18",
        name: "Job",
        testament: "old",
        chapterCount: 42,
        verseCount: 1070,
      },
      {
        _id: "19",
        name: "Psalms",
        testament: "old",
        chapterCount: 150,
        verseCount: 2461,
      },
      {
        _id: "20",
        name: "Proverbs",
        testament: "old",
        chapterCount: 31,
        verseCount: 915,
      },
      {
        _id: "21",
        name: "Ecclesiastes",
        testament: "old",
        chapterCount: 12,
        verseCount: 222,
      },
      {
        _id: "22",
        name: "Song of Songs",
        testament: "old",
        chapterCount: 8,
        verseCount: 117,
      },
      {
        _id: "23",
        name: "Isaiah",
        testament: "old",
        chapterCount: 66,
        verseCount: 1292,
      },
      {
        _id: "24",
        name: "Jeremiah",
        testament: "old",
        chapterCount: 52,
        verseCount: 1364,
      },
      {
        _id: "25",
        name: "Lamentations",
        testament: "old",
        chapterCount: 5,
        verseCount: 154,
      },
      {
        _id: "26",
        name: "Ezekiel",
        testament: "old",
        chapterCount: 48,
        verseCount: 1273,
      },
      {
        _id: "27",
        name: "Daniel",
        testament: "old",
        chapterCount: 12,
        verseCount: 357,
      },
      {
        _id: "28",
        name: "Hosea",
        testament: "old",
        chapterCount: 14,
        verseCount: 197,
      },
      {
        _id: "29",
        name: "Joel",
        testament: "old",
        chapterCount: 3,
        verseCount: 73,
      },
      {
        _id: "30",
        name: "Amos",
        testament: "old",
        chapterCount: 9,
        verseCount: 146,
      },
      {
        _id: "31",
        name: "Obadiah",
        testament: "old",
        chapterCount: 1,
        verseCount: 21,
      },
      {
        _id: "32",
        name: "Jonah",
        testament: "old",
        chapterCount: 4,
        verseCount: 48,
      },
      {
        _id: "33",
        name: "Micah",
        testament: "old",
        chapterCount: 7,
        verseCount: 105,
      },
      {
        _id: "34",
        name: "Nahum",
        testament: "old",
        chapterCount: 3,
        verseCount: 47,
      },
      {
        _id: "35",
        name: "Habakkuk",
        testament: "old",
        chapterCount: 3,
        verseCount: 56,
      },
      {
        _id: "36",
        name: "Zephaniah",
        testament: "old",
        chapterCount: 3,
        verseCount: 53,
      },
      {
        _id: "37",
        name: "Haggai",
        testament: "old",
        chapterCount: 2,
        verseCount: 38,
      },
      {
        _id: "38",
        name: "Zechariah",
        testament: "old",
        chapterCount: 14,
        verseCount: 211,
      },
      {
        _id: "39",
        name: "Malachi",
        testament: "old",
        chapterCount: 4,
        verseCount: 55,
      },

      // New Testament
      {
        _id: "40",
        name: "Matthew",
        testament: "new",
        chapterCount: 28,
        verseCount: 1071,
      },
      {
        _id: "41",
        name: "Mark",
        testament: "new",
        chapterCount: 16,
        verseCount: 678,
      },
      {
        _id: "42",
        name: "Luke",
        testament: "new",
        chapterCount: 24,
        verseCount: 1151,
      },
      {
        _id: "43",
        name: "John",
        testament: "new",
        chapterCount: 21,
        verseCount: 879,
      },
      {
        _id: "44",
        name: "Acts",
        testament: "new",
        chapterCount: 28,
        verseCount: 1007,
      },
      {
        _id: "45",
        name: "Romans",
        testament: "new",
        chapterCount: 16,
        verseCount: 433,
      },
      {
        _id: "46",
        name: "1 Corinthians",
        testament: "new",
        chapterCount: 16,
        verseCount: 437,
      },
      {
        _id: "47",
        name: "2 Corinthians",
        testament: "new",
        chapterCount: 13,
        verseCount: 257,
      },
      {
        _id: "48",
        name: "Galatians",
        testament: "new",
        chapterCount: 6,
        verseCount: 149,
      },
      {
        _id: "49",
        name: "Ephesians",
        testament: "new",
        chapterCount: 6,
        verseCount: 155,
      },
      {
        _id: "50",
        name: "Philippians",
        testament: "new",
        chapterCount: 4,
        verseCount: 104,
      },
      {
        _id: "51",
        name: "Colossians",
        testament: "new",
        chapterCount: 4,
        verseCount: 95,
      },
      {
        _id: "52",
        name: "1 Thessalonians",
        testament: "new",
        chapterCount: 5,
        verseCount: 89,
      },
      {
        _id: "53",
        name: "2 Thessalonians",
        testament: "new",
        chapterCount: 3,
        verseCount: 47,
      },
      {
        _id: "54",
        name: "1 Timothy",
        testament: "new",
        chapterCount: 6,
        verseCount: 113,
      },
      {
        _id: "55",
        name: "2 Timothy",
        testament: "new",
        chapterCount: 4,
        verseCount: 83,
      },
      {
        _id: "56",
        name: "Titus",
        testament: "new",
        chapterCount: 3,
        verseCount: 46,
      },
      {
        _id: "57",
        name: "Philemon",
        testament: "new",
        chapterCount: 1,
        verseCount: 25,
      },
      {
        _id: "58",
        name: "Hebrews",
        testament: "new",
        chapterCount: 13,
        verseCount: 303,
      },
      {
        _id: "59",
        name: "James",
        testament: "new",
        chapterCount: 5,
        verseCount: 108,
      },
      {
        _id: "60",
        name: "1 Peter",
        testament: "new",
        chapterCount: 5,
        verseCount: 105,
      },
      {
        _id: "61",
        name: "2 Peter",
        testament: "new",
        chapterCount: 3,
        verseCount: 61,
      },
      {
        _id: "62",
        name: "1 John",
        testament: "new",
        chapterCount: 5,
        verseCount: 105,
      },
      {
        _id: "63",
        name: "2 John",
        testament: "new",
        chapterCount: 1,
        verseCount: 13,
      },
      {
        _id: "64",
        name: "3 John",
        testament: "new",
        chapterCount: 1,
        verseCount: 14,
      },
      {
        _id: "65",
        name: "Jude",
        testament: "new",
        chapterCount: 1,
        verseCount: 25,
      },
      {
        _id: "66",
        name: "Revelation",
        testament: "new",
        chapterCount: 22,
        verseCount: 404,
      },
    ];
  };

  const renderTestamentFilter = () => (
    <View style={styles.testamentFilter}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          selectedTestament === "all" && styles.activeFilterButton,
        ]}
        onPress={() => setSelectedTestament("all")}
      >
        <Text
          style={[
            styles.filterButtonText,
            selectedTestament === "all" && styles.activeFilterButtonText,
          ]}
        >
          All Books
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          selectedTestament === "old" && styles.activeFilterButton,
        ]}
        onPress={() => setSelectedTestament("old")}
      >
        <Text
          style={[
            styles.filterButtonText,
            selectedTestament === "old" && styles.activeFilterButtonText,
          ]}
        >
          Old Testament
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.filterButton,
          selectedTestament === "new" && styles.activeFilterButton,
        ]}
        onPress={() => setSelectedTestament("new")}
      >
        <Text
          style={[
            styles.filterButtonText,
            selectedTestament === "new" && styles.activeFilterButtonText,
          ]}
        >
          New Testament
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderBookItem = ({ item }: { item: BibleBook }) => {
    const isSelected = selectedBook?._id === item._id;

    return (
      <TouchableOpacity
        style={[styles.bookItem, isSelected && styles.selectedBookItem]}
        onPress={() => onBookSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.bookContent}>
          <View style={styles.bookHeader}>
            <Text
              style={[styles.bookName, isSelected && styles.selectedBookName]}
            >
              {item.name}
            </Text>
            <View
              style={[
                styles.testamentBadge,
                item.testament === "old"
                  ? styles.oldTestamentBadge
                  : styles.newTestamentBadge,
              ]}
            >
              <Text style={styles.testamentBadgeText}>
                {item.testament === "old" ? "OT" : "NT"}
              </Text>
            </View>
          </View>
          <View style={styles.bookStats}>
            <View style={styles.statItem}>
              <Ionicons name="book-outline" size={14} color="#6B7280" />
              <Text style={styles.statText}>{item.chapterCount} chapters</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons
                name="document-text-outline"
                size={14}
                color="#6B7280"
              />
              <Text style={styles.statText}>{item.verseCount} verses</Text>
            </View>
          </View>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#256E63" />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#256E63" />
        <Text style={styles.loadingText}>Loading Bible books...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderTestamentFilter()}
      <FlatList
        data={filteredBooks}
        renderItem={renderBookItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.booksList}
        numColumns={1}
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
  testamentFilter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeFilterButton: {
    backgroundColor: "#256E63",
    borderColor: "#256E63",
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    color: "#6B7280",
  },
  activeFilterButtonText: {
    color: "#FFFFFF",
  },
  booksList: {
    padding: 16,
  },
  bookItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedBookItem: {
    backgroundColor: "#F0FDF4",
    borderColor: "#256E63",
    borderWidth: 2,
  },
  bookContent: {
    flex: 1,
  },
  bookHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  bookName: {
    fontSize: 18,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
    flex: 1,
  },
  selectedBookName: {
    color: "#256E63",
  },
  testamentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  oldTestamentBadge: {
    backgroundColor: "#FEF3C7",
  },
  newTestamentBadge: {
    backgroundColor: "#DBEAFE",
  },
  testamentBadgeText: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
    color: "#374151",
  },
  bookStats: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
  },
});


