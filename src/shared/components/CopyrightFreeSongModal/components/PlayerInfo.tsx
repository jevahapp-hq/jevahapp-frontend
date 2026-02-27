import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface PlayerInfoProps {
    title: string;
    artist: string;
    isLiked: boolean;
    onToggleLike: () => void;
    isTogglingLike: boolean;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({
    title,
    artist,
    isLiked,
    onToggleLike,
    isTogglingLike,
}) => {
    return (
        <View style={{ alignItems: "flex-start", marginTop: 20 }}>
            <View
                style={{
                    width: "100%",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                }}
            >
                <View style={{ flex: 1, marginRight: 16 }}>
                    <Text
                        style={{
                            fontSize: 32,
                            fontFamily: "Rubik_700Bold",
                            color: "#FFFFFF",
                            letterSpacing: -1,
                            lineHeight: 38,
                        }}
                        numberOfLines={2}
                    >
                        {title}
                    </Text>
                    <Text
                        style={{
                            fontSize: 18,
                            fontFamily: "Rubik_400Regular",
                            color: "rgba(255, 255, 255, 0.65)",
                            marginTop: 4,
                        }}
                        numberOfLines={1}
                    >
                        {artist}
                    </Text>
                </View>

                <TouchableOpacity
                    onPress={onToggleLike}
                    disabled={isTogglingLike}
                    style={{
                        width: 50,
                        height: 50,
                        borderRadius: 25,
                        backgroundColor: isLiked
                            ? "rgba(255, 107, 107, 0.15)"
                            : "rgba(255, 255, 255, 0.1)",
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: isLiked
                            ? "rgba(255, 107, 107, 0.4)"
                            : "rgba(255, 255, 255, 0.2)",
                    }}
                >
                    <Ionicons
                        name={isLiked ? "heart" : "heart-outline"}
                        size={26}
                        color={isLiked ? "#FF6B6B" : "#FFFFFF"}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};
