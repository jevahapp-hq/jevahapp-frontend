import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, Dimensions, Text, TouchableOpacity, View } from "react-native";

type TopToastProps = {
  visible: boolean;
  onClose: () => void;
  text: string;
  type: "success" | "error";
  topOffset?: number;
};

const { width } = Dimensions.get("window");

export default function TopToast({ visible, onClose, text, type, topOffset = 20 }: TopToastProps) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const horizontal = (width - 330) / 2;

  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, { toValue: topOffset, duration: 350, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }).start(onClose);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, topOffset]);

  if (!visible) return null;

  const backgroundColor = type === "success" ? "#179E4B" : "#DA2C2C";

  return (
    <Animated.View style={{ position: "absolute", left: horizontal, width: 330, transform: [{ translateY }], zIndex: 999 }}>
      <View style={{ backgroundColor, height: 48, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', marginLeft: 8, flex: 1, fontFamily: 'Rubik-Bold' }}>{text}</Text>
        <TouchableOpacity onPress={() => Animated.timing(translateY, { toValue: -80, duration: 300, useNativeDriver: true }).start(onClose)} activeOpacity={0.7}>
          <Ionicons name="close" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}


