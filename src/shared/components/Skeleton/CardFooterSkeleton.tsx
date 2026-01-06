import React from "react";
import { View } from "react-native";
import Skeleton from "./Skeleton";

interface CardFooterSkeletonProps {
  dark?: boolean;
}

export const CardFooterSkeleton: React.FC<CardFooterSkeletonProps> = ({
  dark = false,
}) => {
  return (
    <View className="flex-row items-center pl-1">
      {/* Views skeleton */}
      <View className="flex-row items-center mr-4">
        <Skeleton dark={dark} width={24} height={24} borderRadius={0} />
        <Skeleton
          dark={dark}
          width={20}
          height={10}
          borderRadius={0}
          style={{ marginLeft: 4 }}
        />
      </View>

      {/* Like skeleton */}
      <View className="flex-row items-center mr-4">
        <Skeleton dark={dark} width={28} height={28} borderRadius={0} />
        <Skeleton
          dark={dark}
          width={20}
          height={10}
          borderRadius={0}
          style={{ marginLeft: 4 }}
        />
      </View>

      {/* Comment skeleton */}
      <View className="flex-row items-center mr-4">
        <Skeleton dark={dark} width={26} height={26} borderRadius={0} />
        <Skeleton
          dark={dark}
          width={20}
          height={10}
          borderRadius={0}
          style={{ marginLeft: 4 }}
        />
      </View>

      {/* Save skeleton */}
      <View className="flex-row items-center mr-4">
        <Skeleton dark={dark} width={26} height={26} borderRadius={0} />
        <Skeleton
          dark={dark}
          width={20}
          height={10}
          borderRadius={0}
          style={{ marginLeft: 4 }}
        />
      </View>

      {/* Share skeleton */}
      <Skeleton dark={dark} width={26} height={26} borderRadius={0} />
    </View>
  );
};

export default CardFooterSkeleton;


