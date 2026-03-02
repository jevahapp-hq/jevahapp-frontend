/**
 * AvatarWithInitialFallback Component
 * Reusable avatar component with initial fallback
 */

import React, { useState } from "react";
import { Image, Text, View, ImageSourcePropType } from "react-native";

interface AvatarWithInitialFallbackProps {
  imageSource: ImageSourcePropType | string | null | undefined;
  name: string;
  size?: number;
  fontSize?: number;
  backgroundColor?: string;
  textColor?: string;
  style?: any;
}

export const AvatarWithInitialFallback: React.FC<AvatarWithInitialFallbackProps> = ({
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

  if (!errored && imageSource) {
    return (
      <Image
        source={typeof imageSource === "string" ? { uri: imageSource } : imageSource}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
        resizeMode="cover"
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
          fontFamily: "Rubik-SemiBold",
          color: textColor,
        }}
      >
        {initial}
      </Text>
    </View>
  );
};

