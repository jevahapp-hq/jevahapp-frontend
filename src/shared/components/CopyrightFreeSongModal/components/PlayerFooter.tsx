import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface PlayerFooterProps {
    isMuted: boolean;
    onToggleMute: () => void;
    onOpenPlaylistView: () => void;
}

export const PlayerFooter: React.FC<PlayerFooterProps> = ({
    isMuted,
    onToggleMute,
    onOpenPlaylistView,
}) => {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 20,
            }}
        >
            <TouchableOpacity
                onPress={onToggleMute}
                style={{
                    padding: 12,
                    borderRadius: 20,
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                }}
            >
                <Ionicons
                    name={isMuted ? "volume-mute" : "volume-medium"}
                    size={22}
                    color="#FFFFFF"
                />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={onOpenPlaylistView}
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 24,
                    backgroundColor: "rgba(255, 255, 255, 0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.15)",
                }}
            >
                <Ionicons name="list" size={20} color="#FFFFFF" />
                <Text
                    style={{
                        color: "#FFFFFF",
                        marginLeft: 8,
                        fontFamily: "Rubik_600SemiBold",
                    }}
                >
                    Queue
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={{
                    padding: 12,
                    borderRadius: 20,
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                }}
            >
                <Ionicons name="share-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
        </View>
    );
};
