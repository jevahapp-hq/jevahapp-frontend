/**
 * Ebook cover / open surface.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableWithoutFeedback, View } from "react-native";
import { SafeImage } from "../../../../../app/components/SafeImage";
import type { MediaItem } from "../../../../shared/types";

export function EbookCardCoverArea(props: {
  ebook: MediaItem;
  onPress: () => void;
}) {
  const { ebook, onPress } = props;

  const isValidHttp = (u?: string) =>
    typeof u === "string" && /^https?:\/\//.test(u);
  const rawThumb =
    typeof (ebook as any).thumbnailUrl === "string"
      ? ((ebook as any).thumbnailUrl as string)
      : (ebook as any).thumbnailUrl?.uri;
  const initialThumb = isValidHttp(rawThumb) ? rawThumb : undefined;
  const [imageErrored, setImageErrored] = useState(false);
  const shouldShowImage = !!initialThumb && !imageErrored;

  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <View className="w-full h-[400px] overflow-hidden relative">
        {shouldShowImage ? (
          <SafeImage
            uri={initialThumb!}
            style={{
              width: "100%",
              height: "100%",
              position: "absolute",
            }}
            size="large"
            onError={() => setImageErrored(true)}
          />
        ) : (
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "#e5e7eb",
            }}
          />
        )}

        <View className="absolute top-4 left-4">
          <View className="bg-black/50 px-2 py-1 rounded-full flex-row items-center">
            <Ionicons name="book" size={16} color="#FFFFFF" />
          </View>
        </View>

        <View
          className="absolute inset-0 justify-center items-center"
          pointerEvents="none"
        >
          <View className="bg-white/70 p-4 rounded-full">
            <Ionicons name="book" size={40} color="#FEA74E" />
          </View>
        </View>

        <View className="absolute bottom-9 left-3 right-3 px-4 py-2 rounded-md">
          <Text
            className="text-white font-semibold text-sm"
            numberOfLines={2}
            style={{
              textShadowColor: "rgba(0, 0, 0, 0.8)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
          >
            {ebook.title}
          </Text>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
