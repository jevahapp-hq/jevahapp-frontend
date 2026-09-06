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
    <View style={{ alignItems: "center", justifyContent: "center", marginVertical: 4 }}>
      <Animated.View
        style={[
          {
            width: albumArtSize,
            height: albumArtSize,
            borderRadius: 24,
            backgroundColor: "#121721",
            shadowColor: isPlaying ? "#256E63" : "#000000",
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: isPlaying ? 0.55 : 0.4,
            shadowRadius: 24,
            elevation: 2,
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
