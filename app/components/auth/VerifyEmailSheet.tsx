/**
 * Signup email verification bottom sheet (2 steps).
 * Rounded top corners, dim backdrop, drag-to-dismiss.
 * Not a route — imported by signup.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  PanGestureHandler,
  State,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SPRING = { damping: 26, stiffness: 280, mass: 0.8 };
const BRAND = "#256E63";
const INK = "#090E24";

export type VerifyEmailModalProps = {
  visible: boolean;
  onClose: () => void;
  onVerify?: () => void;
  emailAddress: string;
  password: string;
  firstName: string;
  lastName: string;
};

type Step = "verify" | "emailSent";

export default function VerifyEmailSheet({
  visible,
  onClose,
  onVerify,
  emailAddress,
  password,
  firstName,
  lastName,
}: VerifyEmailModalProps) {
  const insets = useSafeAreaInsets();
  const { resendVerification } = useAuth();

  const [step, setStep] = useState<Step>("verify");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendMessage, setSendMessage] = useState<string | null>(null);

  const sheetY = useSharedValue(SCREEN_HEIGHT);
  const dimOpacity = useSharedValue(0);
  const dragY = useSharedValue(0);

  const dismiss = useCallback(() => {
    sheetY.value = withTiming(SCREEN_HEIGHT, { duration: 240 });
    dimOpacity.value = withTiming(0, { duration: 200 });
    runOnJS(onClose)();
  }, [onClose, sheetY, dimOpacity]);

  useEffect(() => {
    if (visible) {
      setStep("verify");
      setSendError(null);
      setSendMessage(null);
      setSending(false);
      dragY.value = 0;
      dimOpacity.value = withTiming(1, { duration: 220 });
      sheetY.value = withSpring(0, SPRING);
    } else {
      sheetY.value = SCREEN_HEIGHT;
      dimOpacity.value = 0;
      dragY.value = 0;
    }
  }, [visible, sheetY, dimOpacity, dragY]);

  const handleVerifyMe = async () => {
    if (sending) return;
    setSending(true);
    setSendError(null);
    setSendMessage(null);

    try {
      const res: any = await resendVerification(emailAddress);
      const msg =
        res?.message || res?.data?.message || "Verification email sent";
      setSendMessage(msg);
      onVerify?.();
      setStep("emailSent");
    } catch (e: any) {
      setSendError(e?.message || "Failed to send verification email");
      // Still advance so user can continue to code entry if email was already sent
      setStep("emailSent");
    } finally {
      setSending(false);
    }
  };

  const handleContinueToCode = () => {
    sheetY.value = withTiming(SCREEN_HEIGHT, { duration: 220 });
    dimOpacity.value = withTiming(0, { duration: 180 });
    onClose();
    setTimeout(() => {
      router.push({
        pathname: "/auth/codeVerification",
        params: {
          emailAddress,
          password,
          firstName,
          lastName,
        },
      });
    }, 180);
  };

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetY.value + dragY.value }],
  }));

  const dimStyle = useAnimatedStyle(() => ({
    opacity: dimOpacity.value,
  }));

  if (!visible) return null;

  const isVerify = step === "verify";

  return (
    <GestureHandlerRootView style={styles.root}>
      <TouchableOpacity activeOpacity={1} onPress={dismiss} style={StyleSheet.absoluteFill}>
        <Animated.View style={[styles.dim, dimStyle]} pointerEvents="none" />
      </TouchableOpacity>

      <PanGestureHandler
        activeOffsetY={8}
        failOffsetX={[-24, 24]}
        onGestureEvent={(event) => {
          "worklet";
          const ty = event.nativeEvent.translationY;
          if (ty > 0) dragY.value = ty;
        }}
        onHandlerStateChange={(event) => {
          "worklet";
          if (event.nativeEvent.state !== State.END) return;
          const ty = event.nativeEvent.translationY;
          if (ty > 120) {
            dragY.value = 0;
            runOnJS(dismiss)();
          } else {
            dragY.value = withSpring(0, SPRING);
          }
        }}
      >
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 8 },
            sheetStyle,
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.iconWrap}>
            {isVerify ? (
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark" size={48} color={BRAND} />
              </View>
            ) : (
              <Image
                source={require("../../../assets/images/Clip path group.png")}
                style={styles.mailImage}
                resizeMode="contain"
              />
            )}
          </View>

          <Text style={styles.title}>
            {isVerify ? "We've got to verify you" : "You've got an email"}
          </Text>

          <Text style={styles.subtitle}>
            {isVerify
              ? `We'll send a verification code to ${emailAddress || "your email"}. It only takes a minute to finish signup.`
              : "Check your inbox for the code. If you don't see it, look in spam — then enter it on the next screen."}
          </Text>

          {sendError ? <Text style={styles.error}>{sendError}</Text> : null}
          {sendMessage && !isVerify ? (
            <Text style={styles.success}>{sendMessage}</Text>
          ) : null}

          {isVerify ? (
            <TouchableOpacity
              style={[styles.cta, sending && styles.ctaDisabled]}
              activeOpacity={0.88}
              disabled={sending}
              onPress={() => {
                void handleVerifyMe();
              }}
            >
              {sending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Send verification code</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.cta}
              activeOpacity={0.88}
              onPress={handleContinueToCode}
            >
              <Text style={styles.ctaText}>Okay, got it</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {isVerify ? (
            <TouchableOpacity onPress={dismiss} hitSlop={12} style={styles.secondary}>
              <Text style={styles.secondaryText}>Not now</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: "flex-end",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 22,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0D5DD",
    marginBottom: 16,
  },
  iconWrap: {
    marginBottom: 16,
    alignItems: "center",
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E8F5F1",
    alignItems: "center",
    justifyContent: "center",
  },
  mailImage: {
    width: 96,
    height: 96,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#101828",
    fontFamily: "PlusJakartaSans-Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475467",
    fontFamily: "PlusJakartaSans-Regular",
    textAlign: "center",
    maxWidth: 340,
    marginBottom: 18,
  },
  error: {
    color: "#D92D20",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "PlusJakartaSans-Regular",
  },
  success: {
    color: BRAND,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "PlusJakartaSans-Regular",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: INK,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 360,
    minHeight: 52,
  },
  ctaDisabled: {
    opacity: 0.65,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  secondary: {
    marginTop: 14,
    paddingVertical: 8,
  },
  secondaryText: {
    color: "#667085",
    fontSize: 14,
    fontFamily: "PlusJakartaSans-Regular",
  },
});
