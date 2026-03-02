/**
 * AllLibraryMediaCard - Renders video, audio, or book card for library grid
 */
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import {
  getContentTypeIcon,
  getThumbnailSource,
  isAudioContent,
  isEbookContent,
  isVideoContent,
} from "../utils/libraryHelpers";

const isValidUri = (u: any) =>
  typeof u === "string" && u.trim().length > 0 && /^https?:\/\//.test(u.trim());
const DEFAULT_VIDEO_URI =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export interface AllLibraryMediaCardProps {
  item: any;
  isPlaying: boolean;
  isAudioPlaying: boolean;
  showVideoOverlay: boolean;
  videoRefs: React.MutableRefObject<Record<string, any>>;
  dotsRefs: React.MutableRefObject<Record<string, any>>;
  menuOpenId: string | null;
  setMenuOpenId: (id: string | null) => void;
  setMenuPos: (pos: { x: number; y: number } | null) => void;
  onTogglePlay: (itemId: string) => void;
  onToggleAudioPlay: (itemId: string, fileUrl: string) => void;
  onOpenBook: (book: any) => void;
  onOpenBookInPdfViewer: (book: any) => void;
  onCheckOwnership: (item: any) => void;
  onShare: (item: any) => void;
  onDownloadRequest: (item: any) => void | Promise<void>;
  onRemoveFromLibrary: (item: any) => void;
  onDeletePress: (item: any) => void;
  isOwner: boolean;
  setPlayingVideos: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setShowOverlay: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  router: any;
}

