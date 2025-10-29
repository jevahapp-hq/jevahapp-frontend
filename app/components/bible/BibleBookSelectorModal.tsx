import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import {
  bibleApiService,
  BibleBook,
  BibleChapter,
  BibleVerse,
} from "../../services/bibleApiService";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

interface BibleBookSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onBookSelect: (book: BibleBook) => void;
  onChapterSelect?: (book: BibleBook, chapter: BibleChapter) => void;
  onVerseSelect?: (
    book: BibleBook,
    chapter: BibleChapter,
    verse: BibleVerse
  ) => void;
  selectedBook?: BibleBook | null;
}

type ViewMode = "books" | "history";
type SortMode = "traditional" | "alphabetical";

export default function BibleBookSelectorModal({
  visible,
  onClose,
  onBookSelect,
  onChapterSelect,
  onVerseSelect,
  selectedBook,
}: BibleBookSelectorModalProps) {
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("books");
  const [sortMode, setSortMode] = useState<SortMode>("traditional");
  const [filteredBooks, setFilteredBooks] = useState<BibleBook[]>([]);
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );
  const [bookChapters, setBookChapters] = useState<
    Record<string, BibleChapter[]>
  >({});
  const [chapterVerses, setChapterVerses] = useState<
    Record<string, BibleVerse[]>
  >({});
  const [loadingChapters, setLoadingChapters] = useState<
    Record<string, boolean>
  >({});
  const [loadingVerses, setLoadingVerses] = useState<Record<string, boolean>>(
    {}
  );

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const lastTranslateY = useSharedValue(0);

  useEffect(() => {
    loadBooks();
  }, []);

  useEffect(() => {
    filterAndSortBooks();
  }, [books, sortMode]);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 100,
      });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const loadBooks = async () => {
    try {
      setLoading(true);
      const allBooks = await bibleApiService.getAllBooks();
      setBooks(allBooks);
    } catch (error) {
      console.error("Failed to load books:", error);
      setBooks(getFallbackBooks());
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortBooks = () => {
    let sorted = [...books];

    if (sortMode === "alphabetical") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Traditional order (already in correct order from API/fallback)
      sorted = books;
    }

    setFilteredBooks(sorted);
  };

  const getFallbackBooks = (): BibleBook[] => {
    return [
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
        name: "Song of Solomon",
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

  const handleClose = () => {
    translateY.value = withSpring(SCREEN_HEIGHT, {
      damping: 20,
      stiffness: 100,
    });
    setTimeout(() => onClose(), 200);
  };

  const handleChevronPress = async (book: BibleBook) => {
    const isExpanded = expandedBooks.has(book._id);

    if (isExpanded) {
      // Collapse
      const newExpanded = new Set(expandedBooks);
      newExpanded.delete(book._id);
      setExpandedBooks(newExpanded);
    } else {
      // Expand - load chapters if not already loaded
      const newExpanded = new Set(expandedBooks);
      newExpanded.add(book._id);
      setExpandedBooks(newExpanded);

      if (!bookChapters[book._id]) {
        setLoadingChapters((prev) => ({ ...prev, [book._id]: true }));
        try {
          const chapters = await bibleApiService.getBookChapters(book.name);
          setBookChapters((prev) => ({ ...prev, [book._id]: chapters }));
        } catch (error) {
          console.error("Failed to load chapters:", error);
          // Generate fallback chapters
          const fallbackChapters: BibleChapter[] = Array.from(
            { length: book.chapterCount },
            (_, i) => ({
              _id: `${book.name}-${i + 1}`,
              bookName: book.name,
              chapterNumber: i + 1,
              verseCount: 0,
            })
          );
          setBookChapters((prev) => ({
            ...prev,
            [book._id]: fallbackChapters,
          }));
        } finally {
          setLoadingChapters((prev) => ({ ...prev, [book._id]: false }));
        }
      }
    }
  };

  const handleChapterChevronPress = async (
    book: BibleBook,
    chapter: BibleChapter
  ) => {
    const chapterKey = `${book._id}-${chapter.chapterNumber}`;
    const isExpanded = expandedChapters.has(chapterKey);

    if (isExpanded) {
      // Collapse
      const newExpanded = new Set(expandedChapters);
      newExpanded.delete(chapterKey);
      setExpandedChapters(newExpanded);
    } else {
      // Expand - load verses if not already loaded
      const newExpanded = new Set(expandedChapters);
      newExpanded.add(chapterKey);
      setExpandedChapters(newExpanded);

      if (!chapterVerses[chapterKey]) {
        setLoadingVerses((prev) => ({ ...prev, [chapterKey]: true }));
        try {
          const verses = await bibleApiService.getChapterVerses(
            book.name,
            chapter.chapterNumber
          );
          setChapterVerses((prev) => ({ ...prev, [chapterKey]: verses }));
        } catch (error) {
          console.error("Failed to load verses:", error);
          // Generate fallback verses based on verseCount
          const fallbackVerses: BibleVerse[] = Array.from(
            { length: chapter.verseCount || 50 },
            (_, i) => ({
              _id: `${book.name}-${chapter.chapterNumber}-${i + 1}`,
              bookName: book.name,
              chapterNumber: chapter.chapterNumber,
              verseNumber: i + 1,
              text: "",
            })
          );
          setChapterVerses((prev) => ({
            ...prev,
            [chapterKey]: fallbackVerses,
          }));
        } finally {
          setLoadingVerses((prev) => ({ ...prev, [chapterKey]: false }));
        }
      }
    }
  };

  const handleChapterSelect = (book: BibleBook, chapter: BibleChapter) => {
    if (onChapterSelect) {
      // Use chapter select callback if provided
      onChapterSelect(book, chapter);
    } else {
      // Otherwise just select the book
      onBookSelect(book);
    }
    handleClose();
  };

  const handleVerseSelect = (
    book: BibleBook,
    chapter: BibleChapter,
    verse: BibleVerse
  ) => {
    if (onVerseSelect) {
      onVerseSelect(book, chapter, verse);
    } else if (onChapterSelect) {
      // Fall back to chapter select if verse select not provided
      onChapterSelect(book, chapter);
    } else {
      onBookSelect(book);
    }
    handleClose();
  };

  const renderBookItem = ({ item }: { item: BibleBook }) => {
    const isExpanded = expandedBooks.has(item._id);
    const chapters = bookChapters[item._id] || [];
    const isLoading = loadingChapters[item._id];

    return (
      <View style={styles.bookItemContainer}>
        <TouchableOpacity
          style={styles.bookItem}
          onPress={() => handleChevronPress(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.bookName}>{item.name}</Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="#9CA3AF"
          />
        </TouchableOpacity>

        {/* Expanded Chapters List */}
        {isExpanded && (
          <View style={styles.chaptersContainer}>
            {isLoading ? (
              <View style={styles.loadingChapters}>
                <ActivityIndicator size="small" color="#256E63" />
                <Text style={styles.loadingChaptersText}>
                  Loading chapters...
                </Text>
              </View>
            ) : (
              chapters.map((chapter) => {
                const chapterKey = `${item._id}-${chapter.chapterNumber}`;
                const isChapterExpanded = expandedChapters.has(chapterKey);
                const verses = chapterVerses[chapterKey] || [];
                const isLoadingVerses = loadingVerses[chapterKey];

                return (
                  <View key={chapter._id} style={styles.chapterContainer}>
                    <TouchableOpacity
                      style={styles.chapterItem}
                      onPress={() => handleChapterChevronPress(item, chapter)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.chapterText}>
                        Chapter {chapter.chapterNumber}
                        {chapter.verseCount > 0 &&
                          ` (${chapter.verseCount} verses)`}
                      </Text>
                      <Ionicons
                        name={isChapterExpanded ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>

                    {/* Expanded Verses List */}
                    {isChapterExpanded && (
                      <View style={styles.versesContainer}>
                        {isLoadingVerses ? (
                          <View style={styles.loadingVerses}>
                            <ActivityIndicator size="small" color="#256E63" />
                            <Text style={styles.loadingVersesText}>
                              Loading verses...
                            </Text>
                          </View>
                        ) : verses.length > 0 ? (
                          verses.map((verse) => (
                            <TouchableOpacity
                              key={verse._id}
                              style={styles.verseItem}
                              onPress={() =>
                                handleVerseSelect(item, chapter, verse)
                              }
                              activeOpacity={0.7}
                            >
                              <Text style={styles.verseText}>
                                {item.name} {chapter.chapterNumber}:
                                {verse.verseNumber}
                                {verse.text
                                  ? ` - ${verse.text.substring(0, 50)}${
                                      verse.text.length > 50 ? "..." : ""
                                    }`
                                  : ""}{" "}
                                NIV
                              </Text>
                            </TouchableOpacity>
                          ))
                        ) : (
                          <View style={styles.emptyVerses}>
                            <Text style={styles.emptyVersesText}>
                              No verses available
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleClose}
          style={styles.backdrop}
        />

        <PanGestureHandler>
          <Animated.View style={[styles.modalContainer, animatedStyle]}>
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Books of the Bible</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>

            {/* Segmented Control */}
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segment,
                  viewMode === "books" && styles.activeSegment,
                ]}
                onPress={() => setViewMode("books")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    viewMode === "books" && styles.activeSegmentText,
                  ]}
                >
                  Books
                </Text>
                {viewMode === "books" && (
                  <View style={styles.segmentUnderline} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segment,
                  viewMode === "history" && styles.activeSegment,
                ]}
                onPress={() => setViewMode("history")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    viewMode === "history" && styles.activeSegmentText,
                  ]}
                >
                  History
                </Text>
                {viewMode === "history" && (
                  <View style={styles.segmentUnderline} />
                )}
              </TouchableOpacity>
            </View>

            {/* Sort Options - Hidden to match UI design */}
            {/* <View style={styles.sortContainer}>
              <TouchableOpacity
                style={styles.radioContainer}
                onPress={() => setSortMode("traditional")}
              >
                <View style={styles.radio}>
                  {sortMode === "traditional" && (
                    <View style={styles.radioChecked} />
                  )}
                </View>
                <Text style={styles.radioLabel}>TRADITIONAL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.radioContainer}
                onPress={() => setSortMode("alphabetical")}
              >
                <View style={styles.radio}>
                  {sortMode === "alphabetical" && (
                    <View style={styles.radioChecked} />
                  )}
                </View>
                <Text style={styles.radioLabel}>ALPHABETICAL</Text>
              </TouchableOpacity>
            </View> */}

            {/* Book List */}
            {viewMode === "books" && (
              <>
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#256E63" />
                  </View>
                ) : (
                  <FlatList
                    data={filteredBooks}
                    renderItem={renderBookItem}
                    keyExtractor={(item) => item._id}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </>
            )}

            {/* Empty History View */}
            {viewMode === "history" && (
              <View style={styles.emptyHistoryContainer}>
                <Ionicons name="time-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyHistoryText}>No reading history</Text>
                <Text style={styles.emptyHistorySubtext}>
                  Your recently read chapters will appear here
                </Text>
              </View>
            )}
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  modalContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingTop: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  segmentedControl: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  segment: {
    flex: 1,
    paddingBottom: 12,
    alignItems: "center",
  },
  activeSegment: {},
  segmentText: {
    fontSize: 16,
    fontFamily: "Rubik_500Medium",
    color: "#9CA3AF",
  },
  activeSegmentText: {
    color: "#1F2937",
    fontFamily: "Rubik_600SemiBold",
  },
  segmentUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#256E63",
    borderRadius: 1,
  },
  sortContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 24,
  },
  radioContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioChecked: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#256E63",
  },
  radioLabel: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
    letterSpacing: 0.5,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  bookItemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  bookItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
  },
  bookName: {
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#1F2937",
    flex: 1,
  },
  chaptersContainer: {
    paddingLeft: 16,
    paddingRight: 20,
    paddingBottom: 12,
    backgroundColor: "#FAFAFA",
  },
  chapterItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingLeft: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  chapterText: {
    fontSize: 15,
    fontFamily: "Rubik_400Regular",
    color: "#4B5563",
    flex: 1,
  },
  loadingChapters: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 8,
  },
  loadingChaptersText: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyHistoryContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    color: "#6B7280",
    marginTop: 16,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  chapterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  versesContainer: {
    paddingLeft: 24,
    paddingRight: 8,
    paddingBottom: 8,
    backgroundColor: "#F9F9F9",
  },
  verseItem: {
    paddingVertical: 10,
    paddingLeft: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  verseText: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
  },
  loadingVerses: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadingVersesText: {
    fontSize: 13,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
  },
  emptyVerses: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyVersesText: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: "#9CA3AF",
  },
});
