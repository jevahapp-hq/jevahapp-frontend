import React from "react";
import { View } from "react-native";
import Skeleton from "./Skeleton";

interface HymnCardSkeletonProps {
  dark?: boolean;
}

export const HymnCardSkeleton: React.FC<HymnCardSkeletonProps> = ({
  dark = false,
}) => {
  return (
    <View className="flex flex-col mb-4">
      {/* Main Hymn Container */}
      <View className="w-full h-[160px] overflow-hidden relative bg-gray-50 rounded-xl">
        {/* Background Image */}
        <Skeleton
          dark={dark}
          variant="card"
          width="100%"
          height={160}
          style={{ position: "absolute" }}
        />

        {/* Hymn Number Badge */}
        <View className="absolute top-2 left-2">
          <Skeleton dark={dark} width={30} height={20} borderRadius={10} />
        </View>

        {/* Play Button */}
        <View className="absolute inset-0 justify-center items-center">
          <Skeleton
            dark={dark}
            width={50}
            height={50}
            borderRadius={25}
            style={{
              backgroundColor: dark
                ? "rgba(255,255,255,0.2)"
                : "rgba(255,255,255,0.8)",
            }}
          />
        </View>

        {/* Hymn Title */}
        <View className="absolute bottom-2 left-2 right-2">
          <Skeleton dark={dark} variant="text" width="90%" height={14} />
          <Skeleton
            dark={dark}
            variant="text"
            width="75%"
            height={12}
            style={{ marginTop: 2 }}
          />
        </View>
      </View>

      {/* Footer Section */}
      <View className="flex-row items-center justify-between mt-2 px-1">
        <View className="flex flex-row items-center">
          {/* Small Avatar */}
          <View className="w-6 h-6 rounded-full bg-gray-200 items-center justify-center">
            <Skeleton dark={dark} width={18} height={18} borderRadius={9} />
          </View>

          {/* Hymn Info */}
          <View className="ml-2">
            <Skeleton dark={dark} width={60} height={10} borderRadius={5} />
            <View className="flex-row items-center mt-1">
              <Skeleton dark={dark} width={10} height={10} borderRadius={5} />
              <Skeleton
                dark={dark}
                width={35}
                height={8}
                borderRadius={4}
                style={{ marginLeft: 3 }}
              />
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center gap-2">
          {/* Like Button */}
          <View className="flex-col items-center">
            <Skeleton dark={dark} width={16} height={16} borderRadius={8} />
            <Skeleton
              dark={dark}
              width={12}
              height={6}
              borderRadius={3}
              style={{ marginTop: 1 }}
            />
          </View>

          {/* Play Button */}
          <View className="flex-col items-center">
            <Skeleton dark={dark} width={16} height={16} borderRadius={8} />
            <Skeleton
              dark={dark}
              width={12}
              height={6}
              borderRadius={3}
              style={{ marginTop: 1 }}
            />
          </View>

          {/* Menu Button */}
          <Skeleton dark={dark} width={14} height={14} borderRadius={7} />
        </View>
      </View>
    </View>
  );
};

export default HymnCardSkeleton;
