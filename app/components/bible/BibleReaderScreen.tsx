import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
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
import BibleFloatingNav, { BibleFloatingNavRef } from "./BibleFloatingNav";
import BibleReader from "./BibleReader";
import BibleSearch from "./BibleSearch";
import BibleVerseSelector from "./BibleVerseSelector";

// "books" shows the book list with chapters expanding inline (accordion) -
// there is no separate chapter screen. Tapping a chapter goes to "verses"
// (a list of verses to pick from), then "reader" shows the actual text.
type ViewMode = "books" | "verses" | "reader" | "search";

interface BibleReaderScreenProps {
  onBack?: () => void;
}

export default function BibleReaderScreen({ onBack }: BibleReaderScreenProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("books");
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<BibleChapter | null>(
    null
  );
  const [selectedVerseNumber, setSelectedVerseNumber] = useState<
    number | null
  >(null);
  const [preloadedVerses, setPreloadedVerses] = useState<BibleVerse[]>([]);
  const [chapters, setChapters] = useState<BibleChapter[]>([]);
  const floatingNavRef = useRef<BibleFloatingNavRef>(null);

  // Load the full chapter list for the current book so the floating
  // prev/next/jump nav (shown while reading) knows the chapter bounds.
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
  };

  // Tapping a chapter number inside the book accordion goes straight to
  // the verse picker for that chapter.
  const handleBookChapterSelect = (book: BibleBook, chapter: BibleChapter) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setSelectedVerseNumber(null);
    setPreloadedVerses([]);
    setViewMode("verses");
  };

  const handleVerseNumberSelect = (verseNumber: number, verses: BibleVerse[]) => {
    setSelectedVerseNumber(verseNumber);
    // Reuse the verses we already fetched for the picker so the reader
    // doesn't have to make a second, redundant network request.
    setPreloadedVerses(verses);
    setViewMode("reader");
  };

  // Used when jumping between chapters while already reading (floating nav
  // picker) - goes straight to the reader rather than the verse picker,
  // matching prev/next chapter navigation behavior.
  const handleChapterJump = (chapter: BibleChapter) => {
    setSelectedChapter(chapter);
    setSelectedVerseNumber(null);
    setPreloadedVerses([]);
    setViewMode("reader");
  };

  const handleVerseSelect = (verse: BibleVerse) => {
    // Navigate directly to the verse in the reader (from search results)
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
    setSelectedVerseNumber(verse.verseNumber);
    setPreloadedVerses([]);
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

    // Validate chapter number (upper bound only if we know it)
    if (newChapterNumber < 1) {
      console.log("❌ Cannot navigate: chapter number below 1");
      return;
    }
    const effectiveChapterCount = selectedBook.chapterCount || chapters.length || 0;
    if (effectiveChapterCount > 0 && newChapterNumber > effectiveChapterCount) {
      console.log(
        `❌ Cannot navigate: chapter ${newChapterNumber} exceeds book's ${effectiveChapterCount} chapters`
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
    setSelectedVerseNumber(null);
    setPreloadedVerses([]);
    setSelectedChapter(newChapter);
  };

  const canNavigatePrev = selectedChapter ? selectedChapter.chapterNumber > 1 : false;
  const canNavigateNext = selectedBook && selectedChapter
    ? selectedChapter.chapterNumber < (selectedBook.chapterCount || chapters.length || Number.MAX_SAFE_INTEGER)
    : false;

  const goBack = () => {
    if (viewMode === "reader") {
      setViewMode("verses");
    } else if (viewMode === "verses") {
      setViewMode("books");
    } else if (viewMode === "search") {
      setViewMode("books");
    } else if (onBack) {
      onBack();
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={goBack}>
        <Ionicons name="arrow-back" size={24} color="#256E63" />
      </TouchableOpacity>

      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle}>
          {viewMode === "books" && "Select Book"}
          {viewMode === "verses" &&
            `${selectedBook?.name} ${selectedChapter?.chapterNumber}`}
          {viewMode === "reader" &&
            `${selectedBook?.name} ${selectedChapter?.chapterNumber}`}
          {viewMode === "search" && "Search Bible"}
        </Text>
        {viewMode === "reader" && selectedChapter && (
          <Text style={styles.headerSubtitle}>
            Chapter {selectedChapter.chapterNumber}
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
            onChapterSelect={handleBookChapterSelect}
            selectedBook={selectedBook}
          />
        );

      case "verses":
        return selectedBook && selectedChapter ? (
          <BibleVerseSelector
            bookName={selectedBook.name}
            chapterNumber={selectedChapter.chapterNumber}
            onVerseSelect={handleVerseNumberSelect}
            onBack={goBack}
            selectedVerseNumber={selectedVerseNumber}
          />
        ) : null;

      case "reader":
        return selectedBook && selectedChapter ? (
          <>
            <BibleReader
              bookName={selectedBook.name}
              chapterNumber={selectedChapter.chapterNumber}
              initialVerses={preloadedVerses}
              initialVerseNumber={selectedVerseNumber}
              onNavigateChapter={handleNavigateChapter}
              canNavigatePrev={canNavigatePrev}
              canNavigateNext={canNavigateNext}
              onScreenTap={() => {
                // Toggle bottom nav bar when screen is double tapped
                floatingNavRef.current?.toggleHide();
              }}
            />
            <BibleFloatingNav
              ref={floatingNavRef}
              book={selectedBook}
              currentChapter={selectedChapter.chapterNumber}
              chapters={chapters}
              onChapterSelect={handleChapterJump}
              onNavigatePrev={() => handleNavigateChapter("prev")}
              onNavigateNext={() => handleNavigateChapter("next")}
              canNavigatePrev={canNavigatePrev}
              canNavigateNext={canNavigateNext}
            />
          </>
        ) : null;

      case "search":
        return <BibleSearch onVerseSelect={handleVerseSelect} />;

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {renderHeader()}
        <View style={styles.content}>{renderContent()}</View>
      </SafeAreaView>
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
});
