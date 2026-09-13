import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface PlayerActionChipsProps {
  isLiked: boolean;
  isTogglingLike: boolean;
  isInLibrary?: boolean;
  isTogglingSave?: boolean;
  onToggleLike: () => void;
  onOpenPlaylistView?: () => void;
  onPlayAll?: () => void;
  isPlayAllActive?: boolean;
  onToggleSave?: () => void;
  onShare?: () => void;
}

function Chip({
  icon,
  label,
  onPress,
  active,
  disabled,
  activeColor = "#EF4444",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  active?: boolean;
  disabled?: boolean;
  activeColor?: string;
}) {
  const color = active ? activeColor : "#FFFFFF";
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      activeOpacity={0.75}
      style={{
        flexDirection: "row",
        alignItems: "center",
        height: 26,
        paddingHorizontal: 10,
        borderRadius: 13,
        backgroundColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        borderColor: active ? activeColor : "rgba(255,255,255,0.22)",
        opacity: disabled ? 0.45 : 1,
        marginRight: 4,
      }}
    >
      <Ionicons name={icon} size={12} color={color} />
      <Text
        style={{
          marginLeft: 4,
          fontSize: 11,
          lineHeight: 13,
          fontFamily: "PlusJakartaSans-Medium",
          color,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function PlayerActionChips({
  isLiked,
  isTogglingLike,
  isInLibrary = false,
  isTogglingSave = false,
  onToggleLike,
  onOpenPlaylistView,
  onPlayAll,
  isPlayAllActive = false,
  onToggleSave,
  onShare,
}: PlayerActionChipsProps) {
  return (
    <View
      style={{
        marginTop: 8,
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Chip
        icon={isLiked ? "heart" : "heart-outline"}
        label="Like"
        onPress={onToggleLike}
        active={isLiked}
        disabled={isTogglingLike}
      />
      {onPlayAll ? (
        <Chip
          icon={isPlayAllActive ? "pause" : "play"}
          label="Play all"
          onPress={onPlayAll}
          active={isPlayAllActive}
          activeColor="#256E63"
        />
      ) : (
        <Chip
          icon="list-outline"
          label="Playlist"
          onPress={onOpenPlaylistView}
        />
      )}
      <Chip
        icon={isInLibrary ? "bookmark" : "bookmark-outline"}
        label={isInLibrary ? "Saved" : "Save"}
        onPress={onToggleSave}
        active={isInLibrary}
        disabled={isTogglingSave}
        activeColor="#256E63"
      />
      <Chip
        icon="share-outline"
        label="Share"
        onPress={onShare}
      />
    </View>
  );
}
