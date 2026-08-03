import React from "react";
import { Image, View } from "react-native";

export interface PlayerArtworkProps {
  imageSource: { uri: string } | null;
  albumArtSize: number;
}

export function PlayerArtwork({ imageSource, albumArtSize }: PlayerArtworkProps) {
  return (
    <View style={{ alignItems: "center", marginTop: 40 }}>
      {imageSource && (
        <View
          style={{
            width: albumArtSize * 1.1,
            height: albumArtSize * 1.1,
            borderRadius: 32,
            backgroundColor: "#1A1A1A",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 25 },
            shadowOpacity: 0.6,
            shadowRadius: 35,
            elevation: 25,
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <Image
            source={imageSource}
            style={{ width: "100%", height: "100%", borderRadius: 32 }}
            resizeMode="cover"
          />
          <View
            style={{
              position: "absolute",
              bottom: -20,
              alignSelf: "center",
              width: "80%",
              height: 20,
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: 10,
              filter: "blur(20px)",
            } as any}
          />
        </View>
      )}
    </View>
  );
}
