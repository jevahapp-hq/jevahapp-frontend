import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

export default function WebPage() {
  const router = useRouter();
  const { url: rawUrl, title: rawTitle } = useLocalSearchParams<{
    url?: string;
    title?: string;
  }>();
  const url = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  const title = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle;
  const safeUrl = useMemo(() => (typeof url === "string" ? url : ""), [url]);

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
          {title || "Page"}
        </Text>
      </View>
      {safeUrl ? (
        <WebView source={{ uri: safeUrl }} />
      ) : (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#666" }}>No URL</Text>
        </View>
      )}
    </View>
  );
}

