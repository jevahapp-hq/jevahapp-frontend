import { ReactNode } from "react";
import { Text, View } from "react-native";

type AppHeaderProps = {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
};

export default function AppHeader({
  title,
  left,
  right,
  className = "",
}: AppHeaderProps) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white ${className}`}
    >
      <View>{left}</View>
      {title ? (
        <Text className="text-lg font-rubik-semibold text-gray-900">
          {title}
        </Text>
      ) : (
        <View />
      )}
      <View>{right}</View>
    </View>
  );
}

