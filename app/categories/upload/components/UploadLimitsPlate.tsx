/**
 * Premium upload limits / guidelines plate — collapsible with measured height.
 */

import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  getResponsiveFontSize,
  getResponsiveSpacing,
} from "../../../../utils/responsive";
import { isLiteProfileActive } from "../../../../src/shared/lite/liteProfile";
import { useReduceMotion } from "../hooks/useReduceMotion";

type UploadLimitsPlateProps = {
  selectedType: string;
};

type LimitRow = { icon: keyof typeof Ionicons.glyphMap; text: string };

function getLimitRows(selectedType: string): LimitRow[] {
  const lite = isLiteProfileActive();
  const videoCap = lite ? "Up to 64 MB per video on this device" : "Up to 300 MB per video";
  if (selectedType === "music") {
    return [
      { icon: "cloud-upload-outline", text: "Up to 50 MB per song" },
      { icon: "library-outline", text: "Library cap: 50 songs" },
      { icon: "time-outline", text: "Max 10 uploads per hour" },
    ];
  }
  if (selectedType === "sermon" || selectedType === "videos") {
    return [
      { icon: "cloud-upload-outline", text: videoCap },
      { icon: "film-outline", text: "Library cap: 30 videos" },
      { icon: "time-outline", text: "Max 10 uploads per hour" },
    ];
  }
  if (selectedType === "books" || selectedType === "ebook") {
    return [
      { icon: "cloud-upload-outline", text: "Up to 100 MB per file" },
      { icon: "document-text-outline", text: "PDF / EPUB preferred" },
      { icon: "time-outline", text: "Max 10 uploads per hour" },
    ];
  }
  if (selectedType === "podcasts") {
    return [
      { icon: "cloud-upload-outline", text: "Up to 100 MB per episode" },
      { icon: "mic-outline", text: "Audio formats: MP3, WAV, M4A" },
      { icon: "time-outline", text: "Max 10 uploads per hour" },
    ];
  }
  return [
    { icon: "videocam-outline", text: lite ? "Videos up to 64 MB on this device" : "Videos up to 300 MB" },
    { icon: "musical-note-outline", text: "Music up to 50 MB" },
    { icon: "book-outline", text: "Books up to 100 MB" },
  ];
}

export function UploadLimitsPlate({ selectedType }: UploadLimitsPlateProps) {
  const rows = getLimitRows(selectedType);
  const pad = getResponsiveSpacing(14, 16, 18);
  const [expanded, setExpanded] = useState(false);
  const [bodyH, setBodyH] = useState(0);
  const reduceMotion = useReduceMotion();
  const open = useSharedValue(0);

  useEffect(() => {
    open.value = withTiming(expanded ? 1 : 0, {
      duration: reduceMotion ? 0 : 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [expanded, open, reduceMotion]);

  const onBodyLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && Math.abs(h - bodyH) > 1) setBodyH(h);
  };

  const bodyStyle = useAnimatedStyle(() => ({
    height: open.value * bodyH,
    opacity: bodyH === 0 ? 0 : open.value,
    overflow: "hidden" as const,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${open.value * 180}deg` }],
  }));

  return (
    <View style={styles.card}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="Upload guidelines"
        style={[
          styles.header,
          {
            paddingHorizontal: pad,
            paddingTop: pad,
            paddingBottom: pad,
          },
        ]}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#0F172A" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Upload guidelines</Text>
          <Text style={styles.subtitle}>
            {expanded
              ? "Tap to collapse"
              : "So your post clears checks the first time"}
          </Text>
        </View>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={18} color="#64748B" />
        </Animated.View>
      </Pressable>

      {/* Measure natural height off-layout, drive animated clip from it */}
      <View
        style={[styles.measure, { pointerEvents: "none" }]}
        onLayout={onBodyLayout}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View
          style={{
            paddingHorizontal: pad,
            paddingBottom: pad,
            gap: getResponsiveSpacing(8, 9, 10),
          }}
        >
          {rows.map((row) => (
            <View key={row.text} style={styles.row}>
              <Ionicons
                name={row.icon}
                size={16}
                color="#475569"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.rowText}>{row.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <Animated.View
        style={[bodyStyle, { pointerEvents: expanded ? "auto" : "none" }]}
      >
        <View
          style={{
            paddingHorizontal: pad,
            paddingBottom: pad,
            gap: getResponsiveSpacing(8, 9, 10),
          }}
        >
          {rows.map((row) => (
            <View key={row.text} style={styles.row}>
              <Ionicons
                name={row.icon}
                size={16}
                color="#475569"
                style={{ marginRight: 10 }}
              />
              <Text style={styles.rowText}>{row.text}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: getResponsiveSpacing(18, 22, 26),
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E8EDF5",
    backgroundColor: "#FBFCFD",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: "#0F172A",
    fontFamily: "Rubik-SemiBold",
    fontSize: getResponsiveFontSize(13, 14, 15),
  },
  subtitle: {
    color: "#64748B",
    fontFamily: "Rubik-Regular",
    fontSize: getResponsiveFontSize(11, 12, 13),
    marginTop: 2,
  },
  measure: {
    position: "absolute",
    opacity: 0,
    left: 0,
    right: 0,
    zIndex: -1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF2F7",
    paddingVertical: getResponsiveSpacing(9, 10, 11),
    paddingHorizontal: getResponsiveSpacing(10, 12, 12),
  },
  rowText: {
    flex: 1,
    color: "#334155",
    fontFamily: "Rubik-Medium",
    fontSize: getResponsiveFontSize(11, 12, 13),
  },
});
