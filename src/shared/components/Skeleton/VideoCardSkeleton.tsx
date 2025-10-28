import React from "react";
import { View } from "react-native";
import Skeleton from "./Skeleton";

interface VideoCardSkeletonProps {
  dark?: boolean;
}

export const VideoCardSkeleton: React.FC<VideoCardSkeletonProps> = ({
  dark = false,
}) => {
  return (
    <View className="flex flex-col mb-16" style={{ marginBottom: 64 }}>
      {/* Main Video Container */}
      <View className="w-full h-[400px] overflow-hidden relative">
        {/* Video/Thumbnail Area */}
        <Skeleton
          dark={dark}
          variant="card"
          width="100%"
          height={400}
          style={{ position: "absolute" }}
        />

        {/* Content Type Badge */}
        <View className="absolute top-3 left-3">
          <Skeleton dark={dark} width={60} height={24} borderRadius={6} />
        </View>

        {/* Play Icon Overlay - centered */}
        <View className="absolute inset-0 justify-center items-center">
          <Skeleton
            dark={dark}
            width={56}
            height={56}
            borderRadius={28}
            style={{
              backgroundColor: dark
                ? "rgba(255,255,255,0.2)"
                : "rgba(255,255,255,0.7)",
            }}
          />
        </View>

        {/* Progress Bar at Bottom */}
        <View className="absolute left-0 right-0 bottom-0 px-3 pb-3">
          <View className="w-full h-1 bg-white/30 rounded-full relative">
            <Skeleton dark={dark} width="30%" height={4} borderRadius={2} />
          </View>
        </View>
      </View>

      {/* Footer Section */}
      <View className="px-3 mt-1">
        {/* Interaction Bar - horizontal layout matching actual card */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            {/* Like Icon + Count */}
            <View className="flex-row items-center mr-6">
              <Skeleton dark={dark} width={24} height={24} borderRadius={0} />
              <Skeleton
                dark={dark}
                width={30}
                height={10}
                borderRadius={0}
                style={{ marginLeft: 4 }}
              />
            </View>

            {/* Comment Icon + Count */}
            <View className="flex-row items-center mr-6">
              <Skeleton dark={dark} width={24} height={24} borderRadius={0} />
              <Skeleton
                dark={dark}
                width={30}
                height={10}
                borderRadius={0}
                style={{ marginLeft: 4 }}
              />
            </View>

            {/* Save Icon + Count */}
            <View className="flex-row items-center">
              <Skeleton dark={dark} width={24} height={24} borderRadius={0} />
              <Skeleton
                dark={dark}
                width={40}
                height={10}
                borderRadius={0}
                style={{ marginLeft: 4 }}
              />
            </View>
          </View>

          {/* Menu Button (three dots) */}
          <Skeleton dark={dark} width={18} height={18} borderRadius={0} />
        </View>

        {/* Author Information - below interaction bar */}
        <View className="flex-row items-center mb-2">
          {/* Avatar */}
          <View className="w-10 h-10 rounded-full overflow-hidden">
            <Skeleton dark={dark} variant="avatar" width={40} height={40} />
          </View>

          {/* User Info */}
          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Skeleton dark={dark} width={140} height={13} borderRadius={0} />
              <View className="w-1 h-1 rounded-full mx-2">
                <Skeleton dark={dark} width={4} height={4} borderRadius={2} />
              </View>
              <Skeleton dark={dark} width={60} height={10} borderRadius={0} />
            </View>
          </View>
        </View>

        {/* Video Title - below author info */}
        <View className="ml-13">
          <Skeleton dark={dark} width="85%" height={14} borderRadius={0} />
          <Skeleton
            dark={dark}
            width="65%"
            height={14}
            borderRadius={0}
            style={{ marginTop: 4 }}
          />
        </View>
      </View>
    </View>
  );
};

export default VideoCardSkeleton;
