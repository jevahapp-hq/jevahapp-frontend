/**
 * SongModalPlayer - Main player UI: album art, song info, like/views, progress, controls
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { UI_CONFIG } from "../../../src/shared/constants";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface SongModalPlayerProps {
  song: any;
  albumArtSize: number;
  imageSource: { uri: string } | null;
  isLiked: boolean;
  likeCount: number;
  viewCount: number;
  isTogglingLike: boolean;
  isPlaying: boolean;
  isSeeking: boolean;
  seekProgress: number;
  audioProgress: number;
  audioDuration: number;
  audioPosition: number;
  repeatMode: "none" | "all" | "one";
  isShuffled: boolean;
  isMuted: boolean;
  progressBarRef: React.RefObject<View>;
  panHandlers: any;
  formatTime: (ms: number) => string;
  onClose: () => void;
  onOptionsPress: () => void;
  onToggleLike: () => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSkip: (seconds: number) => void;
  onRepeatCycle: () => void;
  onToggleShuffle: () => void;
  onOpenPlaylistView: () => void;
}

export function SongModalPlayer({
  song,
  albumArtSize,
  imageSource,
  isLiked,
  likeCount,
  viewCount,
  isTogglingLike,
  isPlaying,
  isSeeking,
  seekProgress,
  audioProgress,
  audioDuration,
  audioPosition,
  repeatMode,
  isShuffled,
  isMuted,
  progressBarRef,
  panHandlers,
  formatTime,
  onClose,
  onOptionsPress,
  onToggleLike,
  onTogglePlay,
  onToggleMute,
  onSkip,
  onRepeatCycle,
  onToggleShuffle,
  onOpenPlaylistView,
}: SongModalPlayerProps) {
  const durationMs = audioDuration || (song?.duration ? song.duration * 1000 : 0);
  const displayProgress = isSeeking ? seekProgress : audioProgress;
  const displayPositionMs = isSeeking
    ? seekProgress * durationMs
    : audioPosition;

  return (
    <View style={{ flex: 1 }}>
      {imageSource && (
        <>
          <ImageBackground
            source={imageSource}
            style={{
              position: "absolute",
              top: -100,
              left: -100,
              right: -100,
              bottom: -100,
              width: "150%",
              height: "150%",
            }}
            resizeMode="cover"
            blurRadius={Platform.OS === "ios" ? 80 : 50}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0, 0, 0, 0.75)",
              }}
            />
          </ImageBackground>
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.8)", "rgba(0,0,0,0.95)"]}
            locations={[0, 0.5, 1]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        </>
      )}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: UI_CONFIG.SPACING.LG,
          paddingVertical: UI_CONFIG.SPACING.MD,
          zIndex: 10,
        }}
      >
        <TouchableOpacity
          onPress={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOptionsPress}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View
        style={{
          flex: 1,
          paddingHorizontal: UI_CONFIG.SPACING.LG,
          paddingTop: UI_CONFIG.SPACING.XL,
          paddingBottom: UI_CONFIG.SPACING.XL,
          justifyContent: "space-between",
        }}
      >
        <View
          style={{
            alignItems: "center",
            marginBottom: UI_CONFIG.SPACING.MD,
            marginTop: UI_CONFIG.SPACING.SM,
          }}
        >
          {imageSource && (
            <View
              style={{
                width: albumArtSize,
                height: albumArtSize,
                borderRadius: 24,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.5,
                shadowRadius: 30,
                elevation: 20,
              }}
            >
              <Image
                source={imageSource}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        <View
          style={{
            alignItems: "center",
            marginBottom: UI_CONFIG.SPACING.MD,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontFamily: "Rubik-SemiBold",
              color: "#FFFFFF",
              marginBottom: 6,
              textAlign: "center",
              textShadowColor: "rgba(0, 0, 0, 0.5)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 4,
            }}
            numberOfLines={2}
          >
            {song.title}
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontFamily: "Rubik",
              color: "rgba(255, 255, 255, 0.8)",
              marginBottom: 12,
              textAlign: "center",
              textShadowColor: "rgba(0, 0, 0, 0.3)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 2,
            }}
            numberOfLines={1}
          >
            {song.artist}
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: UI_CONFIG.SPACING.MD,
              marginTop: UI_CONFIG.SPACING.SM,
            }}
          >
            <TouchableOpacity
              onPress={onToggleLike}
              disabled={isTogglingLike}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: UI_CONFIG.SPACING.LG,
                paddingVertical: UI_CONFIG.SPACING.SM,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={18}
                color={isLiked ? "#FF6B6B" : "rgba(255, 255, 255, 0.9)"}
              />
              <Text
                style={{
                  fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                  fontFamily: "Rubik-SemiBold",
                  color: "#FFFFFF",
                }}
              >
                {likeCount > 0 ? likeCount.toLocaleString() : "0"}
              </Text>
            </TouchableOpacity>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: UI_CONFIG.SPACING.LG,
                paddingVertical: UI_CONFIG.SPACING.SM,
                borderRadius: 20,
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
            >
              <Ionicons
                name="eye-outline"
                size={18}
                color="rgba(255, 255, 255, 0.9)"
              />
              <Text
                style={{
                  fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.SM,
                  fontFamily: "Rubik-SemiBold",
                  color: "#FFFFFF",
                }}
              >
                {viewCount > 0 ? viewCount.toLocaleString() : "0"}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress + controls */}
        <View style={{ marginBottom: UI_CONFIG.SPACING.MD }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
              paddingHorizontal: 4,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Rubik-Medium",
                color: "rgba(255, 255, 255, 0.8)",
              }}
            >
              {formatTime(displayPositionMs)}
            </Text>
            <Text
              style={{
                fontSize: 13,
                fontFamily: "Rubik-Medium",
                color: "rgba(255, 255, 255, 0.8)",
              }}
            >
              {formatTime(durationMs)}
            </Text>
          </View>

          <View
            ref={progressBarRef}
            style={{
              height: 24,
              justifyContent: "center",
              marginBottom: UI_CONFIG.SPACING.XL,
            }}
            {...panHandlers}
          >
            <View
              style={{
                height: 5,
                borderRadius: 999,
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["#FEA74E", "#FF8C42"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: "100%",
                  borderRadius: 999,
                  width: `${displayProgress * 100}%`,
                }}
              />
            </View>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: `${displayProgress * 100}%`,
                transform: [{ translateX: -12 }],
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: "#FFFFFF",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 6,
                  elevation: 8,
                }}
              />
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: UI_CONFIG.SPACING.XL,
              marginBottom: UI_CONFIG.SPACING.MD,
            }}
          >
            <TouchableOpacity
              onPress={() => onSkip(-15)}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
              }}
            >
              <Ionicons name="play-skip-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onTogglePlay}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#FFFFFF",
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 12,
              }}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={36}
                color="#256E63"
                style={{ marginLeft: isPlaying ? 0 : 3 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onSkip(15)}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
              }}
            >
              <Ionicons name="play-skip-forward" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: UI_CONFIG.SPACING.XXL,
              marginBottom: UI_CONFIG.SPACING.MD,
            }}
          >
            <TouchableOpacity
              onPress={onToggleShuffle}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: isShuffled
                  ? "rgba(255, 255, 255, 0.25)"
                  : "rgba(255, 255, 255, 0.15)",
                borderWidth: isShuffled ? 1.5 : 1,
                borderColor: isShuffled
                  ? "#FFFFFF"
                  : "rgba(255, 255, 255, 0.3)",
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="shuffle"
                size={22}
                color={isShuffled ? "#FFFFFF" : "rgba(255, 255, 255, 0.8)"}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onRepeatCycle}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor:
                  repeatMode !== "none"
                    ? "rgba(255, 255, 255, 0.25)"
                    : "rgba(255, 255, 255, 0.15)",
                borderWidth: repeatMode !== "none" ? 1.5 : 1,
                borderColor:
                  repeatMode !== "none"
                    ? "#FFFFFF"
                    : "rgba(255, 255, 255, 0.3)",
                position: "relative",
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={
                  repeatMode === "one"
                    ? "repeat"
                    : repeatMode === "all"
                    ? "repeat"
                    : "repeat-outline"
                }
                size={22}
                color={
                  repeatMode !== "none"
                    ? "#FFFFFF"
                    : "rgba(255, 255, 255, 0.8)"
                }
              />
              {repeatMode === "one" && (
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: "#FEA74E",
                    borderWidth: 2,
                    borderColor: "#FFFFFF",
                  }}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: UI_CONFIG.SPACING.SM,
            marginTop: -UI_CONFIG.SPACING.MD,
          }}
        >
          <TouchableOpacity
            onPress={onToggleMute}
            activeOpacity={0.6}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-high"}
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenPlaylistView}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: UI_CONFIG.SPACING.LG,
              paddingVertical: UI_CONFIG.SPACING.MD,
              borderRadius: 25,
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.3)",
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="list" size={20} color="#FFFFFF" />
            <Text
              style={{
                marginLeft: 8,
                fontSize: UI_CONFIG.TYPOGRAPHY.FONT_SIZES.MD,
                fontFamily: "Rubik-SemiBold",
                color: "#FFFFFF",
              }}
            >
              Playlist
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
