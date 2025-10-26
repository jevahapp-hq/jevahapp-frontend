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
  bibleApiService,
  BibleVerse,
  SearchResult,
} from "../../services/bibleApiService";

interface BibleSearchProps {
  onVerseSelect: (verse: BibleVerse) => void;
}

export default function BibleSearch({ onVerseSelect }: BibleSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTestament, setSelectedTestament] = useState<
    "all" | "old" | "new"
  >("all");
  const [selectedBook, setSelectedBook] = useState<string>("");

  const searchBible = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setHasSearched(true);

      const searchOptions = {
        ...(selectedTestament !== "all" && { testament: selectedTestament }),
        ...(selectedBook && { book: selectedBook }),
        limit: 50,
        offset: 0,
      };

      const searchResult: SearchResult = await bibleApiService.searchBible(
        query.trim(),
        searchOptions
      );
      setResults(searchResult.verses || []);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

  const renderSearchResult = ({ item }: { item: BibleVerse }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onVerseSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.reference}>
          {item.bookName} {item.chapterNumber}:{item.verseNumber}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      </View>
      <Text style={styles.verseText} numberOfLines={3}>
        {item.text}
      </Text>
    </TouchableOpacity>
  );

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

      {/* Results */}
      <View style={styles.resultsContainer}>
        {results.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {results.length} result{results.length !== 1 ? "s" : ""} found
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
});


