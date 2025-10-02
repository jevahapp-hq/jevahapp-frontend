import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";

type HymnRecord = {
  id: string;
  title: string;
  author?: string;
  meter?: string;
  refs?: string;
  verses?: string[];
};

export default function HymnDetail() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [hymn, setHymn] = useState<HymnRecord | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const mod = await import("../../assets/hymns.json");
        const list = (mod as any).default as HymnRecord[];
        const found = list.find((h) => h.id === id) || null;
        setHymn(found);
      } catch (e) {
        setHymn(null);
      }
    }
    load();
  }, [id]);

  const header = useMemo(() => {
    if (!hymn) return null;
    return (
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", color: "#111" }}>
          {hymn.title}
        </Text>
        <Text style={{ marginTop: 4, color: "#475467" }}>
          {(hymn.author || "Unknown").toString()}
        </Text>
        <Text style={{ marginTop: 2, color: "#667085" }}>
          {(hymn.meter || hymn.refs || "Hymn").toString()}
        </Text>
      </View>
    );
  }, [hymn]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ padding: 8, marginRight: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111" />
        </TouchableOpacity>
        <Text
          style={{ fontSize: 16, fontWeight: "600", color: "#111" }}
          numberOfLines={1}
        >
          Hymn
        </Text>
      </View>

      {!hymn ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#666" }}>Hymn not found</Text>
        </View>
      ) : (
        <FlatList
          data={hymn.verses || []}
          keyExtractor={(v, i) => `${hymn.id}-v-${i}`}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item, index }) => (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <Text
                style={{ color: "#111", fontWeight: "600", marginBottom: 8 }}
              >
                Verse {index + 1}
              </Text>
              <Text style={{ color: "#1D2939", lineHeight: 22 }}>{item}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
