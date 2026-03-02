import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import {
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
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
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {imageSource && (
        <View style={{ ...StyleSheet.absoluteFillObject, overflow: "hidden" }}>
          <Image
            source={imageSource}
            style={{
              position: "absolute",
              top: -SCREEN_HEIGHT * 0.2,
              left: -100,
              right: -100,
              bottom: -100,
              width: "150%",
              height: "150%",
              opacity: 0.6,
            }}
            resizeMode="cover"
            blurRadius={80}
          />
          {/* Animated Blob Effects (Conceptual static implementation for now) */}
          <View
            style={{
              position: "absolute",
              top: 100,
              right: -50,
              width: 300,
              height: 300,
              borderRadius: 150,
              backgroundColor: UI_CONFIG.COLORS.PRIMARY,
              opacity: 0.2,
              filter: "blur(60px)",
            } as any}
          />
          <View
            style={{
              position: "absolute",
              bottom: 150,
              left: -50,
              width: 250,
              height: 250,
              borderRadius: 125,
              backgroundColor: "#FEA74E",
              opacity: 0.15,
              filter: "blur(50px)",
            } as any}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)", "#000000"]}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
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
            marginTop: 40,
          }}
        >
          {imageSource && (
            <View
              style={{
                width: albumArtSize * 1.1,
                height: albumArtSize * 1.1,
                borderRadius: 32,
                backgroundColor: "#1A1A1A",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 25 },
                shadowOpacity: 0.6,
                shadowRadius: 35,
                elevation: 25,
                borderWidth: 1,
                borderColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              <Image
                source={imageSource}
                style={{ width: "100%", height: "100%", borderRadius: 32 }}
                resizeMode="cover"
              />
              {/* Premium Glow Projection */}
              <View
                style={{
                  position: "absolute",
                  bottom: -20,
                  alignSelf: "center",
                  width: "80%",
                  height: 20,
                  backgroundColor: "rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  filter: "blur(20px)",
                } as any}
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

          {/* Enhanced Progress Bar with better touch handling */}
          <View
            style={{
              height: 40,
              justifyContent: "center",
              marginBottom: UI_CONFIG.SPACING.XL,
            }}
          >
            <View
              ref={progressBarRef}
              style={{
                height: 24,
                justifyContent: "center",
              }}
              {...panHandlers}
            >
              {/* Background Track */}
              <View
                style={{
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  overflow: "hidden",
                }}
              >
                {/* Progress Fill */}
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
              
              {/* Draggable Thumb */}
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: `${displayProgress * 100}%`,
                  transform: [{ translateX: -14 }],
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: "#FFFFFF",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 8,
                    elevation: 10,
                    borderWidth: 2,
                    borderColor: "#FEA74E",
                  }}
                />
              </View>
            </View>
          </View>

          <BlurView
            intensity={20}
            tint="dark"
            style={{
              padding: 24,
              borderRadius: 32,
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderWidth: 1,
              borderColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 32,
              }}
            >
              <TouchableOpacity
                onPress={() => onSkip(-15)}
                activeOpacity={0.6}
                style={styles.controlSecondary}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons name="play-skip-back" size={28} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onTogglePlay}
                activeOpacity={0.8}
                style={styles.playButton}
                hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={42}
                  color="#000"
                  style={{ marginLeft: isPlaying ? 0 : 4 }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onSkip(15)}
                activeOpacity={0.6}
                style={styles.controlSecondary}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Ionicons name="play-skip-forward" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 40,
              }}
            >
              <TouchableOpacity
                onPress={onToggleShuffle}
                style={[styles.miniControl, isShuffled && styles.miniControlActive]}
              >
                <Ionicons
                  name="shuffle"
                  size={20}
                  color={isShuffled ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)"}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onRepeatCycle}
                style={[styles.miniControl, repeatMode !== "none" && styles.miniControlActive]}
              >
                <Ionicons
                  name="repeat"
                  size={20}
                  color={repeatMode !== "none" ? "#FFFFFF" : "rgba(255, 255, 255, 0.6)"}
                />
              </TouchableOpacity>
            </View>
          </BlurView>
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

const styles = StyleSheet.create({
  controlSecondary: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  playButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 15,
  },
  miniControl: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  miniControlActive: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
});
