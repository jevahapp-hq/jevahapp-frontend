import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Dimensions,
  Image,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { pausePlaybackSession } from "../../../src/shared/audio/playOrToggleTrack";
import {
  releaseMiniPlayer,
  suppressMiniPlayer,
} from "../../../src/shared/audio/miniPlayerGate";
import { isLiteProfileActive } from "../../../src/shared/lite/liteProfile";
import { triggerHapticFeedback } from "../../../src/shared/utils/haptics";
import {
  getBottomNavHeight,
  getFabSize,
  getResponsiveSpacing,
} from "../../../utils/responsive";
import { trackEvent } from "../../utils/analytics";
import { useGlobalVideoStore } from "@/store/useGlobalVideoStore";
import type { LoginTourDismissReason } from "./useNewUserLoginTour";

type Slide = {
  kicker: string;
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  welcome?: boolean;
};

const SLIDES: Slide[] = [
  {
    kicker: "A new beginning",
    title: "Welcome home",
    body: "Watch, listen, read, and gather — gospel in one place. Three things. Then you’re in.",
    icon: "sparkles-outline",
    welcome: true,
  },
  {
    kicker: "Your house",
    title: "Feed, gather, keep, read",
    body: "Home is the stream. Community is prayer. Library holds what you save. Bible is the Word — even offline.",
    icon: "apps-outline",
  },
  {
    kicker: "Create",
    title: "The plus is your pulpit",
    body: "Upload a song, a sermon, a book. We’ll show you the button next.",
    icon: "add-circle-outline",
  },
];

type Props = {
  firstName?: string;
  onSpotlightChange: (on: boolean) => void;
  onDone: (reason: LoginTourDismissReason, slide: number) => void;
};

function Orb({
  delay,
  size,
  left,
  top,
  enabled,
}: {
  delay: number;
  size: number;
  left: string;
  top: string;
  enabled: boolean;
}) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (!enabled) return;
    y.value = withRepeat(
      withSequence(
        withTiming(-18, {
          duration: 4200 + delay,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(12, {
          duration: 4200 + delay,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      true
    );
  }, [delay, enabled, y]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: enabled ? y.value : 0 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.orb,
        { width: size, height: size, left, top, borderRadius: size / 2 },
        style,
      ]}
    />
  );
}

function fabLayout(_insetsBottom: number) {
  const { width, height } = Dimensions.get("window");
  const navBarHeight = getBottomNavHeight();
  const fab = getFabSize();
  const pad = getResponsiveSpacing(2, 3, 4, 5);
  const lift = getResponsiveSpacing(40, 44, 48, 52);
  const outer = fab.size + pad * 2;
  const hole = outer + 18;
  const left = (width - hole) / 2;
  const bottom = navBarHeight - lift - 9;
  const top = height - bottom - hole;
  return { left, top, hole, bottom, width, height };
}

