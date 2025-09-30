import { useEffect } from "react";
import {
    Dimensions,
    Modal,
    Platform,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
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

interface JoinGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onJoin: () => void;
  groupTitle: string;
  groupDescription: string;
  groupMembers: number;
}

export default function JoinGroupModal({
  visible,
  onClose,
  onJoin,
  groupTitle,
  groupDescription,
  groupMembers,
}: JoinGroupModalProps) {
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const lastTranslateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 100,
        mass: 1,
        overshootClamping: true,
      });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 20,
        stiffness: 100,
        mass: 1,
        overshootClamping: true,
      });
    }
  }, [visible, translateY]);

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
      translateY.value = withSpring(SCREEN_HEIGHT, {
        damping: 20,
        stiffness: 100,
        mass: 1,
        overshootClamping: true,
      });
      runOnJS(onClose)();
    } else {
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 100,
        mass: 1,
        overshootClamping: true,
      });
    }
  };

  const handleClose = () => {
    translateY.value = withSpring(SCREEN_HEIGHT, {
      damping: 20,
      stiffness: 100,
      mass: 1,
      overshootClamping: true,
    });
    runOnJS(onClose)();
  };

  const handleJoin = () => {
    translateY.value = withSpring(SCREEN_HEIGHT, {
      damping: 20,
      stiffness: 100,
      mass: 1,
      overshootClamping: true,
    });
    runOnJS(onJoin)();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Background overlay */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.3)",
            }}
          />
        </TouchableWithoutFeedback>

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
                backgroundColor: "white",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 24,
                paddingVertical: 24,
                maxHeight: SCREEN_HEIGHT * 0.6,
                minHeight: 320,
              },
            ]}
          >
            {/* Handle */}
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: "#D1D5DB",
                alignSelf: "center",
                borderRadius: 2,
                marginBottom: 24,
                marginTop: 0,
              }}
            />

            {/* Group Title */}
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#000",
                textAlign: "center",
                marginBottom: 8,
                fontFamily: "Rubik-Bold",
              }}
            >
              {groupTitle}
            </Text>

            {/* Members Count */}
            <Text
              style={{
                fontSize: 16,
                color: "#666",
                textAlign: "center",
                marginBottom: 16,
                fontFamily: "Rubik-Regular",
              }}
            >
              {groupMembers.toLocaleString()} Members
            </Text>

            {/* Group Description */}
            <Text
              style={{
                fontSize: 16,
                color: "#333",
                textAlign: "center",
                lineHeight: 24,
                marginBottom: 32,
                paddingHorizontal: 16,
                fontFamily: "Rubik-Regular",
              }}
            >
              {groupDescription}
            </Text>

            {/* Join Button */}
            <TouchableOpacity
              onPress={handleJoin}
              style={{
                backgroundColor: "#1A1A1A",
                paddingVertical: 16,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: Platform.OS === "ios" ? 20 : 16,
              }}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: "white",
                  fontSize: 18,
                  fontWeight: "bold",
                  fontFamily: "Rubik-Bold",
                }}
              >
                Join
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>
    </Modal>
  );
}
