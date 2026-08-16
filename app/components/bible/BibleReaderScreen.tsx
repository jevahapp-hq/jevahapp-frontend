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
import { getLastRead, setLastRead } from "../../services/bibleCache";
import {
  getCachedCatalog,
  getInstalledPacks,
  getSelectedTranslationId,
  resolveTranslationId,
  setSelectedTranslationId,
  type BibleTranslation,
  type BibleTranslationCatalog,
} from "../../services/bibleTranslations";
import { useNotification } from "../../context/NotificationContext";
import BibleBookSelector from "./BibleBookSelector";
import BibleChapterSelector from "./BibleChapterSelector";
import BibleFloatingNav, { BibleFloatingNavRef } from "./BibleFloatingNav";
import BibleReader from "./BibleReader";
import BibleSearch from "./BibleSearch";
import BibleTranslationPicker from "./BibleTranslationPicker";

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
  const [catalog, setCatalog] = useState<BibleTranslationCatalog | null>(
    getCachedCatalog
  );
  const [translationId, setTranslationId] = useState(
    getSelectedTranslationId
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [installedIds, setInstalledIds] = useState<string[]>(() =>
    getInstalledPacks().map((p) => p.translationId)
  );
  const [packRevision, setPackRevision] = useState(0);
  const { showNotification } = useNotification();
  const floatingNavRef = useRef<BibleFloatingNavRef>(null);
  const restoredRef = useRef(false);

  const persistPlace = (
    bookName: string,
    chapterNumber: number,
    extra?: Partial<BibleBook>
  ) => {
    setLastRead({
      bookName,
      chapterNumber,
      testament: extra?.testament,
      chapterCount: extra?.chapterCount,
      translationId,
    });
  };

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const last = getLastRead(translationId);
    if (!last) return;
    setSelectedBook({
      _id: last.bookName,
      name: last.bookName,
      testament: last.testament || "old",
      chapterCount: last.chapterCount || 0,
      verseCount: 0,
    });
    setSelectedChapter({
      _id: `${last.bookName}-${last.chapterNumber}`,
      bookName: last.bookName,
      chapterNumber: last.chapterNumber,
      verseCount: 0,
    });
    setViewMode("reader");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const nextCatalog = await bibleApiService.getTranslations();
      if (cancelled) return;
      setCatalog(nextCatalog);
      setTranslationId(resolveTranslationId(nextCatalog));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load chapters when book or translation changes
  useEffect(() => {
    if (selectedBook) {
      loadChapters();
    }
  }, [selectedBook, translationId, packRevision]);

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
    setViewMode("chapters");
  };

  const handleChapterSelect = (chapter: BibleChapter) => {
    setSelectedChapter(chapter);
    setViewMode("reader");
    if (selectedBook) {
      persistPlace(selectedBook.name, chapter.chapterNumber, selectedBook);
    }
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
    persistPlace(verse.bookName, verse.chapterNumber);
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
    setSelectedChapter(newChapter);
    persistPlace(selectedBook.name, newChapterNumber, selectedBook);
  };

  const handleTranslationSelect = (id: string) => {
    setSelectedTranslationId(id);
    setTranslationId(id);
    setPickerOpen(false);
    if (selectedBook && selectedChapter) {
      setLastRead({
        bookName: selectedBook.name,
        chapterNumber: selectedChapter.chapterNumber,
        testament: selectedBook.testament,
        chapterCount: selectedBook.chapterCount,
        translationId: id,
      });
    }
  };

  const handlePackDownload = async (translation: BibleTranslation) => {
    if (downloadingId) return;
    setDownloadingId(translation.id);
    try {
      const result = await bibleApiService.downloadTranslationPack(translation);
      if (result.ok) {
        setInstalledIds(getInstalledPacks().map((p) => p.translationId));
        setPackRevision((n) => n + 1);
        showNotification({
          type: "success",
          title: translation.abbreviation,
          message: "Available offline",
        });
        return;
      }
      if (result.reason === "hash") {
        showNotification({
          type: "error",
          title: translation.abbreviation,
          message: "Download again",
        });
        return;
      }
      if (result.reason === "licensed") {
        showNotification({
          type: "info",
          title: translation.abbreviation,
          message: "This translation stays online",
        });
        return;
      }
      if (result.reason === "too-large") {
        showNotification({
          type: "info",
          title: translation.abbreviation,
          message: "Pack too large for this device",
        });
        return;
      }
      showNotification({
        type: "info",
        title: translation.abbreviation,
        message: "Pack unavailable — reading online",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const canNavigatePrev = selectedChapter ? selectedChapter.chapterNumber > 1 : false;
  const canNavigateNext = selectedBook && selectedChapter
    ? selectedChapter.chapterNumber < (selectedBook.chapterCount || chapters.length || Number.MAX_SAFE_INTEGER)
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
          {viewMode === "books" && "Bible"}
          {viewMode === "chapters" && selectedBook?.name}
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

      <View style={styles.headerActions}>
        {catalog?.translations?.length ? (
          <TouchableOpacity
            style={styles.translationChip}
            onPress={() => setPickerOpen(true)}
            accessibilityLabel="Choose Bible translation"
          >
            <Text style={styles.translationChipText}>
              {catalog.translations.find((t) => t.id === translationId)
                ?.abbreviation || translationId.toUpperCase()}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#256E63" />
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => setViewMode("search")}
        >
          <Ionicons name="search-outline" size={24} color="#256E63" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    switch (viewMode) {
      case "books":
        return (
          <BibleBookSelector
            key={`${translationId}:${packRevision}`}
            onBookSelect={handleBookSelect}
            selectedBook={selectedBook}
            translationId={translationId}
          />
        );

      case "chapters":
        return selectedBook ? (
          <BibleChapterSelector
            key={`${translationId}:${packRevision}:${selectedBook.name}`}
            bookName={selectedBook.name}
            chapterCount={selectedBook.chapterCount || chapters.length}
            onChapterSelect={handleChapterSelect}
            selectedChapter={selectedChapter}
            translationId={translationId}
          />
        ) : null;

      case "reader":
        return selectedBook && selectedChapter ? (
          <>
            <BibleReader
              bookName={selectedBook.name}
              chapterNumber={selectedChapter.chapterNumber}
              translationId={translationId}
              packRevision={packRevision}
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
              onChapterSelect={handleChapterSelect}
              onNavigatePrev={() => handleNavigateChapter("prev")}
              onNavigateNext={() => handleNavigateChapter("next")}
              canNavigatePrev={canNavigatePrev}
              canNavigateNext={canNavigateNext}
            />
          </>
        ) : null;

      case "search":
        return (
          <BibleSearch
            key={translationId}
            onVerseSelect={handleVerseSelect}
          />
        );

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
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {renderHeader()}
        <View style={styles.content}>{renderContent()}</View>
        {renderBottomNavigation()}
      </SafeAreaView>
      {catalog?.translations?.length ? (
        <BibleTranslationPicker
          visible={pickerOpen}
          selectedId={translationId}
          translations={catalog.translations}
          installedIds={installedIds}
          downloadingId={downloadingId}
          onSelect={handleTranslationSelect}
          onDownload={handlePackDownload}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
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
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  translationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 2,
    gap: 2,
  },
  translationChipText: {
    fontSize: 12,
    fontFamily: "Rubik_600SemiBold",
    color: "#256E63",
  },
  content: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 8,
    paddingHorizontal: 8,
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
    justifyContent: "center",
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
    textAlign: "center",
    width: "100%",
  },
  activeNavItemText: {
    color: "#256E63",
  },
});
