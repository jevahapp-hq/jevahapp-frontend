import { MusicCard } from "@/src/features/media/components/MusicCard";
import { EbookCard } from "@/src/features/media/components/EbookCard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDownloadStore } from "../store/useDownloadStore";
import type { MediaItem } from "../types/media";

export default function DownloadContentViewer() {
  const router = useRouter();
  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const {
    downloadedItems,
    isLoaded,
    loadDownloadedItems,
    isItemDownloaded,
  } = useDownloadStore();

  // Ensure downloads are loaded (e.g. if user deep-links here)
  useEffect(() => {
    if (!isLoaded) {
      loadDownloadedItems().catch(() => {});
    }
  }, [isLoaded, loadDownloadedItems]);

  const item = useMemo(
    () => downloadedItems.find((d) => d.id === id),
    [downloadedItems, id]
  );

  const mediaItem: MediaItem | null = useMemo(() => {
    if (!item) return null;
    const fileUrl = item.localPath || item.fileUrl || "";
    return {
      _id: item.id,
      contentType: item.contentType || "media",
      fileUrl,
      title: item.title || "Untitled",
      speaker: item.author || "Unknown",
      uploadedBy: item.author || "Unknown",
      description: item.description || "",
      createdAt: item.downloadedAt || new Date().toISOString(),
      imageUrl: item.thumbnailUrl || undefined,
    };
  }, [item]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => router.replace("/downloads/DownloadsScreen")}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#F3F4F6",
            alignItems: "center",
            justifyContent: "center",
          }}
          accessibilityLabel="Back to downloads"
        >
          <Text style={{ fontSize: 18 }}>{"‹"}</Text>
        </TouchableOpacity>

        <Text style={{ fontFamily: "Rubik-SemiBold", fontSize: 16 }}>
          Downloads
        </Text>

        <View style={{ width: 44, height: 44 }} />
      </View>

      {!id ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#667085", fontFamily: "Rubik" }}>
            No content selected
          </Text>
        </View>
      ) : !item || !mediaItem ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "#667085", fontFamily: "Rubik" }}>
            Content not found in downloads
          </Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {item.contentType === "audio" || item.contentType === "music" ? (
            <MusicCard
              audio={mediaItem}
              index={0}
              onLike={() => {}}
              onComment={() => {}}
              onSave={() => {}}
              onShare={() => {}}
              onDownload={() => {}}
              onPlay={(_uri, _id) => {}}
              onPause={(_id) => {}}
            />
          ) : item.contentType === "ebook" ? (
            <EbookCard
              ebook={mediaItem}
              index={0}
              onLike={() => {}}
              onComment={() => {}}
              onSave={() => {}}
              onShare={() => {}}
              onDownload={() => {}}
              checkIfDownloaded={(itemId) => isItemDownloaded(itemId)}
            />
          ) : (
            <View style={{ paddingVertical: 24 }}>
              <Text style={{ color: "#667085", fontFamily: "Rubik" }}>
                This content type isn’t supported in downloads viewer yet.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}


