import React from "react";
import { View } from "react-native";
import Skeleton from "./Skeleton";

interface MiniCardSkeletonProps {
  dark?: boolean;
}

export const MiniCardSkeleton: React.FC<MiniCardSkeletonProps> = ({
  dark = false,
}) => {
  return (
    <View className="mr-4 w-[154px] flex-col items-center">
      {/* Main Mini Card Container */}
      <View className="w-full h-[232px] rounded-2xl overflow-hidden relative">
        {/* Video/Thumbnail Area */}
        <Skeleton
          dark={dark}
          variant="thumbnail"
          width="100%"
          height={232}
          style={{ position: "absolute" }}
        />

        {/* Play Button Overlay */}
        <View className="absolute inset-0 justify-center items-center">
          <Skeleton
            dark={dark}
            width={40}
            height={40}
            borderRadius={20}
            style={{
              backgroundColor: dark
                ? "rgba(255,255,255,0.2)"
                : "rgba(255,255,255,0.8)",
            }}
          />
        </View>

        {/* Title Overlay */}
        <View className="absolute bottom-2 left-2 right-2">
          <Skeleton dark={dark} variant="text" width="90%" height={12} />
          <Skeleton
            dark={dark}
            variant="text"
            width="70%"
            height={10}
            style={{ marginTop: 2 }}
          />
        </View>
      </View>

      {/* Footer Section */}
      <View className="mt-2 flex flex-col w-full">
        <View className="flex flex-row justify-between items-center">
          <Skeleton dark={dark} width={80} height={10} borderRadius={5} />
          <Skeleton dark={dark} width={14} height={14} borderRadius={7} />
        </View>

        {/* Stats */}
        <View className="flex-row items-center mt-1">
          <Skeleton dark={dark} width={16} height={16} borderRadius={8} />
          <Skeleton
            dark={dark}
            width={25}
            height={8}
            borderRadius={4}
            style={{ marginLeft: 4 }}
          />
        </View>
      </View>
    </View>
  );
};

export default MiniCardSkeleton;
