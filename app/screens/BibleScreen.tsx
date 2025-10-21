import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import BibleOnboarding from "../components/BibleOnboarding";

export default function BibleScreen() {
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);

  const handleEnterBible = () => {
    setShowOnboarding(false);
  };

  // Show onboarding screen first
  if (showOnboarding) {
    return <BibleOnboarding onEnterBible={handleEnterBible} />;
  }

  // Sample Bible books data
  const bibleBooks = [
    { name: "Genesis", chapters: 50 },
    { name: "Exodus", chapters: 40 },
    { name: "Leviticus", chapters: 27 },
    { name: "Numbers", chapters: 36 },
    { name: "Deuteronomy", chapters: 34 },
    { name: "Joshua", chapters: 24 },
    { name: "Judges", chapters: 21 },
    { name: "Ruth", chapters: 4 },
    { name: "1 Samuel", chapters: 31 },
    { name: "2 Samuel", chapters: 24 },
    { name: "1 Kings", chapters: 22 },
    { name: "2 Kings", chapters: 25 },
    { name: "1 Chronicles", chapters: 29 },
    { name: "2 Chronicles", chapters: 36 },
    { name: "Ezra", chapters: 10 },
    { name: "Nehemiah", chapters: 13 },
    { name: "Esther", chapters: 10 },
    { name: "Job", chapters: 42 },
    { name: "Psalms", chapters: 150 },
    { name: "Proverbs", chapters: 31 },
    { name: "Ecclesiastes", chapters: 12 },
    { name: "Song of Songs", chapters: 8 },
    { name: "Isaiah", chapters: 66 },
    { name: "Jeremiah", chapters: 52 },
    { name: "Lamentations", chapters: 5 },
    { name: "Ezekiel", chapters: 48 },
    { name: "Daniel", chapters: 12 },
    { name: "Hosea", chapters: 14 },
    { name: "Joel", chapters: 3 },
    { name: "Amos", chapters: 9 },
    { name: "Obadiah", chapters: 1 },
    { name: "Jonah", chapters: 4 },
    { name: "Micah", chapters: 7 },
    { name: "Nahum", chapters: 3 },
    { name: "Habakkuk", chapters: 3 },
    { name: "Zephaniah", chapters: 3 },
    { name: "Haggai", chapters: 2 },
    { name: "Zechariah", chapters: 14 },
    { name: "Malachi", chapters: 4 },
    { name: "Matthew", chapters: 28 },
    { name: "Mark", chapters: 16 },
    { name: "Luke", chapters: 24 },
    { name: "John", chapters: 21 },
    { name: "Acts", chapters: 28 },
    { name: "Romans", chapters: 16 },
    { name: "1 Corinthians", chapters: 16 },
    { name: "2 Corinthians", chapters: 13 },
    { name: "Galatians", chapters: 6 },
    { name: "Ephesians", chapters: 6 },
    { name: "Philippians", chapters: 4 },
    { name: "Colossians", chapters: 4 },
    { name: "1 Thessalonians", chapters: 5 },
    { name: "2 Thessalonians", chapters: 3 },
    { name: "1 Timothy", chapters: 6 },
    { name: "2 Timothy", chapters: 4 },
    { name: "Titus", chapters: 3 },
    { name: "Philemon", chapters: 1 },
    { name: "Hebrews", chapters: 13 },
    { name: "James", chapters: 5 },
    { name: "1 Peter", chapters: 5 },
    { name: "2 Peter", chapters: 3 },
    { name: "1 John", chapters: 5 },
    { name: "2 John", chapters: 1 },
    { name: "3 John", chapters: 1 },
    { name: "Jude", chapters: 1 },
    { name: "Revelation", chapters: 22 },
  ];

  const renderBooks = () => {
    return bibleBooks.map((book, index) => (
      <TouchableOpacity
        key={index}
        style={[
          styles.bookItem,
          selectedBook === book.name && styles.selectedBookItem,
        ]}
        onPress={() => {
          setSelectedBook(book.name);
          setSelectedChapter(null);
        }}
      >
        <Text
          style={[
            styles.bookText,
            selectedBook === book.name && styles.selectedBookText,
          ]}
        >
          {book.name}
        </Text>
        <Text style={styles.chapterCount}>{book.chapters} chapters</Text>
      </TouchableOpacity>
    ));
  };

  const renderChapters = () => {
    if (!selectedBook) return null;

    const book = bibleBooks.find((b) => b.name === selectedBook);
    if (!book) return null;

    const chapters = Array.from({ length: book.chapters }, (_, i) => i + 1);

    return (
      <View style={styles.chaptersContainer}>
        <Text style={styles.chaptersTitle}>Chapters in {selectedBook}</Text>
        <View style={styles.chaptersGrid}>
          {chapters.map((chapter) => (
            <TouchableOpacity
              key={chapter}
              style={[
                styles.chapterItem,
                selectedChapter === chapter && styles.selectedChapterItem,
              ]}
              onPress={() => setSelectedChapter(chapter)}
            >
              <Text
                style={[
                  styles.chapterText,
                  selectedChapter === chapter && styles.selectedChapterText,
                ]}
              >
                {chapter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderBibleContent = () => {
    if (!selectedBook || !selectedChapter) {
      return (
        <View style={styles.placeholderContainer}>
          <Ionicons name="book-outline" size={64} color="#9CA3AF" />
          <Text style={styles.placeholderText}>
            Select a book and chapter to read
          </Text>
        </View>
      );
    }

    // This would be replaced with actual Bible content
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.contentTitle}>
          {selectedBook} Chapter {selectedChapter}
        </Text>
        <ScrollView style={styles.verseContainer}>
          <Text style={styles.verseText}>
            This is where the actual Bible verses would be displayed. The
            content would be loaded from a Bible API or local database.
          </Text>
          <Text style={styles.verseText}>
            Verse 1: In the beginning was the Word, and the Word was with God,
            and the Word was God.
          </Text>
          <Text style={styles.verseText}>
            Verse 2: He was with God in the beginning.
          </Text>
          <Text style={styles.verseText}>
            Verse 3: Through him all things were made; without him nothing was
            made that has been made.
          </Text>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setShowOnboarding(true)}
        >
          <Ionicons name="arrow-back" size={24} color="#256E63" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Holy Bible</Text>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={24} color="#256E63" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <ScrollView
          style={styles.booksContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.booksTitle}>Books of the Bible</Text>
          <View style={styles.booksGrid}>{renderBooks()}</View>
          {renderChapters()}
        </ScrollView>

        <View style={styles.readerContainer}>{renderBibleContent()}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
  },
  searchButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    flexDirection: "row",
  },
  booksContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  booksTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  booksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  bookItem: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    minWidth: "30%",
  },
  selectedBookItem: {
    backgroundColor: "#256E63",
  },
  bookText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  selectedBookText: {
    color: "#FFFFFF",
  },
  chapterCount: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  chaptersContainer: {
    marginTop: 24,
  },
  chaptersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  chaptersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chapterItem: {
    backgroundColor: "#F3F4F6",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedChapterItem: {
    backgroundColor: "#256E63",
  },
  chapterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  selectedChapterText: {
    color: "#FFFFFF",
  },
  readerContainer: {
    flex: 2,
    backgroundColor: "#FFFFFF",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  placeholderText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 16,
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 20,
    textAlign: "center",
  },
  verseContainer: {
    flex: 1,
  },
  verseText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
    marginBottom: 16,
  },
});
