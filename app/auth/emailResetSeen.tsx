import { router } from "expo-router";
import { useEffect } from "react";
import { Dimensions, Image, Platform, Text, TouchableOpacity, View } from "react-native";
import {
  GestureHandlerRootView,
  HandlerStateChangeEvent,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

interface EmailResetSeenModalProps {
  isVisible: boolean;
  onClose: () => void;
  emailAddress: string;
}

export default function EmailResetSeenModal({ isVisible, onClose, emailAddress }: EmailResetSeenModalProps) {
  console.log("EmailResetSeenModal rendered with props:", { isVisible, emailAddress });
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const lastTranslateY = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      // Use slower animation for smooth slide-up effect
      if (Platform.OS === 'android') {
        translateY.value = withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(0, { damping: 25, stiffness: 100 });
      }
    } else {
      if (Platform.OS === 'android') {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: 400,
          easing: Easing.in(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(SCREEN_HEIGHT);
      }
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
      if (Platform.OS === 'android') {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: 400,
          easing: Easing.in(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(SCREEN_HEIGHT);
      }
      runOnJS(onClose)();
    } else {
      if (Platform.OS === 'android') {
        translateY.value = withTiming(0, {
          duration: 500,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(0, { damping: 25, stiffness: 100 });
      }
    }
  };

  console.log("Modal visibility check:", isVisible);
  if (!isVisible) {
    console.log("Modal not visible, returning null");
    return null;
  }

  return (
    <GestureHandlerRootView className="absolute inset-0 z-50 items-center justify-end">
      {/* Background overlay */}
        <TouchableOpacity
        className="absolute inset-0 bg-black/30" 
        activeOpacity={1}
        onPress={() => {
          if (Platform.OS === 'android') {
            translateY.value = withTiming(SCREEN_HEIGHT, {
              duration: 400,
              easing: Easing.in(Easing.cubic),
            });
          } else {
            translateY.value = withSpring(SCREEN_HEIGHT);
          }
          runOnJS(onClose)();
        }}
      />

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
              width: SCREEN_WIDTH,
            },
          ]}
          className="bg-white rounded-t-3xl p-6"
        >
          {/* Handle */}
          <View className="w-[36px] h-[4px] bg-gray-300 self-center rounded-full mb-6 mt-0" />
          
          {/* Content */}
          <View className="flex flex-col justify-center items-center w-full">
            <Image 
              source={require("../../assets/images/Clip path group.png")} 
              className="w-24 h-24 mb-6"
            />

            <Text className="text-3xl font-rubik-semibold mb-4 text-[#1D2939] text-center">
              You've got an email
            </Text>

            <Text className="text-lg mb-8 text-[#667085] text-center font-rubik leading-6 px-4">
              Check your email, we've sent you a password reset link.
            </Text>

            <TouchableOpacity
              onPress={() => {
                if (Platform.OS === 'android') {
                  translateY.value = withTiming(SCREEN_HEIGHT, {
                    duration: 400,
                    easing: Easing.in(Easing.cubic),
                  });
                } else {
                  translateY.value = withSpring(SCREEN_HEIGHT);
                }
                runOnJS(onClose)();
                // Navigate to verify-reset with email parameter
                router.push({
                  pathname: "/auth/verify-reset",
                  params: { emailAddress }
                });
              }}
              className="bg-[#090E24] p-2 rounded-full w-full max-w-[333px] h-[45px] sm:h-[50px] md:h-[55px] items-center justify-center"
            >
              <Text className="text-white text-center font-rubik text-[14px] sm:text-[16px] font-semibold">
                Okay, Got It
              </Text>
            </TouchableOpacity>
    </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}
