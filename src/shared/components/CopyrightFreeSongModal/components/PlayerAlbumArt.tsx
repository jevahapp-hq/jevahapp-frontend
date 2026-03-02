import React from "react";
import { Image, View } from "react-native";
import { UI_CONFIG } from "../../../constants";

export interface PlayerAlbumArtProps {
    imageSource: { uri: string } | null;
    albumArtSize: number;
}

export const PlayerAlbumArt: React.FC<PlayerAlbumArtProps> = ({
    imageSource,
    albumArtSize,
}) => {
    if (!imageSource) return null;

    return (
        <View style={{ alignItems: "center" }}>
            <View
                style={{
                    width: albumArtSize + 24,
                    height: albumArtSize + 24,
                    justifyContent: "center",
                    alignItems: "center",
                    position: "relative",
                }}
            >
                {/* Dynamic Outer Glow */}
                <View
                    style={{
                        position: "absolute",
                        width: albumArtSize,
                        height: albumArtSize,
                        borderRadius: 40,
                        backgroundColor: UI_CONFIG.COLORS.PRIMARY,
                        opacity: 0.3,
                        transform: [{ scale: 1.15 }],
                    }}
                />
                <View
                    style={{
                        width: albumArtSize,
                        height: albumArtSize,
                        borderRadius: 40,
                        overflow: "hidden",
                        backgroundColor: "#222",
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 24 },
                        shadowOpacity: 0.6,
                        shadowRadius: 36,
                        elevation: 24,
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.2)",
                    }}
                >
                    <Image
                        source={imageSource}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                    />
                </View>
            </View>
        </View>
    );
};
