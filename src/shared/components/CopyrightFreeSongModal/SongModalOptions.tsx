/**
 * SongModalOptions - Options bottom sheet (views, add to playlist, cancel)
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export interface SongModalOptionsProps {
  visible: boolean;
  song: any;
  viewCount: number;
  optionsSongData: any | null;
  loadingOptionsSong: boolean;
  onClose: () => void;
  onAddToPlaylist: () => void;
}

export function SongModalOptions({
  visible,
  song,
  viewCount,
  optionsSongData,
  loadingOptionsSong,
  onClose,
  onAddToPlaylist,
}: SongModalOptionsProps) {
  const displayCount =
    optionsSongData?.views ?? optionsSongData?.viewCount ?? viewCount ?? 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 28,
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: 999,
              backgroundColor: "#E5E7EB",
              marginBottom: 16,
            }}
          />

          {song && (
            <>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#111827",
                  marginBottom: 4,
                  fontFamily: "Rubik-SemiBold",
                }}
                numberOfLines={1}
              >
                {song.title}
              </Text>
              <Text
                style={{
                  fontSize: 13,
                  color: "#6B7280",
                  marginBottom: 12,
                  fontFamily: "Rubik",
                }}
                numberOfLines={1}
              >
                {song.artist}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "#F9FAFB",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                }}
              >
                <Ionicons name="eye" size={20} color="#256E63" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6B7280",
                      fontFamily: "Rubik",
                      marginBottom: 2,
                    }}
                  >
                    Total Views
                  </Text>
                  {loadingOptionsSong ? (
                    <ActivityIndicator size="small" color="#256E63" />
                  ) : (
                    <Text
                      style={{
                        fontSize: 18,
                        color: "#111827",
                        fontWeight: "600",
                        fontFamily: "Rubik-SemiBold",
                      }}
                    >
                      {Number(displayCount).toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
            </>
          )}

          <TouchableOpacity
            onPress={() => {
              onClose();
              onAddToPlaylist();
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
            }}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: "#EEF2FF",
                justifyContent: "center",
                alignItems: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="list" size={18} color="#4F46E5" />
            </View>
            <Text
              style={{
                fontSize: 15,
                color: "#111827",
                fontWeight: "500",
                fontFamily: "Rubik-Medium",
              }}
            >
              Add to playlist
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 8,
              paddingVertical: 12,
              alignItems: "center",
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                fontSize: 15,
                color: "#6B7280",
                fontWeight: "500",
                fontFamily: "Rubik-Medium",
              }}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
