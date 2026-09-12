import React from "react";
import { Text, View } from "react-native";
import { PlayerActionChips } from "./PlayerActionChips";

export interface PlayerInfoProps {
  title: string;
  artist: string;
  isLiked: boolean;
  isTogglingLike: boolean;
  isInLibrary?: boolean;
  isTogglingSave?: boolean;
  onToggleLike: () => void;
  onOpenPlaylistView: () => void;
  onToggleSave?: () => void;
  onShare?: () => void;
}

export function PlayerInfo({
  title,
  artist,
  isLiked,
  isTogglingLike,
  isInLibrary,
  isTogglingSave,
  onToggleLike,
  onOpenPlaylistView,
  onToggleSave,
  onShare,
}: PlayerInfoProps) {
  return (
    <View style={{ alignItems: "center", marginTop: 8, marginBottom: 4 }}>
      <Text
        style={{
          fontSize: 14,
          fontFamily: "PlusJakartaSans-Medium",
          color: "rgba(255,255,255,0.55)",
          marginBottom: 2,
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {artist}
      </Text>
      <Text
        style={{
          fontSize: 20,
          fontFamily: "PlusJakartaSans-Bold",
          color: "#FFFFFF",
          textAlign: "center",
          letterSpacing: -0.2,
        }}
        numberOfLines={2}
      >
        {title}
      </Text>
      <PlayerActionChips
        isLiked={isLiked}
        isTogglingLike={isTogglingLike}
        isInLibrary={isInLibrary}
        isTogglingSave={isTogglingSave}
        onToggleLike={onToggleLike}
        onOpenPlaylistView={onOpenPlaylistView}
        onToggleSave={onToggleSave}
        onShare={onShare}
      />
    </View>
  );
}
