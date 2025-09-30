import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

interface SuccessCardProps {
  message: string;
  onClose?: () => void;
  duration?: number; // Auto-hide duration in ms, 0 means no auto-hide
  backgroundColor?: string;
  textColor?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
}

export default function SuccessCard({
  message,
  onClose,
  duration = 3000,
  backgroundColor = "#039855",
  textColor = "white",
  icon = "check-circle",
}: SuccessCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // Show animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide if duration is specified
    if (duration > 0) {
      const timer = setTimeout(() => {
        hideCard();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const hideCard = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  return (
    <Animated.View
      style={{
        position: "absolute",
        top: 50,
        left: 20,
        right: 20,
        zIndex: 1000,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <View
        className="flex-row items-center justify-between rounded-lg px-4 py-3 shadow-lg"
        style={{ backgroundColor }}
      >
        <View className="flex-row items-center flex-1">
          <MaterialIcons name={icon} size={24} color={textColor} />
          <Text
            className="ml-3 font-medium flex-1"
            style={{ color: textColor }}
            numberOfLines={2}
          >
            {message}
          </Text>
        </View>
        <TouchableOpacity onPress={hideCard} className="ml-2">
          <MaterialIcons name="close" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
