import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  setAuthToastListener,
  type AuthToastPayload,
  type AuthToastVariant,
} from "./authToastBus";

const BRAND = "#256E63";
const ACCENT = "#FEA74E";

const VARIANT: Record<
  AuthToastVariant,
  { accent: string; icon: keyof typeof Ionicons.glyphMap; label: string }
> = {
  error: { accent: "#E11D48", icon: "lock-closed-outline", label: "Secure" },
  success: { accent: BRAND, icon: "checkmark-circle-outline", label: "Done" },
  warning: { accent: ACCENT, icon: "time-outline", label: "Session" },
  info: { accent: "#64748B", icon: "information-circle-outline", label: "Note" },
};

/**
 * Glassmorphism auth toast host — mount once at app root.
 */
export default function AuthGlassToastHost() {
  const insets = useSafeAreaInsets();
  const [payload, setPayload] = useState<AuthToastPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.94,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setPayload(null);
    });
  }, [opacity, scale, translateY]);

  const show = useCallback(
    (next: AuthToastPayload) => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      setPayload(next);
      setVisible(true);
      translateY.setValue(-120);
      opacity.setValue(0);
      scale.setValue(0.94);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 9,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
      const ms = next.durationMs ?? 3200;
      hideTimer.current = setTimeout(hide, ms);
    },
    [hide, opacity, scale, translateY]
  );

  useEffect(() => {
    setAuthToastListener(show);
    return () => {
      setAuthToastListener(null);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [show]);

  if (!visible || !payload) return null;

  const variant = payload.variant ?? "info";
  const meta = VARIANT[variant];

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingTop: Math.max(insets.top, 12) + 8 }]}
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }, { scale }],
        }}
      >
        <View style={styles.shadowWrap}>
          <View style={styles.card}>
            {Platform.OS === "ios" ? (
              <BlurView intensity={55} tint="light" style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.androidGlass]} />
            )}
            <View style={[styles.sheen, StyleSheet.absoluteFill]} />
            <View style={[styles.accentBar, { backgroundColor: meta.accent }]} />

            <View style={styles.row}>
              <View
                style={[styles.iconBadge, { backgroundColor: `${meta.accent}22` }]}
              >
                <Ionicons name={meta.icon} size={20} color={meta.accent} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.eyebrow}>{meta.label}</Text>
                <Text style={styles.title} numberOfLines={2}>
                  {payload.title}
                </Text>
                {payload.message ? (
                  <Text style={styles.message} numberOfLines={3}>
                    {payload.message}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={hide}
                hitSlop={10}
                accessibilityLabel="Dismiss"
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    elevation: 99999,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  shadowWrap: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: Platform.OS === "ios" ? "rgba(255,255,255,0.28)" : "transparent",
  },
  androidGlass: {
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  sheen: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 16,
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    paddingRight: 4,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#64748B",
    fontFamily: "Rubik-Medium",
    marginBottom: 2,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    color: "#0F172A",
    fontFamily: "Rubik-SemiBold",
  },
  message: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: "#475569",
    fontFamily: "Rubik",
  },
});
