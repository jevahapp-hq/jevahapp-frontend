import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  bibleApiService,
  BibleBook,
  BibleChapter,
  BibleVerse,
} from "../../services/bibleApiService";
import BibleBookSelector from "./BibleBookSelector";
import BibleBookSelectorModal from "./BibleBookSelectorModal";
import BibleChapterSelector from "./BibleChapterSelector";
import BibleFloatingNav from "./BibleFloatingNav";
import BibleReaderRedesigned from "./BibleReaderRedesigned";
import BibleSearch from "./BibleSearch";

type ViewMode = "books" | "chapters" | "reader" | "search";

interface BibleReaderScreenProps {
  onBack?: () => void;
}

export default function BibleReaderScreen({ onBack }: BibleReaderScreenProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("books");
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<BibleChapter | null>(
    null
  );
  const [chapters, setChapters] = useState<BibleChapter[]>([]);
  const [showBookModal, setShowBookModal] = useState(false);
  const [translation, setTranslation] = useState("NIV");
  const [showTranslationPicker, setShowTranslationPicker] = useState(false);
  const [isFloatingAudioPlaying, setIsFloatingAudioPlaying] = useState(false);

  // Load chapters when book is selected
  useEffect(() => {
    if (selectedBook) {
      loadChapters();
    }
  }, [selectedBook]);

  const loadChapters = async () => {
    if (!selectedBook) return;

    try {
      const bookChapters = await bibleApiService.getBookChapters(
        selectedBook.name
      );
      setChapters(bookChapters);
    } catch (error) {
      console.error("Failed to load chapters:", error);
      // Generate fallback chapters
      const fallbackChapters: BibleChapter[] = Array.from(
        { length: selectedBook.chapterCount },
        (_, i) => ({
          _id: `${selectedBook.name}-${i + 1}`,
          bookName: selectedBook.name,
          chapterNumber: i + 1,
          verseCount: 0,
        })
      );
      setChapters(fallbackChapters);
    }
  };

  const handleBookSelect = (book: BibleBook) => {
    setSelectedBook(book);
    setSelectedChapter(null);
    setShowBookModal(false);
    // If in reader mode, switch to chapters to select chapter
    if (viewMode === "reader" && !selectedChapter) {
      setViewMode("chapters");
    }
  };

  const handleChapterSelect = (book: BibleBook, chapter: BibleChapter) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setViewMode("reader");
  };

  const handleVerseSelect = (verse: BibleVerse) => {
    // Navigate to the verse in the reader
    const book = {
      _id: verse._id,
      name: verse.bookName,
      testament: "old" as const,
      chapterCount: 0,
      verseCount: 0,
    };
    const chapter = {
      _id: verse._id,
      bookName: verse.bookName,
      chapterNumber: verse.chapterNumber,
      verseCount: 0,
    };

    setSelectedBook(book);
    setSelectedChapter(chapter);
    setViewMode("reader");
  };

  const handleVerseSelectFromModal = (
    book: BibleBook,
    chapter: BibleChapter,
    verse: BibleVerse
  ) => {
    // Set the book and chapter, then navigate to reader
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setViewMode("reader");
  };

  const handleNavigateChapter = async (direction: "prev" | "next") => {
    if (!selectedBook || !selectedChapter) {
      console.log("❌ Cannot navigate: missing book or chapter");
      return;
    }

    const newChapterNumber =
      direction === "prev"
        ? selectedChapter.chapterNumber - 1
        : selectedChapter.chapterNumber + 1;

    console.log(
      `📖 Attempting to navigate ${direction} from chapter ${selectedChapter.chapterNumber} to ${newChapterNumber}`
    );
    console.log(
      `📚 Book: ${selectedBook.name}, Total chapters: ${selectedBook.chapterCount}`
    );

    // Validate chapter number
    if (newChapterNumber < 1) {
      console.log("❌ Cannot navigate: chapter number below 1");
      return;
    }
    if (newChapterNumber > selectedBook.chapterCount) {
      console.log(
        `❌ Cannot navigate: chapter ${newChapterNumber} exceeds book's ${selectedBook.chapterCount} chapters`
      );
      return;
    }

    // Try to get actual verse count from API
    let verseCount = 0;
    try {
      const chapterInfo = await bibleApiService.getChapter(
        selectedBook.name,
        newChapterNumber
      );
      verseCount =
        (chapterInfo as any).actualVerseCount ||
        (chapterInfo as any).verseCount ||
        0;
      console.log(`✅ Loaded chapter info: ${verseCount} verses`);
    } catch (error) {
      console.error("⚠️ Error loading chapter info:", error);
      // Continue anyway
    }

    const newChapter: BibleChapter = {
      _id: `${selectedBook.name}-${newChapterNumber}`,
      bookName: selectedBook.name,
      chapterNumber: newChapterNumber,
      verseCount: verseCount,
    };

    console.log(
      `✅ Navigating to ${selectedBook.name} ${newChapterNumber} (${verseCount} verses)`
    );
    setSelectedChapter(newChapter);
  };

  const canNavigatePrev = selectedChapter
    ? selectedChapter.chapterNumber > 1
    : false;
  const canNavigateNext =
    selectedBook && selectedChapter
      ? selectedChapter.chapterNumber < selectedBook.chapterCount
      : false;

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          if (viewMode === "reader") {
            setViewMode("chapters");
          } else if (viewMode === "chapters") {
            setViewMode("books");
          } else if (viewMode === "search") {
            setViewMode("books");
          } else if (onBack) {
            onBack();
          }
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#256E63" />
      </TouchableOpacity>

      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>
          {viewMode === "books" && "Select Book"}
          {viewMode === "chapters" && `Chapters in ${selectedBook?.name}`}
          {viewMode === "reader" &&
            `${selectedBook?.name} ${selectedChapter?.chapterNumber}`}
          {viewMode === "search" && "Search Bible"}
        </Text>
        {viewMode === "reader" && selectedChapter && (
          <Text style={styles.headerSubtitle}>
            Chapter {selectedChapter.chapterNumber}
            {selectedChapter.verseCount > 0
              ? ` • ${selectedChapter.verseCount} verses`
              : ""}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.searchButton}
        onPress={() => setViewMode("search")}
      >
        <Ionicons name="search-outline" size={24} color="#256E63" />
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (viewMode) {
      case "books":
        return (
          <BibleBookSelector
            onBookSelect={handleBookSelect}
            onChapterSelect={handleChapterSelect}
            selectedBook={selectedBook}
          />
        );

      case "chapters":
        return selectedBook ? (
          <BibleChapterSelector
            bookName={selectedBook.name}
            onChapterSelect={(chapter) =>
              selectedBook && handleChapterSelect(selectedBook, chapter)
            }
            selectedChapter={selectedChapter}
          />
        ) : null;

      case "reader":
        return selectedBook && selectedChapter ? (
          <BibleReaderRedesigned
            bookName={selectedBook.name}
            chapterNumber={selectedChapter.chapterNumber}
            onBack={() => {
              if (selectedChapter) {
                setViewMode("chapters");
              } else {
                setViewMode("books");
              }
            }}
            onNavigateChapter={handleNavigateChapter}
            canNavigatePrev={canNavigatePrev}
            canNavigateNext={canNavigateNext}
            onBookChapterPress={() => setShowBookModal(true)}
            onTranslationPress={() => setShowTranslationPicker(true)}
            translation={translation}
          />
        ) : (
          <View style={styles.emptyReaderContainer}>
            <Ionicons name="book-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyReaderText}>
              Select a book to begin reading
            </Text>
            <TouchableOpacity
              style={styles.selectBookButton}
              onPress={() => setShowBookModal(true)}
            >
              <Text style={styles.selectBookButtonText}>Open Bible</Text>
            </TouchableOpacity>
          </View>
        );

      case "search":
        return <BibleSearch onVerseSelect={handleVerseSelect} />;

      default:
        return null;
    }
  };

  const renderBottomNavigation = () => (
    <View style={styles.bottomNav}>
      <TouchableOpacity
        style={[styles.navItem, viewMode === "books" && styles.activeNavItem]}
        onPress={() => setViewMode("books")}
      >
        <Ionicons
          name="library-outline"
          size={20}
          color={viewMode === "books" ? "#256E63" : "#9CA3AF"}
        />
        <Text
          style={[
            styles.navItemText,
            viewMode === "books" && styles.activeNavItemText,
          ]}
        >
          Books
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.navItem, viewMode === "search" && styles.activeNavItem]}
        onPress={() => setViewMode("search")}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={viewMode === "search" ? "#256E63" : "#9CA3AF"}
        />
        <Text
          style={[
            styles.navItemText,
            viewMode === "search" && styles.activeNavItemText,
          ]}
        >
          Search
        </Text>
      </TouchableOpacity>

      {selectedBook && (
        <TouchableOpacity
          style={[
            styles.navItem,
            viewMode === "chapters" && styles.activeNavItem,
          ]}
          onPress={() => setViewMode("chapters")}
        >
          <Ionicons
            name="list-outline"
            size={20}
            color={viewMode === "chapters" ? "#256E63" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navItemText,
              viewMode === "chapters" && styles.activeNavItemText,
            ]}
          >
            Chapters
          </Text>
        </TouchableOpacity>
      )}

      {selectedChapter && (
        <TouchableOpacity
          style={[
            styles.navItem,
            viewMode === "reader" && styles.activeNavItem,
          ]}
          onPress={() => setViewMode("reader")}
        >
          <Ionicons
            name="book-outline"
            size={20}
            color={viewMode === "reader" ? "#256E63" : "#9CA3AF"}
          />
          <Text
            style={[
              styles.navItemText,
              viewMode === "reader" && styles.activeNavItemText,
            ]}
          >
            Read
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {viewMode !== "reader" && renderHeader()}
        <View style={styles.content}>{renderContent()}</View>
        {viewMode !== "reader" && renderBottomNavigation()}
      </SafeAreaView>

      {/* Book Selector Modal */}
      <BibleBookSelectorModal
        visible={showBookModal}
        onClose={() => setShowBookModal(false)}
        onBookSelect={handleBookSelect}
        onChapterSelect={(book, chapter) => {
          handleBookSelect(book);
          handleChapterSelect(book, chapter);
        }}
        onVerseSelect={handleVerseSelectFromModal}
        selectedBook={selectedBook}
      />

      {/* Floating Bible Navigation (visible in reader) */}
      {viewMode === "reader" && selectedBook && selectedChapter && (
        <BibleFloatingNav
          book={selectedBook}
          currentChapter={selectedChapter.chapterNumber}
          chapters={chapters}
          onChapterSelect={(chapter) =>
            handleChapterSelect(selectedBook, chapter)
          }
          onNavigatePrev={() => handleNavigateChapter("prev")}
          onNavigateNext={() => handleNavigateChapter("next")}
          canNavigatePrev={canNavigatePrev}
          canNavigateNext={canNavigateNext}
          onOpenBookModal={() => setShowBookModal(true)}
          isPlaying={isFloatingAudioPlaying}
          onTogglePlay={() => setIsFloatingAudioPlaying((p) => !p)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginTop: 12, // More space from top
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  searchButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeNavItem: {
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
  },
  navItemText: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    color: "#9CA3AF",
    marginTop: 4,
  },
  activeNavItemText: {
    color: "#256E63",
  },
  emptyReaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyReaderText: {
    fontSize: 18,
    fontFamily: "Rubik_500Medium",
    color: "#6B7280",
    marginTop: 24,
    marginBottom: 32,
    textAlign: "center",
  },
  selectBookButton: {
    backgroundColor: "#256E63",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  selectBookButtonText: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    color: "#FFFFFF",
  },
});
