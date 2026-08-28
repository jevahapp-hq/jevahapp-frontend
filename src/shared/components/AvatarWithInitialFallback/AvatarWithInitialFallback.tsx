/**
 * Avatar with initial fallback. expo-image + memory-disk so feed recycle
 * does not refetch a 30px icon on every video.
 */
import { Image } from "expo-image";
import React, { useState } from "react";
import { ImageSourcePropType, Text, View } from "react-native";

interface AvatarWithInitialFallbackProps {
  imageSource: ImageSourcePropType | string | null | undefined;
  name: string;
  size?: number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
  style?: any;
}

function resolveUri(
  imageSource: AvatarWithInitialFallbackProps["imageSource"]
): string | number | null {
  if (!imageSource) return null;
  if (typeof imageSource === "number") return imageSource;
  if (typeof imageSource === "string") {
    const t = imageSource.trim();
    return t.length ? t : null;
  }
  if (typeof imageSource === "object" && "uri" in imageSource) {
    const uri = (imageSource as { uri?: string }).uri;
    return typeof uri === "string" && uri.trim() ? uri.trim() : null;
  }
  return null;
}

export const AvatarWithInitialFallback: React.FC<
  AvatarWithInitialFallbackProps
> = ({
  imageSource,
  name,
  size = 30,
  fontSize = 14,
  backgroundColor = "transparent",
  textColor = "#344054",
  style,
}) => {
  const [errored, setErrored] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const source = resolveUri(imageSource);

  if (!errored && source) {
    return (
      <Image
        source={typeof source === "number" ? source : { uri: source }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey={typeof source === "string" ? source : String(source)}
        transition={0}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize,
          fontFamily: "PlusJakartaSans-SemiBold",
          color: textColor,
        }}
      >
        {initial}
      </Text>
    </View>
  );
};