export function AllLibraryMediaCard({
  item,
  isPlaying,
  isAudioPlaying,
  showVideoOverlay,
  videoRefs,
  dotsRefs,
  menuOpenId,
  setMenuOpenId,
  setMenuPos,
  onTogglePlay,
  onToggleAudioPlay,
  onOpenBook,
  onOpenBookInPdfViewer,
  onCheckOwnership,
  onShare,
  onDownloadRequest,
  onRemoveFromLibrary,
  onDeletePress,
  isOwner,
  setPlayingVideos,
  setShowOverlay,
  router,
}: AllLibraryMediaCardProps) {
  const itemId = item._id || item.id;
  const isVideo = isVideoContent(item);
  const isAudio = isAudioContent(item);
  const isBook =
    item.contentType === "e-books" ||
    item.contentType === "ebook" ||
    item.contentType === "books" ||
    item.contentType === "pdf" ||
    item.contentType?.toLowerCase().includes("book") ||
    item.contentType?.toLowerCase().includes("pdf") ||
    isEbookContent(item);

  const videoUrl = item.mediaUrl || item.fileUrl;
  const audioUrl = item.mediaUrl || item.fileUrl;
  const safeVideoUri = isValidUri(videoUrl) ? String(videoUrl).trim() : DEFAULT_VIDEO_URI;
  const safeAudioUri = isValidUri(audioUrl) ? String(audioUrl).trim() : "";

  const handleBookPress = () => {
    const pdfUrl = item.mediaUrl || item.fileUrl || "";
    if (typeof pdfUrl === "string" && /^https?:\/\//.test(pdfUrl)) {
      router.push({
        pathname: "/reader/PdfViewer",
        params: {
          url: pdfUrl,
          title: item.title || "Untitled",
          desc: item.description || "",
        },
      });
    } else {
      onOpenBook(item);
    }
  };

  return (
    <View
      className="w-[48%] mb-6 h-[232px] rounded-xl bg-[#E5E5EA]"
      style={{ overflow: "hidden", borderRadius: 12 }}
    >
      {isVideo ? (
        <TouchableOpacity
          onPress={() => onTogglePlay(itemId)}
          className="w-full h-full"
          activeOpacity={0.9}
          style={{ borderRadius: 12, overflow: "hidden" }}
        >
          <Video
            ref={(ref) => {
              if (ref) videoRefs.current[itemId] = ref;
            }}
            source={{ uri: safeVideoUri }}
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
              borderRadius: 12,
            }}
            resizeMode={ResizeMode.COVER}
            shouldPlay={isPlaying}
            isLooping={false}
            isMuted={false}
            useNativeControls={false}
            onError={() => {
              setPlayingVideos((prev) => ({ ...prev, [itemId]: false }));
              setShowOverlay((prev) => ({ ...prev, [itemId]: true }));
            }}
            onPlaybackStatusUpdate={(status) => {
              if (!status.isLoaded) return;
              if (status.didJustFinish) {
                setPlayingVideos((prev) => ({ ...prev, [itemId]: false }));
                setShowOverlay((prev) => ({ ...prev, [itemId]: true }));
              }
            }}
          />
          {!isPlaying && showVideoOverlay && (
            <>
              <View className="absolute inset-0 justify-center items-center">
                <View className="bg-white/70 p-2 rounded-full">
                  <Ionicons name="play" size={24} color="#FEA74E" />
                </View>
              </View>
              <View className="absolute bottom-2 left-2 right-2">
                <Text className="text-white font-rubik-bold text-sm" numberOfLines={2}>
                  {item.title}
                </Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      ) : isAudio ? (
        <TouchableOpacity
          onPress={() => safeAudioUri && onToggleAudioPlay(itemId, safeAudioUri)}
          className="w-full h-full"
          activeOpacity={0.9}
        >
          <Image
            source={getThumbnailSource(item)}
            className="h-full w-full rounded-xl"
            resizeMode="cover"
          />
          <View className="absolute inset-0 justify-center items-center">
            <View className="bg-black/60 p-3 rounded-full">
              <Ionicons
                name={isAudioPlaying ? "pause" : "play"}
                size={28}
                color="#FFFFFF"
              />
            </View>
          </View>
          <View className="absolute bottom-2 left-2 right-2">
            <Text className="text-white font-rubik-bold text-sm" numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </TouchableOpacity>
      ) : isBook ? (
        <TouchableOpacity
          onPress={handleBookPress}
          className="w-full h-full"
          activeOpacity={0.9}
          style={{ borderRadius: 12, overflow: "hidden" }}
        >
          <Image
            source={getThumbnailSource(item)}
            className="h-full w-full rounded-xl"
            style={{ borderRadius: 12 }}
            resizeMode="cover"
          />
          <View className="absolute bottom-2 left-2 right-2">
            <Text className="text-white font-rubik-bold text-sm" numberOfLines={2}>
              {item.title}
            </Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="w-full h-full"
          activeOpacity={0.9}
          style={{ borderRadius: 12, overflow: "hidden" }}
        >
          <Image
            source={getThumbnailSource(item)}
            className="h-full w-full rounded-xl"
            style={{ borderRadius: 12 }}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {!isVideo && !isAudio && !isBook && (
        <View className="absolute bottom-2 left-2 right-2">
          <Text className="text-white font-rubik-bold text-sm" numberOfLines={2}>
            {item.title}
          </Text>
        </View>
      )}

      <View
        ref={(ref) => {
          if (ref) dotsRefs.current[itemId] = ref;
        }}
        collapsable={false}
        className="absolute bottom-2 right-2 z-50"
        style={{ zIndex: 50 }}
      >
        <TouchableOpacity
          className="bg-white rounded-full p-1"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={(e) => {
            e.stopPropagation();
            onCheckOwnership(item);
            const node = dotsRefs.current[itemId];
            try {
              node?.measureInWindow?.((x: number, y: number) => {
                setMenuPos({ x, y });
                setMenuOpenId(menuOpenId === itemId ? null : itemId);
              });
            } catch {
              setMenuOpenId(menuOpenId === itemId ? null : itemId);
            }
          }}
        >
          <Ionicons name="ellipsis-vertical" size={14} color="#3A3E50" />
        </TouchableOpacity>
      </View>

      {menuOpenId === itemId && (
        <>
          <TouchableOpacity
            className="absolute inset-0"
            style={{ zIndex: 100 }}
            activeOpacity={1}
            onPress={() => setMenuOpenId(null)}
          />
          <View
            style={{
              position: "absolute",
              zIndex: 101,
              elevation: 101,
              bottom: 36,
              right: 4,
            }}
            pointerEvents="box-none"
          >
            <View
              style={{
                maxWidth: 180,
                minWidth: 148,
                borderRadius: 10,
                paddingVertical: 4,
                backgroundColor: "#FFFFFF",
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                borderWidth: 1,
                borderColor: "#E5E7EB",
                elevation: 8,
              }}
              pointerEvents="auto"
            >
              <TouchableOpacity
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={() => setMenuOpenId(null)}
              >
                <Text className="text-[#1D2939] font-rubik text-xs">View Details</Text>
                <Ionicons name="eye-outline" size={16} color="#1D2939" />
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
              <TouchableOpacity
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={() => onShare(item)}
              >
                <Text className="text-[#1D2939] font-rubik text-xs">Share</Text>
                <Feather name="send" size={16} color="#1D2939" />
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
              <TouchableOpacity
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={async () => {
                  try {
                    await onDownloadRequest(item);
                    setMenuOpenId(null);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                <Text className="text-[#1D2939] font-rubik text-xs">Download</Text>
                <Ionicons name="download-outline" size={16} color="#1D2939" />
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
              <TouchableOpacity
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onPress={() => onRemoveFromLibrary(item)}
              >
                <Text className="text-[#1D2939] font-rubik text-xs">Remove</Text>
                <MaterialIcons name="bookmark" size={16} color="#1D2939" />
              </TouchableOpacity>
              {isOwner && (
                <>
                  <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />
                  <TouchableOpacity
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                    onPress={() => onDeletePress(item)}
                  >
                    <Text className="text-[#EF4444] font-rubik text-xs">Delete</Text>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </>
      )}

      <View className="absolute top-2 right-2 bg-black/40 rounded-full p-2">
        <Ionicons name={getContentTypeIcon(item.contentType)} size={12} color="#FFFFFF" />
      </View>

      {item.isPublicDomain && (
        <View className="absolute top-2 left-2 bg-green-500/80 rounded-full px-2 py-1">
          <Text className="text-white text-xs font-bold">FREE</Text>
        </View>
      )}
    </View>
  );
}
