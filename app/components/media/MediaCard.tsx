import { ReactNode } from "react";
import { View } from "react-native";

type MediaCardProps = {
  children: ReactNode;
  className?: string;
};

export default function MediaCard({
  children,
  className = "",
}: MediaCardProps) {
  return (
    <View className={`relative overflow-hidden ${className}`}>{children}</View>
  );
}

