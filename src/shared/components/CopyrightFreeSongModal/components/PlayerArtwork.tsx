import React, { useEffect } from "react";
import type { ImageSourcePropType } from "react-native";
import { Image, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { JEVAH_LOGO } from "@/shared/brand/albumArt";

export interface PlayerArtworkProps {
  imageSource: ImageSourcePropType | null;
  albumArtSize: number;
  isPlaying?: boolean;
}

export function PlayerArtwork({
  imageSource,
  albumArtSize,
  isPlaying = false,
}: PlayerArtworkProps) {
  const source = imageSource || JEVAH_LOGO;
  const scale = useSharedValue(isPlaying ? 1 : 0.94);

  useEffect(() => {
    scale.value = withSpring(isPlaying ? 1 : 0.94, {
      damping: 15,
      stiffness: 150,
      mass: 0.8,
    });
  }, [isPlaying, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ alignItems: "center", marginTop: 4, marginBottom: 8 }}>
      <Animated.View
        style={[
          {
            width: albumArtSize * 1.08,
            height: albumArtSize * 1.08,
            borderRadius: 28,
            backgroundColor: "#121721",
            shadowColor: isPlaying ? "#256E63" : "#000000",
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: isPlaying ? 0.6 : 0.45,
            shadowRadius: 30,
            elevation: 30,
            borderWidth: 1.5,
            borderColor: "rgba(255, 255, 255, 0.18)",
            overflow: "hidden",
          },
          animatedStyle,
        ]}
      >
        <Image
          source={source}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
}
