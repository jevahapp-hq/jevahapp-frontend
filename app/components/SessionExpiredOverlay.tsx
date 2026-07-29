/**
 * Session-expired bottom sheet — rounded top corners, high-contrast, animated icon.
 * Stale / unknown user on this API → clear identity and force login (IG/TikTok).
 */
import { useClerk } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  clearLocalSessionState,
  resetSessionExpiredGate,
  subscribeSessionExpired,
} from "../utils/sessionExpired";

const AUTO_REDIRECT_MS = 3200;
const BRAND = "#256E63";
const ACCENT = "#FEA74E";
const { height: SCREEN_H } = Dimensions.get("window");

export default function SessionExpiredOverlay() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { signOut: clerkSignOut } = useClerk();
  const [visible, setVisible] = useState(false);
  const navigatingRef = useRef(false);

  const sheetY = useRef(new Animated.Value(SCREEN_H)).current;
  const dimOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.5)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  const goToLogin = useCallback(async () => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    try {
      await clearLocalSessionState();
      queryClient.setQueryData(["user-profile"], null);
      queryClient.removeQueries({ queryKey: ["user-profile"] });
      try {
        await clerkSignOut();
      } catch {
        // App may not have an active Clerk session
      }
    } catch {
      // no-op
    }
    setVisible(false);
    resetSessionExpiredGate();
    try {
      router.replace("/auth/login");
    } catch {
      try {
        router.push("/auth/login");
      } catch {
        // Router may be unready
      }
    }
    navigatingRef.current = false;
  }, [clerkSignOut, queryClient]);

  useEffect(() => {
    return subscribeSessionExpired(() => {
      // Drop cached profile immediately so chrome stops looking signed-in
      queryClient.setQueryData(["user-profile"], null);
      queryClient.removeQueries({ queryKey: ["user-profile"] });
      setVisible(true);
    });
  }, [queryClient]);

  useEffect(() => {
    if (!visible) return;

    navigatingRef.current = false;
    sheetY.setValue(SCREEN_H * 0.45);
    dimOpacity.setValue(0);
    iconScale.setValue(0.5);

    Animated.parallel([
      Animated.timing(dimOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(sheetY, {
        toValue: 0,
        friction: 9,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const timer = setTimeout(() => {
      void goToLogin();
    }, AUTO_REDIRECT_MS);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
    };
  }, [visible, goToLogin, sheetY, dimOpacity, iconScale, pulse]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        void goToLogin();
      }}
    >
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View
          style={[styles.dim, { opacity: dimOpacity }]}
          pointerEvents="none"
        />

        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 20) + 8,
              transform: [{ translateY: sheetY }],
            },
          ]}
        >
          <View style={styles.handle} />

          {/* Icon sits high on the sheet for visibility */}
          <Animated.View
            style={[
              styles.iconWrap,
              {
                transform: [
                  { scale: Animated.multiply(iconScale, pulse) },
                ],
              },
            ]}
          >
            <View style={styles.iconOuter}>
              <View style={styles.iconInner}>
                <Ionicons name="lock-closed" size={56} color={BRAND} />
              </View>
            </View>
          </Animated.View>

          <Text style={styles.title}>Session expired</Text>
          <Text style={styles.subtitle}>
            Your sign-in timed out. Log in again to keep using likes, comments,
            and saves.
          </Text>

          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.88}
            onPress={() => {
              void goToLogin();
            }}
          >
            <Text style={styles.ctaText}>Log in</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.hint}>Taking you to login automatically…</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
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
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0D5DD",
    marginBottom: 8,
  },
  iconWrap: {
    marginTop: 4,
    marginBottom: 18,
  },
  iconOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: "#FFF4E5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: ACCENT,
  },
  iconInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#101828",
    fontFamily: "Rubik-Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475467",
    fontFamily: "Rubik-Regular",
    textAlign: "center",
    maxWidth: 320,
    marginBottom: 24,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: "100%",
    maxWidth: 360,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "Rubik-SemiBold",
  },
  hint: {
    marginTop: 14,
    fontSize: 13,
    color: "#98A2B3",
    fontFamily: "Rubik-Regular",
  },
});
