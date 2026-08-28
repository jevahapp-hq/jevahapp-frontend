import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
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

const INK = "#090E24";
const BRAND = "#256E63";
const ACCENT = "#FEA74E";

const VARIANT: Record<
  AuthToastVariant,
  {
    icon: keyof typeof Ionicons.glyphMap;
    tint: string;
    soft: string;
    bar: string;
  }
> = {
  error: {
    icon: "alert-circle",
    tint: ACCENT,
    soft: "rgba(254,167,78,0.2)",
    bar: ACCENT,
  },
  success: {
    icon: "checkmark-circle",
    tint: "#4ADE80",
    soft: "rgba(37,110,99,0.28)",
    bar: BRAND,
  },
  warning: {
    icon: "time",
    tint: ACCENT,
    soft: "rgba(254,167,78,0.2)",
    bar: ACCENT,
  },
  info: {
    icon: "information-circle",
    tint: "#7DD3C0",
    soft: "rgba(37,110,99,0.22)",
    bar: BRAND,
  },
};

/**
 * Full-width banner toast. Keep the animated wrapper stretched —
 * otherwise Android collapses flex text to zero width (icon-only blob).
 */
export default function AuthGlassToastHost() {
  const insets = useSafeAreaInsets();
  const [payload, setPayload] = useState<AuthToastPayload | null>(null);
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setPayload(null);
    });
  }, [opacity, translateY]);

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

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 9,
          tension: 70,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      const ms = next.durationMs ?? 3800;
      hideTimer.current = setTimeout(hide, ms);
    },
    [hide, opacity, translateY]
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
      style={[styles.host, { paddingTop: Math.max(insets.top, 8) + 4 }]}
    >
      <Animated.View
        style={[
          styles.animWrap,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={[styles.iconBadge, { backgroundColor: meta.soft }]}>
              <Ionicons name={meta.icon} size={22} color={meta.tint} />
            </View>

            <View style={styles.copy}>
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
              hitSlop={12}
              accessibilityLabel="Dismiss"
              style={styles.dismiss}
            >
              <Ionicons
                name="close"
                size={16}
                color="rgba(255,255,255,0.55)"
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.accentLine, { backgroundColor: meta.bar }]} />
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
    paddingHorizontal: 14,
  },
  // Critical: stretch full host width so flex text isn't crushed to 0
  animWrap: {
    width: "100%",
    alignSelf: "stretch",
  },
  card: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: INK,
    borderWidth: 1,
    borderColor: "rgba(37,110,99,0.35)",
    ...Platform.select({
      ios: {
        shadowColor: BRAND,
        shadowOpacity: 0.22,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 12 },
      default: {},
    }),
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
    color: "#FFFFFF",
    fontFamily: "PlusJakartaSans_800ExtraBold",
    fontWeight: "700",
  },
  message: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.72)",
    fontFamily: "PlusJakartaSans_400Regular",
    fontWeight: "400",
  },
  dismiss: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  accentLine: {
    height: 2,
    width: "100%",
  },
});
