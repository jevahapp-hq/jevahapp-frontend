import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import HymnMiniCard, { HymnItem } from "../home/components/HymnMiniCard";
import { UI_CONFIG } from "../../src/shared/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 2 columns with padding

export default function Hymns() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [hymns, setHymns] = useState<HymnItem[]>([]);
  const [loadingHymns, setLoadingHymns] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch local hymns JSON; fallback to Hymnary sample (MVP)
  useEffect(() => {
    const fetchHymns = async () => {
      try {
        setLoadingHymns(true);
        try {
          const mod = await import("../../assets/hymns.json");
          const local = (mod as any).default as HymnItem[];
          if (Array.isArray(local) && local.length) {
            setHymns(local);
            return;
          }
        } catch {}

        // Fallback to external sample
        try {
          const res = await fetch(
            "https://hymnary.org/api/scripture?reference=Psalm+136"
          );
          const json = await res.json();
          const items = Object.values(json || {})
            .slice(0, 50) // Get more hymns for the grid
            .map((h: any) => ({
              id: h.title || Math.random().toString(36).slice(2),
              title: h.title,
              author: h.author || h.paraphraser || h.translator || "Unknown",
              meter: h.meter,
              refs: String(h["scripture references"] || "").trim(),
            }));
          setHymns(items as HymnItem[]);
        } catch {}
      } catch (e) {
        console.warn("Hymnary fetch failed:", e);
      } finally {
        setLoadingHymns(false);
      }
    };
    fetchHymns();
  }, []);

  // Filter hymns based on search query
  const filteredHymns = useMemo(() => {
    if (!searchQuery.trim()) {
      return hymns;
    }
    const query = searchQuery.toLowerCase();
    return hymns.filter(
      (hymn) =>
        hymn.title?.toLowerCase().includes(query) ||
        hymn.author?.toLowerCase().includes(query) ||
        hymn.meter?.toLowerCase().includes(query) ||
        hymn.refs?.toLowerCase().includes(query)
    );
  }, [hymns, searchQuery]);

  const handleHymnPress = useCallback(
    (item: HymnItem) => {
      router.push({
        pathname: "/reader/HymnDetail",
        params: { id: item.id },
      });
    },
    [router]
  );

  const renderHymnItem = useCallback(
    ({ item, index }: { item: HymnItem; index: number }) => {
      return (
        <View
          style={{
            width: CARD_WIDTH,
            marginLeft: index % 2 === 0 ? 16 : 8,
            marginRight: index % 2 === 1 ? 16 : 8,
            marginBottom: 24,
          }}
        >
          <HymnMiniCard
            item={item}
            onPress={handleHymnPress}
            variant="grid"
          />
        </View>
      );
    },
    [handleHymnPress]
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#FCFCFD" }}>
      {/* Search Bar */}
      <View
        style={{
          paddingHorizontal: UI_CONFIG.SPACING.MD,
          paddingTop: insets.top + 4,
          paddingBottom: UI_CONFIG.SPACING.MD,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#F9FAFB",
            borderRadius: 12,
            paddingHorizontal: UI_CONFIG.SPACING.MD,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: "#E5E7EB",
          }}
        >
          <Ionicons
            name="search"
            size={20}
            color={UI_CONFIG.COLORS.TEXT_SECONDARY}
            style={{ marginRight: 8 }}
          />
          <TextInput
            placeholder="Search hymns..."
            placeholderTextColor={UI_CONFIG.COLORS.TEXT_SECONDARY}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
              fontFamily: "Rubik",
              color: UI_CONFIG.COLORS.TEXT_PRIMARY,
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={UI_CONFIG.COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Hymns Grid */}
      {loadingHymns ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 40,
          }}
        >
          <ActivityIndicator
            size="large"
            color={UI_CONFIG.COLORS.PRIMARY}
          />
          <Text
            style={{
              marginTop: 16,
              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
              color: UI_CONFIG.COLORS.TEXT_SECONDARY,
              fontFamily: "Rubik",
            }}
          >
            Loading hymns...
          </Text>
        </View>
      ) : filteredHymns.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingVertical: 40,
          }}
        >
          <Ionicons
            name="search-outline"
            size={48}
            color={UI_CONFIG.COLORS.TEXT_SECONDARY}
          />
          <Text
            style={{
              marginTop: 16,
              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
              color: UI_CONFIG.COLORS.TEXT_SECONDARY,
              fontFamily: "Rubik",
            }}
          >
            {searchQuery
              ? "No hymns found matching your search"
              : "No hymns available"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHymns}
          renderItem={renderHymnItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            paddingTop: UI_CONFIG.SPACING.MD,
            paddingBottom: 100, // Space for bottom nav
          }}
          showsVerticalScrollIndicator={true}
          ListHeaderComponent={
            <View
              style={{
                paddingHorizontal: UI_CONFIG.SPACING.MD,
                marginBottom: UI_CONFIG.SPACING.MD,
              }}
            >
              <Text
                style={{
                  fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                  fontWeight: "600",
                  color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                  fontFamily: "Rubik-SemiBold",
                }}
              >
                {searchQuery
                  ? `Search Results (${filteredHymns.length})`
                  : `All Hymns (${filteredHymns.length})`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

