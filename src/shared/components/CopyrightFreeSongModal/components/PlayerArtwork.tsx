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
            borderRadius: 16,
            backgroundColor: "#12332E",
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.45,
            shadowRadius: 24,
            elevation: 16,
            borderWidth: 0,
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
