/**
 * SongModalPlaylistSelection - Add to Playlist modal
 */
import { Ionicons } from "@expo/vector-icons";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { AnimatedButton } from "../../../src/shared/components/AnimatedButton";
import { UI_CONFIG } from "../../../src/shared/constants";
import type { Playlist } from "../../store/usePlaylistStore";

export interface SongModalPlaylistSelectionProps {
  visible: boolean;
  playlists: Playlist[];
  isLoadingPlaylists: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onDeletePlaylist: (playlistId: string) => void;
}

export function SongModalPlaylistSelection({
  visible,
  playlists,
  isLoadingPlaylists,
  onClose,
  onCreateNew,
  onAddToPlaylist,
  onDeletePlaylist,
}: SongModalPlaylistSelectionProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 16,
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              width: "100%",
              maxWidth: 400,
              maxHeight: "80%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: "Rubik-SemiBold",
                  color: "#111827",
                }}
              >
                Add to Playlist
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16 }}
            >
              {/* Premium Create New Playlist Button */}
              <TouchableOpacity
                onPress={onCreateNew}
                activeOpacity={0.8}
                style={{
                  marginBottom: 24,
                  overflow: "hidden",
                  borderRadius: 16,
                  elevation: 4,
                  shadowColor: UI_CONFIG.COLORS.SECONDARY,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 10,
                }}
              >
                <View
                  style={{
                    backgroundColor: UI_CONFIG.COLORS.SECONDARY,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: 10
                    }}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                  </View>
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontFamily: "Rubik-SemiBold",
                      fontSize: 15,
                      letterSpacing: 0.2
                    }}
                  >
                    Create New Playlist
                  </Text>
                </View>
              </TouchableOpacity>


              {isLoadingPlaylists ? (
                <View style={{ paddingVertical: 32, alignItems: "center" }}>
                  <Text style={{ textAlign: "center", color: "#6B7280", fontFamily: "Rubik" }}>
                    Loading playlists...
                  </Text>
                </View>
              ) : playlists.length === 0 ? (
                <Text style={{ textAlign: "center", color: "#6B7280", fontFamily: "Rubik", paddingVertical: 32 }}>
                  No playlists yet. Create one to get started!
                </Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {playlists.map((playlist) => (
                    <View
                      key={playlist.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 16,
                        backgroundColor: "#FFFFFF",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                        borderRadius: 12,
                        marginBottom: 12,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 2,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <Text
                          style={{
                            fontFamily: "Rubik-SemiBold",
                            color: "#111827",
                            fontSize: 16,
                          }}
                        >
                          {playlist.name}
                        </Text>
                        {playlist.description && (
                          <Text
                            style={{ fontSize: 14, color: "#6B7280", fontFamily: "Rubik", marginTop: 4 }}
                          >
                            {playlist.description}
                          </Text>
                        )}
                        <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                          <Ionicons name="musical-notes" size={14} color="#9CA3AF" />
                          <Text style={{ fontSize: 12, color: "#9CA3AF", fontFamily: "Rubik", marginLeft: 4 }}>
                            {playlist.songs.length} song{playlist.songs.length !== 1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <AnimatedButton
                          onPress={() => onAddToPlaylist(playlist.id)}
                          style={{
                            backgroundColor: UI_CONFIG.COLORS.SUCCESS,
                            paddingHorizontal: UI_CONFIG.SPACING.LG,
                            paddingVertical: 10,
                            borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                          }}
                        >
                          <Text
                            style={{
                              color: "#FFFFFF",
                              fontFamily: "Rubik-SemiBold",
                              fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                            }}
                          >
                            Add
                          </Text>
                        </AnimatedButton>
                        <AnimatedButton
                          onPress={() => onDeletePlaylist(playlist.id)}
                          style={{
                            backgroundColor: UI_CONFIG.COLORS.ERROR,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                          }}
                        >
                          <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                        </AnimatedButton>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
