import { useEffect } from "react";
import { Dimensions, Platform, Text, TouchableOpacity, View } from "react-native";
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
import {
    getResponsiveBorderRadius,
    getResponsiveSpacing,
    getResponsiveTextStyle,
} from "../../utils/responsive";

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
      // Use slower animation for Android to ensure smooth sliding
      if (Platform.OS === 'android') {
        translateY.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(0, { damping: 30 });
      }
    } else {
      if (Platform.OS === 'android') {
        translateY.value = withTiming(SCREEN_HEIGHT, {
          duration: 300,
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
          duration: 300,
          easing: Easing.in(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(SCREEN_HEIGHT);
      }
      runOnJS(onCancel)();
    } else {
      if (Platform.OS === 'android') {
        translateY.value = withTiming(0, {
          duration: 400,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        translateY.value = withSpring(0, { damping: 30 });
      }
    }
  };

  if (!isVisible) return null;

  return (
    <GestureHandlerRootView className="absolute inset-0 z-50 items-center justify-end">
      {/* Background overlay */}
      <TouchableOpacity 
        className="absolute inset-0 bg-black/30" 
        activeOpacity={1}
        onPress={() => {
          if (Platform.OS === 'android') {
            translateY.value = withTiming(SCREEN_HEIGHT, {
              duration: 300,
              easing: Easing.in(Easing.cubic),
            });
          } else {
            translateY.value = withSpring(SCREEN_HEIGHT);
          }
          runOnJS(onCancel)();
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
              // Android-specific left offset (slightly less left)
              ...(Platform.OS === 'android' && {
                left: -getResponsiveSpacing(160, 200, 240, 280), // Slightly less left offset
              }),
            },
          ]}
          className="bg-white rounded-t-3xl"
        >
          {/* Content container with responsive padding */}
          <View style={{
            paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
            paddingVertical: getResponsiveSpacing(20, 24, 28, 32),
          }}>
            {/* Drag indicator */}
            <View style={{
              width: getResponsiveSpacing(36, 40, 44, 48),
              height: getResponsiveSpacing(4, 5, 6, 7),
              marginBottom: getResponsiveSpacing(20, 24, 28, 32),
              marginTop: 0,
            }} className="bg-gray-300 self-center rounded-full" />
            
            {/* Title */}
            <Text style={[
              getResponsiveTextStyle('title'),
              {
                textAlign: 'center',
                color: '#1D2939',
                marginBottom: getResponsiveSpacing(8, 10, 12, 16),
              }
            ]} className="font-rubik-semibold">
              Set as profile image?
            </Text>
            
            {/* Description */}
            <Text style={[
              getResponsiveTextStyle('body'),
              {
                textAlign: 'center',
                color: '#6B7280',
                marginBottom: getResponsiveSpacing(20, 24, 28, 32),
                lineHeight: getResponsiveSpacing(20, 22, 24, 26),
              }
            ]} className="font-rubik">
              Well done choosing this avatar as your profile picture. Don't worry, you can always change it whenever you want.
            </Text>

            {/* Action buttons */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: getResponsiveSpacing(12, 16, 20, 24),
              marginTop: getResponsiveSpacing(12, 16, 20, 24),
            }}>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'android') {
                    translateY.value = withTiming(SCREEN_HEIGHT, {
                      duration: 300,
                      easing: Easing.in(Easing.cubic),
                    });
                  } else {
                    translateY.value = withSpring(SCREEN_HEIGHT);
                  }
                  runOnJS(onCancel)();
                }}
                style={{
                  flex: 1,
                  paddingVertical: getResponsiveSpacing(12, 14, 16, 18),
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: getResponsiveBorderRadius('round'),
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  getResponsiveTextStyle('button'),
                  {
                    textAlign: 'center',
                    color: '#6B7280',
                    fontWeight: '600',
                  }
                ]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'android') {
                    translateY.value = withTiming(SCREEN_HEIGHT, {
                      duration: 300,
                      easing: Easing.in(Easing.cubic),
                    });
                  } else {
                    translateY.value = withSpring(SCREEN_HEIGHT);
                  }
                  runOnJS(onConfirm)();
                }}
                style={{
                  flex: 1,
                  paddingVertical: getResponsiveSpacing(12, 14, 16, 18),
                  backgroundColor: isLoading ? '#9CA3AF' : '#111827',
                  borderRadius: getResponsiveBorderRadius('round'),
                }}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={[
                  getResponsiveTextStyle('button'),
                  {
                    textAlign: 'center',
                    color: 'white',
                    fontWeight: '600',
                  }
                ]}>
                  {isLoading ? "Uploading..." : "Yes please"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}
