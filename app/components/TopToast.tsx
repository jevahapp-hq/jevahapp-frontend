import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Text, TouchableOpacity, View } from "react-native";

type TopToastProps = {
  visible: boolean;
  onClose: () => void;
  text: string;
  type: "success" | "error" | "info";
  topOffset?: number;
};

const { width } = Dimensions.get("window");

export default function TopToast({
  visible,
  onClose,
  text,
  type,
  topOffset = 20,
}: TopToastProps) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const horizontal = Math.max(16, (width - Math.min(width - 32, 340)) / 2);
  const toastWidth = Math.min(width - 32, 340);

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: topOffset,
        duration: 320,
        useNativeDriver: true,
      }).start();
      const timer = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: -80,
          duration: 280,
          useNativeDriver: true,
        }).start(onClose);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [visible, topOffset, onClose, translateY]);

  if (!visible) return null;

  const backgroundColor =
    type === "success" ? "#179E4B" : type === "info" ? "#0F172A" : "#DA2C2C";
  const icon =
    type === "success"
      ? "checkmark-circle-outline"
      : type === "info"
        ? "information-circle-outline"
        : "alert-circle-outline";

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: horizontal,
        width: toastWidth,
        transform: [{ translateY }],
        zIndex: 999,
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          backgroundColor,
          minHeight: 48,
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Ionicons name={icon} size={18} color="#FFFFFF" />
        <Text
          style={{
            color: "#FFFFFF",
            marginLeft: 8,
            flex: 1,
            fontFamily: "Rubik-Medium",
            fontSize: 13,
            lineHeight: 18,
          }}
        >
          {text}
        </Text>
        <TouchableOpacity
          onPress={() =>
            Animated.timing(translateY, {
              toValue: -80,
              duration: 280,
              useNativeDriver: true,
            }).start(onClose)
          }
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
