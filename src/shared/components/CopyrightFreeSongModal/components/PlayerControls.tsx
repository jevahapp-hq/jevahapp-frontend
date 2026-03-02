import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "../../../constants";

export interface PlayerControlsProps {
    isPlaying: boolean;
    isShuffled: boolean;
    repeatMode: "none" | "all" | "one";
    onTogglePlay: () => void;
    onSkip: (seconds: number) => void;
    onRepeatCycle: () => void;
    onToggleShuffle: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
    isPlaying,
    isShuffled,
    repeatMode,
    onTogglePlay,
    onSkip,
    onRepeatCycle,
    onToggleShuffle,
}) => {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
            }}
        >
            <TouchableOpacity onPress={onToggleShuffle} activeOpacity={0.7}>
                <Ionicons
                    name="shuffle"
                    size={24}
                    color={
                        isShuffled ? UI_CONFIG.COLORS.PRIMARY : "rgba(255, 255, 255, 0.4)"
                    }
                />
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 32 }}>
                <TouchableOpacity onPress={() => onSkip(-15)} activeOpacity={0.7}>
                    <Ionicons name="play-back" size={36} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onTogglePlay}
                    activeOpacity={0.8}
                    style={{
                        width: 90,
                        height: 90,
                        borderRadius: 45,
                        backgroundColor: "#FFFFFF",
                        justifyContent: "center",
                        alignItems: "center",
                        shadowColor: "#FFFFFF",
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.3,
                        shadowRadius: 20,
                    }}
                >
                    <Ionicons
                        name={isPlaying ? "pause" : "play"}
                        size={44}
                        color="#000000"
                        style={{ marginLeft: isPlaying ? 0 : 4 }}
                    />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => onSkip(15)} activeOpacity={0.7}>
                    <Ionicons name="play-forward" size={36} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={onRepeatCycle} activeOpacity={0.7}>
                <Ionicons
                    name={repeatMode === "one" ? "repeat-outline" : "repeat"}
                    size={24}
                    color={
                        repeatMode !== "none" ? UI_CONFIG.COLORS.PRIMARY : "rgba(255, 255, 255, 0.4)"
                    }
                />
                {repeatMode === "one" && (
                    <View style={{ position: "absolute", top: 10, left: 10 }}>
                        <Text
                            style={{
                                fontSize: 8,
                                color: UI_CONFIG.COLORS.PRIMARY,
                                fontWeight: "900",
                            }}
                        >
                            1
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    );
};
