import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Text, View } from "react-native";
import AuthHeader from "../components/AuthHeader";

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
        <Text style={{ fontSize: 28, fontWeight: "700", color: "#111", fontFamily: "Rubik-Bold" }}>
          {hymn.title}
        </Text>
        <Text style={{ marginTop: 8, color: "#475467", fontSize: 18, fontFamily: "Rubik-Medium" }}>
          {(hymn.author || "Unknown").toString()}
        </Text>
        <Text style={{ marginTop: 4, color: "#667085", fontSize: 16, fontFamily: "Rubik-Regular" }}>
          {(hymn.meter || hymn.refs || "Hymn").toString()}
        </Text>
      </View>
    );
  }, [hymn]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <AuthHeader 
        title="Hymn" 
        showCancel={false}
        showBack={true}
      />

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
          contentContainerStyle={{ 
            paddingBottom: 40,
            paddingTop: 8,
            flexGrow: 1
          }}
          showsVerticalScrollIndicator={true}
          bounces={true}
          scrollEventThrottle={16}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={5}
          getItemLayout={(data, index) => ({
            length: 120, // Estimated height per verse
            offset: 120 * index,
            index,
          })}
          renderItem={({ item, index }) => (
            <View style={{ 
              paddingHorizontal: 16, 
              marginTop: 20,
              marginBottom: 8,
              backgroundColor: '#ffffff',
              borderRadius: 8,
              paddingVertical: 12,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: 1,
              },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}>
              <Text
                style={{ 
                  color: "#111", 
                  fontWeight: "600", 
                  marginBottom: 16, 
                  fontSize: 18, 
                  fontFamily: "Rubik-SemiBold" 
                }}
              >
                Verse {index + 1}
              </Text>
              <Text style={{ 
                color: "#1D2939", 
                lineHeight: 30, 
                fontSize: 17, 
                fontFamily: "Rubik-Regular",
                textAlign: 'left'
              }}>
                {item}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}
