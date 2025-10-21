import { ReactNode } from "react";
import { View } from "react-native";

type BaseVideoCardProps = {
  children: ReactNode;
  className?: string;
};

// Simple base wrapper to standardize structure without changing visuals
export default function BaseVideoCard({
  children,
  className = "",
}: BaseVideoCardProps) {
  return (
    <View
      className={`relative bg-white rounded-lg overflow-hidden ${className}`}
    >
      {children}
    </View>
  );
}


