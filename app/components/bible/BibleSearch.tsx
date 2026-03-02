import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  AdvancedSearchResult,
  AdvancedSearchVerse,
  bibleApiService,
  BibleVerse,
  SearchResult,
} from "../../services/bibleApiService";

interface BibleSearchProps {
  onVerseSelect: (verse: BibleVerse) => void;
}

export default function BibleSearch({ onVerseSelect }: BibleSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdvancedSearchVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTestament, setSelectedTestament] = useState<
    "all" | "old" | "new"
  >("all");
  const [selectedBook, setSelectedBook] = useState<string>("");
  const [queryInterpretation, setQueryInterpretation] = useState<string>("");
  const [suggestedVerses, setSuggestedVerses] = useState<string[]>([]);
  const [isAIEnhanced, setIsAIEnhanced] = useState(false);

  const searchBible = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setHasSearched(true);

      const searchOptions = {
        ...(selectedTestament !== "all" && { testament: selectedTestament }),
        ...(selectedBook && { book: selectedBook }),
        limit: 20,
      };

      console.log(`🔍 Searching Bible for: "${query.trim()}"`, searchOptions);

      // Try advanced AI search first, fallback to regular search
      try {
        const advancedResult: AdvancedSearchResult =
          await bibleApiService.searchBibleAdvanced(
            query.trim(),
            searchOptions
          );

        console.log(
          `✅ AI Search results: ${
            advancedResult.data?.length || 0
          } verses found`
        );
        console.log(
          `🧠 AI Interpretation: ${advancedResult.queryInterpretation || "N/A"}`
        );
        console.log(
          `💡 Suggested verses: ${
            advancedResult.suggestedVerses?.join(", ") || "N/A"
          }`
        );

        setResults(advancedResult.data || []);
        setQueryInterpretation(advancedResult.queryInterpretation || "");
        setSuggestedVerses(advancedResult.suggestedVerses || []);
        setIsAIEnhanced(advancedResult.isAIEnhanced || false);
      } catch (advancedError) {
        console.warn(
          "⚠️ Advanced search failed, using regular search:",
          advancedError
        );
        // Fallback to regular search
        const searchResult: SearchResult = await bibleApiService.searchBible(
          query.trim(),
          { ...searchOptions, offset: 0 }
        );
        console.log(
          `✅ Regular search results: ${
            searchResult.verses?.length || 0
          } verses found`
        );

        // Convert regular search results to advanced format
        const convertedResults: AdvancedSearchVerse[] = searchResult.verses.map(
          (verse) => ({
            ...verse,
            highlightedText: verse.text,
            relevanceScore: 1,
            matchedTerms: query.toLowerCase().split(/\s+/),
          })
        );

        setResults(convertedResults);
        setQueryInterpretation("");
        setSuggestedVerses([]);
        setIsAIEnhanced(false);
      }
    } catch (error) {
      console.error("❌ Bible search failed:", error);
      setResults([]);
      setQueryInterpretation("");
      setSuggestedVerses([]);
      setIsAIEnhanced(false);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setQueryInterpretation("");
    setSuggestedVerses([]);
    setIsAIEnhanced(false);
  };

  const renderSearchResult = ({ item }: { item: AdvancedSearchVerse }) => {
    // Parse highlighted text (words wrapped in **)
    const renderHighlightedText = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return (
        <Text style={styles.verseText} numberOfLines={3}>
          {parts.map((part, i) => {
            if (part.startsWith("**") && part.endsWith("**")) {
              const highlightedText = part.slice(2, -2);
              return (
                <Text key={i} style={styles.highlightedText}>
                  {highlightedText}
                </Text>
              );
            }
            return <Text key={i}>{part}</Text>;
          })}
        </Text>
      );
    };

    // Get testament badge
    const getTestamentBadge = (bookName: string) => {
      const oldTestament = [
        "Genesis",
        "Exodus",
        "Leviticus",
        "Numbers",
        "Deuteronomy",
        "Joshua",
        "Judges",
        "Ruth",
        "1 Samuel",
        "2 Samuel",
        "1 Kings",
        "2 Kings",
        "1 Chronicles",
        "2 Chronicles",
        "Ezra",
        "Nehemiah",
        "Esther",
        "Job",
        "Psalms",
        "Proverbs",
        "Ecclesiastes",
        "Song of Songs",
        "Isaiah",
        "Jeremiah",
        "Lamentations",
        "Ezekiel",
        "Daniel",
        "Hosea",
        "Joel",
        "Amos",
        "Obadiah",
        "Jonah",
        "Micah",
        "Nahum",
        "Habakkuk",
        "Zephaniah",
        "Haggai",
        "Zechariah",
        "Malachi",
      ];
      return oldTestament.includes(bookName) ? "OT" : "NT";
    };

    return (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => onVerseSelect && onVerseSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultHeader}>
          <View style={styles.referenceContainer}>
            <Text style={styles.reference}>
              {item.bookName} {item.chapterNumber}:{item.verseNumber}
            </Text>
            <View
              style={[
                styles.testamentBadge,
                getTestamentBadge(item.bookName) === "OT"
                  ? styles.oldTestamentBadge
                  : styles.newTestamentBadge,
              ]}
            >
              <Text style={styles.testamentBadgeText}>
                {getTestamentBadge(item.bookName)}
              </Text>
            </View>
            {item.relevanceScore !== undefined && (
              <Text style={styles.relevanceScore}>
                {Math.round(item.relevanceScore * 100)}%
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>

        {item.highlightedText ? (
          renderHighlightedText(item.highlightedText)
        ) : (
          <Text style={styles.verseText} numberOfLines={3}>
            {item.text}
          </Text>
        )}

        {item.explanation && (
          <Text style={styles.explanation} numberOfLines={2}>
            💡 {item.explanation}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#256E63" />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      );
    }

    if (hasSearched && results.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>
            Try different keywords or check your spelling
          </Text>
        </View>
      );
    }

    if (!hasSearched) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="book-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>Search the Bible</Text>
          <Text style={styles.emptySubtext}>
            Enter keywords to find verses across all books
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Bible..."
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={searchBible}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchButton, !query.trim() && styles.disabledButton]}
          onPress={searchBible}
          disabled={!query.trim() || loading}
        >
          <Ionicons
            name="search"
            size={20}
            color={query.trim() ? "#FFFFFF" : "#9CA3AF"}
          />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Testament:</Text>
          <View style={styles.filterButtons}>
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
                All
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
                Old
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
                New
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* AI Interpretation */}
      {queryInterpretation && (
        <View style={styles.interpretationContainer}>
          <Text style={styles.interpretationText}>
            🧠 {queryInterpretation}
          </Text>
        </View>
      )}

      {/* Suggested Verses */}
      {suggestedVerses.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsLabel}>💡 Suggested:</Text>
          <View style={styles.suggestionsList}>
            {suggestedVerses.map((verse, index) => (
              <View key={index} style={styles.suggestionChip}>
                <Text style={styles.suggestionText}>{verse}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsContainer}>
        {results.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {results.length} result{results.length !== 1 ? "s" : ""} found
              {isAIEnhanced && " (AI Enhanced)"}
            </Text>
          </View>
        )}

        <FlatList
          data={results}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultsList}
          ListEmptyComponent={renderEmptyState}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFD",
  },
  searchHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#1F2937",
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: "#256E63",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#F3F4F6",
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    color: "#374151",
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeFilterButton: {
    backgroundColor: "#256E63",
    borderColor: "#256E63",
  },
  filterButtonText: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    color: "#6B7280",
  },
  activeFilterButtonText: {
    color: "#FFFFFF",
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  resultsCount: {
    fontSize: 14,
    fontFamily: "Rubik_500Medium",
    color: "#6B7280",
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  reference: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: "#256E63",
  },
  verseText: {
    fontSize: 16,
    fontFamily: "Rubik_400Regular",
    color: "#1F2937",
    lineHeight: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Rubik_600SemiBold",
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  interpretationContainer: {
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  interpretationText: {
    fontSize: 14,
    fontFamily: "Rubik_400Regular",
    color: "#1F2937",
    fontStyle: "italic",
  },
  suggestionsContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  suggestionsLabel: {
    fontSize: 14,
    fontFamily: "Rubik_600SemiBold",
    color: "#374151",
    marginBottom: 8,
  },
  suggestionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#256E63",
  },
  suggestionText: {
    fontSize: 12,
    fontFamily: "Rubik_500Medium",
    color: "#256E63",
  },
  referenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  testamentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  oldTestamentBadge: {
    backgroundColor: "#FEF3C7",
  },
  newTestamentBadge: {
    backgroundColor: "#DBEAFE",
  },
  testamentBadgeText: {
    fontSize: 10,
    fontFamily: "Rubik_600SemiBold",
    color: "#374151",
  },
  relevanceScore: {
    fontSize: 11,
    fontFamily: "Rubik_500Medium",
    color: "#6B7280",
  },
  highlightedText: {
    backgroundColor: "#FEF3C7",
    fontWeight: "600",
    color: "#92400E",
  },
  explanation: {
    fontSize: 12,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
    fontStyle: "italic",
    marginTop: 6,
  },
});
