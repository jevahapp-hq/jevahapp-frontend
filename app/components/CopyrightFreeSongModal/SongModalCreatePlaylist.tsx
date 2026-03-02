/**
 * SongModalCreatePlaylist - Create new playlist form
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { UI_CONFIG } from "../../../src/shared/constants";

export interface SongModalCreatePlaylistProps {
  visible: boolean;
  playlistName: string;
  playlistDescription: string;
  isLoading: boolean;
  onNameChange: (text: string) => void;
  onDescriptionChange: (text: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}

export function SongModalCreatePlaylist({
  visible,
  playlistName,
  playlistDescription,
  isLoading,
  onNameChange,
  onDescriptionChange,
  onCreate,
  onCancel,
}: SongModalCreatePlaylistProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
    <TouchableOpacity
      activeOpacity={1}
      onPress={onCancel}
      style={{
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingVertical: 40,
      }}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 24,
          width: "100%",
          maxWidth: 420,
          paddingTop: 28,
          paddingBottom: 24,
          paddingHorizontal: 24,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 24,
          elevation: 16,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontFamily: "Rubik-SemiBold",
              color: "#111827",
              letterSpacing: -0.5,
            }}
          >
            Create playlist
          </Text>
          <TouchableOpacity
            onPress={onCancel}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: "#F3F4F6",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Rubik-SemiBold",
              color: "#374151",
              marginBottom: 8,
              letterSpacing: 0.2,
            }}
          >
            Playlist name
          </Text>
          <TextInput
            value={playlistName}
            onChangeText={onNameChange}
            placeholder="My playlist"
            placeholderTextColor="#9CA3AF"
            style={{
              backgroundColor: "#F9FAFB",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              fontFamily: "Rubik",
              color: "#111827",
            }}
            autoFocus
          />
        </View>

        <View style={{ marginBottom: 28 }}>
          <Text
            style={{
              fontSize: 13,
              fontFamily: "Rubik-SemiBold",
              color: "#374151",
              marginBottom: 8,
              letterSpacing: 0.2,
            }}
          >
            Description <Text style={{ color: "#9CA3AF", fontWeight: "400" }}>(optional)</Text>
          </Text>
          <TextInput
            value={playlistDescription}
            onChangeText={onDescriptionChange}
            placeholder="Add a description"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={{
              backgroundColor: "#F9FAFB",
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              fontFamily: "Rubik",
              color: "#111827",
              minHeight: 80,
            }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
          <TouchableOpacity
            onPress={onCancel}
            disabled={isLoading}
            style={{
              flex: 1,
              backgroundColor: "#F3F4F6",
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Rubik-SemiBold",
                color: "#374151",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onCreate}
            disabled={isLoading || !playlistName.trim()}
            style={{
              flex: 1,
              backgroundColor: UI_CONFIG.COLORS.SECONDARY,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              opacity: isLoading || !playlistName.trim() ? 0.6 : 1,
              shadowColor: UI_CONFIG.COLORS.SECONDARY,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Rubik-SemiBold",
                color: "#FFFFFF",
              }}
            >
              {isLoading ? "Creating..." : "Create"}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
    </Modal>
  );
}
