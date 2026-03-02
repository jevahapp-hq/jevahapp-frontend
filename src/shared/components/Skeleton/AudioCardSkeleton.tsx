import React from "react";
import { View } from "react-native";
import Skeleton from "./Skeleton";

interface AudioCardSkeletonProps {
  dark?: boolean;
}

export const AudioCardSkeleton: React.FC<AudioCardSkeletonProps> = ({
  dark = false,
}) => {
  return (
    <View className="flex flex-col mb-6">
      {/* Main Audio Container */}
      <View className="w-full h-[200px] overflow-hidden relative bg-gray-50 rounded-2xl">
        {/* Background Image/Thumbnail */}
        <Skeleton
          dark={dark}
          variant="card"
          width="100%"
          height={200}
          style={{ position: "absolute" }}
        />

        {/* Content Type Badge */}
        <View className="absolute top-3 left-3">
          <Skeleton dark={dark} width={50} height={20} borderRadius={10} />
        </View>

        {/* Audio Controls Overlay */}
        <View className="absolute inset-0 justify-center items-center">
          {/* Play Button */}
          <Skeleton
            dark={dark}
            width={60}
            height={60}
            borderRadius={30}
            style={{
              backgroundColor: dark
                ? "rgba(255,255,255,0.2)"
                : "rgba(255,255,255,0.8)",
            }}
          />
        </View>

        {/* Audio Title */}
        <View className="absolute bottom-3 left-3 right-3">
          <Skeleton dark={dark} variant="text" width="85%" height={16} />
          <Skeleton
            dark={dark}
            variant="text"
            width="70%"
            height={14}
            style={{ marginTop: 4 }}
          />
        </View>

        {/* Audio Progress Bar */}
        <View className="absolute bottom-0 left-0 right-0 h-1">
          <Skeleton dark={dark} width="45%" height={4} borderRadius={2} />
        </View>
      </View>

      {/* Footer Section */}
      <View className="flex-row items-center justify-between mt-3 px-1">
        <View className="flex flex-row items-center">
          {/* Avatar */}
          <View className="w-8 h-8 rounded-full bg-gray-200 items-center justify-center">
            <Skeleton dark={dark} width={24} height={24} borderRadius={12} />
          </View>

          {/* User Info */}
          <View className="ml-3">
            <Skeleton dark={dark} width={70} height={12} borderRadius={6} />
            <View className="flex-row items-center mt-1">
              <Skeleton dark={dark} width={12} height={12} borderRadius={6} />
              <Skeleton
                dark={dark}
                width={40}
                height={10}
                borderRadius={5}
                style={{ marginLeft: 4 }}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center gap-3">
          {/* Like Button */}
          <View className="flex-col items-center">
            <Skeleton dark={dark} width={20} height={20} borderRadius={10} />
            <Skeleton
              dark={dark}
              width={15}
              height={8}
              borderRadius={4}
              style={{ marginTop: 2 }}
            />
          </View>

          {/* Comment Button */}
          <View className="flex-col items-center">
            <Skeleton dark={dark} width={20} height={20} borderRadius={10} />
            <Skeleton
              dark={dark}
              width={15}
              height={8}
              borderRadius={4}
              style={{ marginTop: 2 }}
            />
          </View>

          {/* Share Button */}
          <View className="flex-col items-center">
            <Skeleton dark={dark} width={20} height={20} borderRadius={10} />
            <Skeleton
              dark={dark}
              width={15}
              height={8}
              borderRadius={4}
              style={{ marginTop: 2 }}
            />
          </View>

          {/* Menu Button */}
          <Skeleton dark={dark} width={16} height={16} borderRadius={8} />
        </View>
      </View>
    </View>
  );
};

export default AudioCardSkeleton;