export default function NewUserLoginTour({
  firstName,
  onSpotlightChange,
  onDone,
}: Props) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [spotlight, setSpotlight] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const lite = isLiteProfileActive();
  const motion = !reduceMotion && !lite;
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;
  const fab = useMemo(() => fabLayout(insets.bottom), [insets.bottom]);

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.45);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (alive) setReduceMotion(Boolean(v));
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    suppressMiniPlayer("login-tour");
    const pause = () => {
      try {
        useGlobalVideoStore.getState().pauseAllVideos();
      } catch {
        // no-op
      }
      void pausePlaybackSession();
    };
    pause();
    const again = setTimeout(pause, 700);
    return () => {
      clearTimeout(again);
      releaseMiniPlayer("login-tour");
    };
  }, []);

  useEffect(() => {
    if (!motion) {
      pulse.value = 1;
      glow.value = 0.55;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.07, { duration: 1600, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    glow.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1800 }),
        withTiming(0.4, { duration: 1800 })
      ),
      -1,
      true
    );
  }, [glow, motion, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: interpolate(glow.value, [0.4, 0.85], [0.55, 1]),
  }));

  const title = useMemo(() => {
    if (slide.welcome && firstName) return `Welcome home, ${firstName}`;
    return slide.title;
  }, [firstName, slide]);

  const finish = (reason: LoginTourDismissReason) => {
    onSpotlightChange(false);
    onDone(reason, index);
  };

  const enterSpotlight = () => {
    triggerHapticFeedback("medium");
    setSpotlight(true);
    onSpotlightChange(true);
    trackEvent("tour_spotlight_shown", {});
  };

  const goNext = () => {
    if (last) {
      enterSpotlight();
      return;
    }
    triggerHapticFeedback("light");
    setIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  };

  if (spotlight) {
    return (
      <View style={styles.spotRoot} pointerEvents="box-none">
        <StatusBar barStyle="light-content" />
        <View style={[styles.dim, { height: fab.top, width: "100%" }]} />
        <View style={[styles.dimRow, { top: fab.top, height: fab.hole }]}>
          <View style={[styles.dim, { width: fab.left }]} />
          <Pressable
            onPress={() => finish("completed")}
            style={{ width: fab.hole, height: fab.hole }}
            accessibilityLabel="Got it, that’s the plus button"
          />
          <View style={[styles.dim, { flex: 1 }]} />
        </View>
        <View
          style={[
            styles.dim,
            {
              position: "absolute",
              left: 0,
              right: 0,
              top: fab.top + fab.hole,
              bottom: 0,
            },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.spotRing,
            ringStyle,
            {
              left: fab.left,
              top: fab.top,
              width: fab.hole,
              height: fab.hole,
              borderRadius: fab.hole / 2,
            },
          ]}
        />
        <View
          style={[
            styles.tooltip,
            { bottom: fab.bottom + fab.hole + 12 },
          ]}
        >
          <Text style={styles.tooltipKicker}>CREATE</Text>
          <Text style={styles.tooltipTitle}>This plus is yours</Text>
          <Text style={styles.tooltipBody}>
            Tap it anytime to upload a sermon, a song, or a book.
          </Text>
          <Pressable
            onPress={() => finish("completed")}
            style={styles.gotIt}
            accessibilityRole="button"
          >
            <Text style={styles.gotItText}>Got it</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#061910", "#0A332D", "#0F3F36"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {motion ? (
        <>
          <Orb delay={0} size={220} left="-18%" top="8%" enabled />
          <Orb delay={400} size={160} left="62%" top="18%" enabled />
          <Orb delay={800} size={120} left="12%" top="62%" enabled />
        </>
      ) : null}

      <View
        style={[
          styles.chrome,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: insets.bottom + 16,
          },
        ]}
      >
        <View style={styles.topRow}>
          <Pressable
            onPress={() => {
              if (index === 0) return;
              triggerHapticFeedback("light");
              setIndex((i) => Math.max(i - 1, 0));
            }}
            hitSlop={12}
            style={[styles.ghostBtn, index === 0 && { opacity: 0 }]}
            disabled={index === 0}
            accessibilityLabel="Previous"
          >
            <Ionicons name="chevron-back" size={18} color="#F3EAD7" />
          </Pressable>
          <Text style={styles.brand}>JEVAH</Text>
          <Pressable
            onPress={() => {
              triggerHapticFeedback("light");
              finish("skipped");
            }}
            hitSlop={12}
            style={styles.ghostBtn}
            accessibilityLabel="Skip tour"
          >
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <View style={styles.stage}>
          <Animated.View
            key={index}
            entering={motion ? FadeIn.duration(380) : undefined}
            exiting={motion ? FadeOut.duration(180) : undefined}
            style={styles.stageInner}
          >
            {slide.welcome ? (
              <Image
                source={require("../../../assets/images/Jevah.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.iconWrap}>
                <Animated.View style={[styles.glowRing, ringStyle]} />
                <LinearGradient
                  colors={["#FEA74E", "#F4A53A"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconDisc}
                >
                  <Ionicons name={slide.icon} size={34} color="#0A332D" />
                </LinearGradient>
              </View>
            )}
            <Text style={styles.kicker}>{slide.kicker.toUpperCase()}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </Animated.View>
        </View>

        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View
              key={s.kicker}
              style={[styles.dot, i === index ? styles.dotOn : styles.dotOff]}
            />
          ))}
        </View>

        <Pressable
          onPress={goNext}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel={last ? "Show the plus button" : "Continue"}
        >
          <LinearGradient
            colors={["#FEA74E", "#F4A53A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaFill}
          >
            <Text style={styles.ctaText}>
              {last ? "Show me" : "Continue"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#0A332D" />
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    elevation: 80,
  },
  spotRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 80,
    elevation: 80,
  },
  dim: {
    backgroundColor: "rgba(6, 25, 16, 0.78)",
  },
  dimRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  spotRing: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#FEA74E",
    backgroundColor: "transparent",
  },
  tooltip: {
    position: "absolute",
    left: 24,
    right: 24,
    backgroundColor: "#0A332D",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(254, 167, 78, 0.35)",
  },
  tooltipKicker: {
    color: "#FEA74E",
    fontSize: 11,
    letterSpacing: 3,
    fontWeight: "700",
    marginBottom: 8,
  },
  tooltipTitle: {
    color: "#F3EAD7",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  tooltipBody: {
    color: "rgba(243, 234, 215, 0.78)",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  gotIt: {
    alignSelf: "flex-start",
    backgroundColor: "#FEA74E",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  gotItText: {
    color: "#0A332D",
    fontWeight: "800",
    fontSize: 15,
  },
  orb: {
    position: "absolute",
    backgroundColor: "rgba(254, 167, 78, 0.08)",
  },
  chrome: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    color: "#F3EAD7",
    letterSpacing: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  ghostBtn: {
    minWidth: 52,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  skip: {
    color: "rgba(243, 234, 215, 0.7)",
    fontSize: 14,
    fontWeight: "600",
  },
  stage: {
    flex: 1,
    justifyContent: "center",
  },
  stageInner: {
    alignItems: "center",
  },
  logo: {
    width: 92,
    height: 92,
    marginBottom: 28,
    borderRadius: 24,
  },
  iconWrap: {
    width: 112,
    height: 112,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  glowRing: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1.5,
    borderColor: "rgba(254, 167, 78, 0.45)",
    backgroundColor: "rgba(254, 167, 78, 0.08)",
  },
  iconDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: {
    color: "#FEA74E",
    fontSize: 11,
    letterSpacing: 3.2,
    fontWeight: "700",
    marginBottom: 10,
  },
  title: {
    color: "#F3EAD7",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  body: {
    color: "rgba(243, 234, 215, 0.78)",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 320,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    gap: 7,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotOn: {
    width: 22,
    backgroundColor: "#FEA74E",
  },
  dotOff: {
    width: 6,
    backgroundColor: "rgba(243, 234, 215, 0.28)",
  },
  cta: {
    borderRadius: 28,
    overflow: "hidden",
  },
  ctaFill: {
    height: 54,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: "#0A332D",
    fontSize: 16,
    fontWeight: "800",
  },
});
