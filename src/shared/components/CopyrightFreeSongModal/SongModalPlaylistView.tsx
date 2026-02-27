/**
 * SongModalPlaylistView - My Playlists list modal
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { UI_CONFIG } from "../../../src/shared/constants";
import type { Playlist } from "../../store/usePlaylistStore";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface SongModalPlaylistViewProps {
  visible: boolean;
  playlists: Playlist[];
  isLoadingPlaylists: boolean;
  animatedStyle: any;
  onClose: () => void;
  onSelectPlaylist: (playlist: Playlist) => void;
}

export function SongModalPlaylistView({
  visible,
  playlists,
  isLoadingPlaylists,
  animatedStyle,
  onClose,
  onSelectPlaylist,
}: SongModalPlaylistViewProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          justifyContent: "flex-end",
        }}
      >
        <Animated.View
          style={[
            {
              backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
              borderTopLeftRadius: UI_CONFIG.BORDER_RADIUS.XL,
              borderTopRightRadius: UI_CONFIG.BORDER_RADIUS.XL,
              maxHeight: SCREEN_HEIGHT * 0.85,
              paddingTop: UI_CONFIG.SPACING.MD,
            },
            animatedStyle,
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: UI_CONFIG.SPACING.MD,
              paddingVertical: UI_CONFIG.SPACING.MD,
              borderBottomWidth: 1,
              borderBottomColor: UI_CONFIG.COLORS.BORDER,
            }}
          >
            <Text
              style={{
                fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XL,
                fontFamily: "Rubik-SemiBold",
                color: UI_CONFIG.COLORS.TEXT_PRIMARY,
              }}
            >
              My Playlists
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: UI_CONFIG.COLORS.SURFACE,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons
                name="close"
                size={20}
                color={UI_CONFIG.COLORS.TEXT_SECONDARY}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: UI_CONFIG.SPACING.MD,
              paddingBottom: UI_CONFIG.SPACING.XL,
            }}
          >
            {playlists.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  justifyContent: "center",
                  paddingVertical: UI_CONFIG.SPACING.XXL,
                }}
              >
                <Ionicons
                  name="musical-notes-outline"
                  size={64}
                  color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                />
                <Text
                  style={{
                    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.LG,
                    fontFamily: "Rubik-SemiBold",
                    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                    marginTop: UI_CONFIG.SPACING.MD,
                  }}
                >
                  {isLoadingPlaylists ? "Loading playlists..." : "No Playlists Yet"}
                </Text>
                {!isLoadingPlaylists && (
                  <Text
                    style={{
                      fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                      fontFamily: "Rubik",
                      color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                      marginTop: UI_CONFIG.SPACING.SM,
                      textAlign: "center",
                    }}
                  >
                    Create a playlist to organize your favorite songs
                  </Text>
                )}
              </View>
            ) : (
              <View style={{ gap: UI_CONFIG.SPACING.MD }}>
                {playlists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    onPress={() => onSelectPlaylist(playlist)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: UI_CONFIG.COLORS.SURFACE,
                      borderRadius: UI_CONFIG.BORDER_RADIUS.LG,
                      padding: UI_CONFIG.SPACING.MD,
                      borderWidth: 1,
                      borderColor: UI_CONFIG.COLORS.BORDER,
                      ...UI_CONFIG.SHADOWS.SM,
                    }}
                  >
                    <View
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                        backgroundColor: UI_CONFIG.COLORS.SECONDARY + "20",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: UI_CONFIG.SPACING.MD,
                        overflow: "hidden",
                      }}
                    >
                      {playlist.thumbnailUrl ? (
                        <Image
                          source={playlist.thumbnailUrl}
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <Image
                          source={require("../../../assets/images/Jevah.png")}
                          style={{
                            width: 60,
                            height: 60,
                            borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                          }}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
                          fontFamily: "Rubik-SemiBold",
                          color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                        }}
                        numberOfLines={1}
                      >
                        {playlist.name}
                      </Text>
                      {playlist.description && (
                        <Text
                          style={{
                            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                            fontFamily: "Rubik",
                            color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                            marginTop: 4,
                          }}
                          numberOfLines={1}
                        >
                          {playlist.description}
                        </Text>
                      )}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginTop: 4,
                        }}
                      >
                        <Ionicons
                          name="musical-note"
                          size={12}
                          color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                        />
                        <Text
                          style={{
                            fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XS,
                            fontFamily: "Rubik",
                            color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                            marginLeft: 4,
                          }}
                        >
                          {playlist.songs.length} song
                          {playlist.songs.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={UI_CONFIG.COLORS.TEXT_SECONDARY}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
