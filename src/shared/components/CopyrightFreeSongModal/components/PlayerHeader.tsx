import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

export interface PlayerHeaderProps {
    onClose: () => void;
    onOptionsPress: () => void;
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({
    onClose,
    onOptionsPress,
}) => {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 24,
                paddingTop: Platform.OS === "ios" ? 12 : 24,
                paddingBottom: 16,
                zIndex: 100, // Ensure it's above everything
            }}
        >
            <TouchableOpacity
                onPress={onClose}
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} // MASSIVE hitSlop for easy closing
            >
                <Ionicons name="chevron-down" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ alignItems: "center" }}>
                <Text
                    style={{
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: 10,
                        fontFamily: "Rubik_700Bold",
                        letterSpacing: 3,
                        textTransform: "uppercase",
                    }}
                >
                    Now Playing
                </Text>
            </View>

            <TouchableOpacity
                onPress={onOptionsPress}
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.1)",
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
                <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
};
