/**
 * SongModalPlaylistDetail - Songs in a selected playlist
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { AnimatedButton } from "../../../src/shared/components/AnimatedButton";
import { UI_CONFIG } from "../../../src/shared/constants";
import type { Playlist } from "../../store/usePlaylistStore";

import { Dimensions } from "react-native";

export interface SongModalPlaylistDetailProps {
  visible: boolean;
  playlist: Playlist | null;
  animatedStyle: any;
  onClose: () => void;
  onBack: () => void;
  onPlaySong: (song: any) => void;
}

export function SongModalPlaylistDetail({
  visible,
  playlist,
  animatedStyle,
  onClose,
  onBack,
  onPlaySong,
}: SongModalPlaylistDetailProps) {
  const screenHeight = Dimensions.get("window").height;

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
              maxHeight: screenHeight * 0.85,
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
            <TouchableOpacity onPress={onBack} style={{ marginRight: UI_CONFIG.SPACING.MD }}>
              <Ionicons name="arrow-back" size={24} color={UI_CONFIG.COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.XL,
                  fontFamily: "Rubik-SemiBold",
                  color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                }}
                numberOfLines={1}
              >
                {playlist?.name || "Playlist"}
              </Text>
              {playlist?.description && (
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
            </View>
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
              <Ionicons name="close" size={20} color={UI_CONFIG.COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              padding: UI_CONFIG.SPACING.MD,
              paddingBottom: UI_CONFIG.SPACING.XL,
            }}
          >
            {!playlist || playlist.songs.length === 0 ? (
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
                  No Songs Yet
                </Text>
                <Text
                  style={{
                    fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                    fontFamily: "Rubik",
                    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                    marginTop: UI_CONFIG.SPACING.SM,
                    textAlign: "center",
                  }}
                >
                  Add songs to this playlist to get started
                </Text>
              </View>
            ) : (
              <View style={{ gap: UI_CONFIG.SPACING.SM }}>
                {playlist.songs.map((playlistSong, index) => (
                  <TouchableOpacity
                    key={playlistSong.id}
                    onPress={() =>
                      onPlaySong({
                        ...playlistSong,
                        audioUrl: playlistSong.audioUrl,
                        thumbnailUrl: playlistSong.thumbnailUrl,
                      })
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: UI_CONFIG.COLORS.SURFACE,
                      borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                      padding: UI_CONFIG.SPACING.MD,
                      borderWidth: 1,
                      borderColor: UI_CONFIG.COLORS.BORDER,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                        fontFamily: "Rubik-SemiBold",
                        color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                        width: 24,
                        textAlign: "center",
                      }}
                    >
                      {index + 1}
                    </Text>
                    <Image
                      source={
                        typeof playlistSong.thumbnailUrl === "string"
                          ? { uri: playlistSong.thumbnailUrl }
                          : playlistSong.thumbnailUrl
                      }
                      style={{
                        width: 50,
                        height: 50,
                        borderRadius: UI_CONFIG.BORDER_RADIUS.MD,
                        marginLeft: UI_CONFIG.SPACING.MD,
                        marginRight: UI_CONFIG.SPACING.MD,
                      }}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
                          fontFamily: "Rubik-SemiBold",
                          color: UI_CONFIG.COLORS.TEXT_PRIMARY,
                        }}
                        numberOfLines={1}
                      >
                        {playlistSong.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                          fontFamily: "Rubik",
                          color: UI_CONFIG.COLORS.TEXT_SECONDARY,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {playlistSong.artist}
                      </Text>
                    </View>
                    <AnimatedButton
                      onPress={() =>
                        onPlaySong({
                          ...playlistSong,
                          audioUrl: playlistSong.audioUrl,
                          thumbnailUrl: playlistSong.thumbnailUrl,
                        })
                      }
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: UI_CONFIG.COLORS.SECONDARY,
                        justifyContent: "center",
                        alignItems: "center",
                        marginLeft: UI_CONFIG.SPACING.SM,
                      }}
                    >
                      <Ionicons name="play" size={20} color="#FFFFFF" />
                    </AnimatedButton>
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
