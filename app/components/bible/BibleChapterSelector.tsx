import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { bibleApiService, BibleChapter } from "../../services/bibleApiService";

interface BibleChapterSelectorProps {
  bookName: string;
  /** Known count from the book list — paints the grid immediately (YouVersion). */
  chapterCount?: number;
  onChapterSelect: (chapter: BibleChapter) => void;
  selectedChapter?: BibleChapter | null;
  translationId?: string;
}

function chaptersFromCount(bookName: string, count: number): BibleChapter[] {
  const n = Math.max(0, count);
  return Array.from({ length: n }, (_, i) => ({
    _id: `${bookName}-${i + 1}`,
    bookName,
    chapterNumber: i + 1,
    verseCount: 0,
  }));
}

export default function BibleChapterSelector({
  bookName,
  chapterCount = 0,
  onChapterSelect,
  selectedChapter,
  translationId,
}: BibleChapterSelectorProps) {
  const seed = useMemo(
    () => chaptersFromCount(bookName, chapterCount),
    [bookName, chapterCount]
  );
  const [chapters, setChapters] = useState<BibleChapter[]>(seed);

  useEffect(() => {
    setChapters(seed);
  }, [seed]);

  useEffect(() => {
    if (!bookName) return;
    let cancelled = false;

    bibleApiService
      .getBookChapters(bookName)
      .then((bookChapters) => {
        if (cancelled || !bookChapters.length) return;
        setChapters(
          bookChapters.map((ch) => ({
            ...ch,
            verseCount: 0,
          }))
        );
      })
      .catch(() => {
        if (cancelled || seed.length > 0) return;
        setChapters(generateFallbackChapters(bookName));
      });

    return () => {
      cancelled = true;
    };
  }, [bookName, seed.length, translationId]);

  const renderChapterItem = ({ item }: { item: BibleChapter }) => {
    const isSelected = selectedChapter?.chapterNumber === item.chapterNumber;

    return (
      <TouchableOpacity
        style={[
          styles.chapterCell,
          isSelected ? styles.selectedChapterCell : undefined,
        ]}
        onPress={() => onChapterSelect({ ...item, verseCount: 0 })}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chapterNumber,
            isSelected ? styles.selectedChapterNumber : undefined,
          ]}
        >
          {item.chapterNumber}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chapters}
        renderItem={renderChapterItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chaptersList}
        numColumns={5}
        columnWrapperStyle={styles.chapterRow}
      />
    </View>
  );
}

const generateFallbackChapters = (bookName: string): BibleChapter[] => {
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

  return chaptersFromCount(bookName, chapterCounts[bookName] || 1);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  chaptersList: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 32,
  },
  chapterRow: {
    marginBottom: 10,
  },
  chapterCell: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedChapterCell: {
    backgroundColor: "#256E63",
  },
  chapterNumber: {
    fontSize: 16,
    fontFamily: "Rubik_600SemiBold",
    color: "#1F2937",
  },
  selectedChapterNumber: {
    color: "#FFFFFF",
  },
});
