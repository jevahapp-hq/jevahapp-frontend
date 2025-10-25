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
          <Skeleton dark={dark} width={60} height={24} borderRadius={12} />
        </View>

        {/* Right Side Action Icons */}
        <View className="flex-col absolute mt-[180px] right-4">
          {/* Like Button */}
          <View className="flex-col justify-center items-center mb-8">
            <Skeleton dark={dark} width={30} height={30} borderRadius={15} />
            <Skeleton
              dark={dark}
              width={20}
              height={10}
              borderRadius={5}
              style={{ marginTop: 4 }}
            />
          </View>

          {/* Comment Button */}
          <View
            className="flex-col justify-center items-center mb-8"
            style={{ minHeight: 60, minWidth: 60 }}
          >
            <Skeleton dark={dark} width={30} height={30} borderRadius={15} />
            <Skeleton
              dark={dark}
              width={20}
              height={10}
              borderRadius={5}
              style={{ marginTop: 4 }}
            />
          </View>

          {/* Save Button */}
          <View className="flex-col justify-center items-center">
            <Skeleton dark={dark} width={30} height={30} borderRadius={15} />
            <Skeleton
              dark={dark}
              width={20}
              height={10}
              borderRadius={5}
              style={{ marginTop: 4 }}
            />
          </View>
        </View>

        {/* Video Title Overlay */}
        <View
          className="absolute left-3 right-3 px-4 py-2 rounded-md"
          style={{ bottom: 40 }}
        >
          <Skeleton dark={dark} variant="text" width="80%" height={16} />
          <Skeleton
            dark={dark}
            variant="text"
            width="60%"
            height={14}
            style={{ marginTop: 4 }}
          />
        </View>

        {/* Progress Bar Controls */}
        <View className="absolute left-3 right-3 px-3" style={{ bottom: 12 }}>
          <View className="flex-row items-center gap-2 mt-2">
            {/* Play Button */}
            <Skeleton dark={dark} width={24} height={24} borderRadius={12} />

            {/* Progress Bar */}
            <View className="flex-1 h-1 bg-white/30 rounded-full relative">
              <Skeleton dark={dark} width="30%" height={4} borderRadius={2} />
            </View>

            {/* Mute Button */}
            <Skeleton dark={dark} width={20} height={20} borderRadius={10} />
          </View>

          {/* Time Labels */}
          <View className="flex-row justify-between mt-1">
            <Skeleton dark={dark} width={40} height={12} borderRadius={6} />
            <Skeleton dark={dark} width={40} height={12} borderRadius={6} />
          </View>
        </View>
      </View>

      {/* Footer Section */}
      <View className="flex-row items-center justify-between mt-1 px-3">
        <View className="flex flex-row items-center">
          {/* Avatar */}
          <View className="w-10 h-10 rounded-full bg-gray-200 items-center justify-center relative ml-1 mt-2">
            <Skeleton dark={dark} variant="avatar" />
          </View>

          {/* User Info */}
          <View className="ml-3">
            <View className="flex-row items-center">
              <Skeleton dark={dark} width={80} height={13} borderRadius={6} />
              <View className="flex flex-row mt-2 ml-2">
                <Skeleton dark={dark} width={14} height={14} borderRadius={7} />
                <Skeleton
                  dark={dark}
                  width={50}
                  height={10}
                  borderRadius={5}
                  style={{ marginLeft: 4 }}
                />
              </View>
            </View>

            {/* Stats Row */}
            <View className="flex-row mt-2">
              <View className="flex-row items-center">
                <Skeleton
                  dark={dark}
                  width={24}
                  height={24}
                  borderRadius={12}
                />
                <Skeleton
                  dark={dark}
                  width={30}
                  height={10}
                  borderRadius={5}
                  style={{ marginLeft: 4 }}
                />
              </View>
              <View className="flex-row items-center ml-4">
                <Skeleton
                  dark={dark}
                  width={24}
                  height={24}
                  borderRadius={12}
                />
                <Skeleton
                  dark={dark}
                  width={20}
                  height={10}
                  borderRadius={5}
                  style={{ marginLeft: 4 }}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Menu Button */}
        <View className="mr-2">
          <Skeleton dark={dark} width={18} height={18} borderRadius={9} />
        </View>
      </View>
    </View>
  );
};

export default VideoCardSkeleton;
