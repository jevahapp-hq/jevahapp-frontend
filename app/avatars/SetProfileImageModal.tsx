import { useEffect } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
import {
    GestureHandlerRootView,
    HandlerStateChangeEvent,
    PanGestureHandler,
    PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

type Props = {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
};

export default function SlideUpSetProfileImageModal({
  isVisible,
  onConfirm,
  onCancel,
  isLoading = false,
}: Props) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const lastTranslateY = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSpring(0, { damping: 30 });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT);
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;
    if (translationY > 0) {
      translateY.value = translationY;
      lastTranslateY.value = translationY;
    }
  };

  const onGestureEnd = (
    _event: HandlerStateChangeEvent<Record<string, unknown>>
  ) => {
    if (lastTranslateY.value > 150) {
      translateY.value = withSpring(SCREEN_HEIGHT);
      runOnJS(onCancel)();
    } else {
      translateY.value = withSpring(0, { damping: 30 });
    }
  };

  if (!isVisible) return null;

  return (
    <GestureHandlerRootView className="absolute inset-0 z-50 items-center justify-end">
      {/* Background overlay */}
      <View className="absolute inset-0 bg-black/30" />

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onGestureEnd}
      >
        <Animated.View
          style={[
            animatedStyle,
            {
              position: "absolute",
              bottom: 0,
              width: SCREEN_WIDTH, // ✅ full screen width
            },
          ]}
          className="bg-white rounded-t-3xl p-6 h-[301px]"
        >
          <View className="w-[36px] h-[4px] bg-gray-300 self-center rounded-full mb-6 mt-0" />
          <Text className="text-[30px] font-rubik-semibold text-center text-[#1D2939] mb-2">
            Set as profile image?
          </Text>
          <Text className="text-center font-rubik text-[15px] text-gray-700 mb-6">
            Well done choosing this avatar as your profile picture. Don’t worry, you can always change it whenever you want.
          </Text>

          <View className="flex-row justify-between space-x-4 gap-4 mt-3">
            <TouchableOpacity
              onPress={() => {
                translateY.value = withSpring(SCREEN_HEIGHT);
                runOnJS(onCancel)();
              }}
              className="flex-1 py-3 border border-gray-300 rounded-full"
            >
              <Text className="text-center text-gray-700 font-semibold">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                translateY.value = withSpring(SCREEN_HEIGHT);
                runOnJS(onConfirm)();
              }}
              className={`flex-1 py-3 rounded-full ${
                isLoading ? "bg-gray-400" : "bg-gray-900"
              }`}
              disabled={isLoading}
            >
              <Text className="text-center text-white font-semibold">
                {isLoading ? "Uploading..." : "Yes please"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}
