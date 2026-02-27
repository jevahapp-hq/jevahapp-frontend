/**
 * SongCard - Single copyright-free song card for horizontal list
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

export interface SongCardProps {
  song: any;
  isPlaying: boolean;
  onCardPress: (song: any) => void;
  onPlayPress: (song: any) => void;
  onOptionsPress: (song: any) => void;
}

export function SongCard({
  song,
  isPlaying,
  onCardPress,
  onPlayPress,
  onOptionsPress,
}: SongCardProps) {
  const thumbnailSource =
    typeof song.thumbnailUrl === "string"
      ? { uri: song.thumbnailUrl }
      : song.thumbnailUrl;

  return (
    <View className="mr-4 w-[154px] flex-col items-center">
      <TouchableOpacity
        onPress={() => onCardPress(song)}
        className="w-full h-[232px] rounded-2xl overflow-hidden relative"
        activeOpacity={0.9}
      >
        <Image
          source={thumbnailSource}
          style={{ position: "absolute", width: "100%", height: "100%" }}
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/60" />
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onPlayPress(song);
          }}
          className="absolute inset-0 justify-center items-center"
        >
          <View className="bg-white/70 p-2 rounded-full">
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={24}
              color="#FEA74E"
            />
          </View>
        </TouchableOpacity>
        <View className="absolute bottom-2 left-2 right-2">
          <Text
            className="text-white text-start text-[14px] ml-1 mb-6 font-rubik"
            numberOfLines={2}
          >
            {song.title}
          </Text>
        </View>
      </TouchableOpacity>

      <View className="mt-2 flex flex-col w-full">
        <View className="flex flex-row justify-between items-center">
          <Text
            className="text-[12px] text-[#1D2939] font-rubik font-medium"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {song.artist}
          </Text>
          <TouchableOpacity
            onPress={() => onOptionsPress(song)}
            activeOpacity={0.7}
            style={{
              paddingHorizontal: 6,
              paddingVertical: 4,
              borderRadius: 999,
            }}
          >
            <Ionicons name="ellipsis-vertical" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center">
          <Ionicons name="eye-outline" size={13} color="#98A2B3" />
          <Text
            className="text-[10px] text-gray-500 ml-2 mt-1 font-rubik"
            numberOfLines={1}
          >
            {song.views || song.viewCount || 0} views
          </Text>
        </View>
      </View>
    </View>
  );
}
