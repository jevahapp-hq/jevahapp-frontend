import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Text, View } from "react-native";
import { UI_CONFIG } from "../../../constants";

export interface PlayerProgressBarProps {
    displayProgress: number;
    displayPositionMs: number;
    durationMs: number;
    formatTime: (ms: number) => string;
    progressBarRef: React.RefObject<View>;
    panHandlers: any;
}

export const PlayerProgressBar: React.FC<PlayerProgressBarProps> = ({
    displayProgress,
    displayPositionMs,
    durationMs,
    formatTime,
    progressBarRef,
    panHandlers,
}) => {
    return (
        <View>
            <View
                ref={progressBarRef}
                style={{
                    height: 32,
                    justifyContent: "center",
                }}
                {...panHandlers}
            >
                <View
                    style={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "rgba(255, 255, 255, 0.15)",
                        overflow: "hidden",
                    }}
                >
                    <LinearGradient
                        colors={[UI_CONFIG.COLORS.PRIMARY, UI_CONFIG.COLORS.SECONDARY]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                            height: "100%",
                            width: `${displayProgress * 100}%`,
                        }}
                    />
                </View>
                {/* Liquid Knob Appearance */}
                <View
                    pointerEvents="none"
                    style={{
                        position: "absolute",
                        left: `${displayProgress * 100}%`,
                        transform: [{ translateX: -8 }],
                    }}
                >
                    <View
                        style={{
                            width: 16,
                            height: 16,
                            borderRadius: 8,
                            backgroundColor: "#FFFFFF",
                            shadowColor: UI_CONFIG.COLORS.PRIMARY,
                            shadowOffset: { width: 0, height: 0 },
                            shadowOpacity: 0.8,
                            shadowRadius: 10,
                            elevation: 10,
                        }}
                    />
                </View>
            </View>
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginTop: 4,
                }}
            >
                <Text
                    style={{
                        fontSize: 12,
                        color: "rgba(255, 255, 255, 0.5)",
                        fontFamily: "Rubik_500Medium",
                    }}
                >
                    {formatTime(displayPositionMs)}
                </Text>
                <Text
                    style={{
                        fontSize: 12,
                        color: "rgba(255, 255, 255, 0.5)",
                        fontFamily: "Rubik_500Medium",
                    }}
                >
                    {formatTime(durationMs)}
                </Text>
            </View>
        </View>
    );
};
