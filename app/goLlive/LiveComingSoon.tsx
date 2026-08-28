import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const INK = "#090E24";
const BRAND_GREEN = "#256E63";
const LIVE_RED = "#E53E3E";

type Feature = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
};

const liveFeatures: Feature[] = [
  {
    icon: "radio-outline",
    label: "Live Sermons & Services",
    desc: "Stream Sunday services, teachings, and conferences in HD video",
  },
  {
    icon: "hand-right-outline",
    label: "Real-Time Prayer Rooms",
    desc: "Gather believers worldwide for live intercession & prayer chains",
  },
  {
    icon: "chatbubbles-outline",
    label: "Interactive Live Chat",
    desc: "Engage viewers with scripture pins, Q&A, and moderated chat",
  },
  {
    icon: "musical-notes-outline",
    label: "Gospel Music Sessions",
    desc: "Stream live praise, worship, and acoustic sessions with low latency",
  },
  {
    icon: "videocam-outline",
    label: "Instant Replays & Archives",
    desc: "Automatically convert live broadcasts into replayable video sermons",
  },
  {
    icon: "bar-chart-outline",
    label: "Audience Polls & Call-Ins",
    desc: "Participate in real-time polling and live audience questions",
  },
];

export default function LiveComingSoon() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [notified, setNotified] = useState(false);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      router.back();
    }
  };

  const handleGoHome = () => {
    router.push("/categories/HomeScreen");
  };

  const handleToggleNotify = () => {
    const nextState = !notified;
    setNotified(nextState);
    if (nextState) {
      Alert.alert(
        "You're on the list! 🎉",
        "We'll notify you as soon as Live Broadcasting launches in the next app update."
      );
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={22} color={INK} />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>JEVAH</Text>
          <Text style={styles.headerTitle}>Live Broadcasts</Text>
          <Text style={styles.headerSub}>
            Real-time sermons, worship services, and prayer broadcasts for the global body of Christ.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Notice Card */}
        <View style={styles.notice}>
          <View style={styles.noticeBadge}>
            <View style={styles.noticeDot} />
            <Text style={styles.noticeBadgeText}>Arriving in next update</Text>
          </View>
          <Text style={styles.noticeTitle}>
            A dedicated live broadcasting platform is on the way
          </Text>
          <Text style={styles.noticeBody}>
            We are building Live streaming carefully so video latency stays low,
            chat stays kind and focused, and prayer broadcasts run smoothly.
          </Text>
        </View>

        {/* Section Label */}
        <Text style={styles.sectionLabel}>What to expect</Text>

        {/* Feature List */}
        <View style={styles.list}>
          {liveFeatures.map((f, i) => (
            <View
              key={f.label}
              style={[
                styles.row,
                i === liveFeatures.length - 1 && styles.rowLast,
              ]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={f.icon} size={19} color={LIVE_RED} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowLabel}>{f.label}</Text>
                <Text style={styles.rowDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Scripture Quote Block */}
        <View style={styles.quoteBlock}>
          <Text style={styles.quoteText}>
            “Go into all the world and preach the gospel to all creation.”
          </Text>
          <Text style={styles.quoteRef}>Mark 16:15</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            onPress={handleToggleNotify}
            activeOpacity={0.8}
            style={[
              styles.notifyButton,
              notified && styles.notifyButtonActive,
            ]}
          >
            <Ionicons
              name={notified ? "checkmark-circle" : "notifications-outline"}
              size={20}
              color={notified ? "#256E63" : INK}
            />
            <Text
              style={[
                styles.notifyButtonText,
                notified && styles.notifyButtonTextActive,
              ]}
            >
              {notified ? "You will be notified!" : "Notify Me When Live"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoHome}
            activeOpacity={0.85}
            style={styles.homeButtonWrapper}
          >
            <LinearGradient
              colors={[BRAND_GREEN, "#1E584F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.homeButtonGradient}
            >
              <Text style={styles.homeButtonText}>Back to Home</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingBottom: 22,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F2F4F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  headerCopy: { gap: 6 },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.4,
    color: "#98A2B3",
    fontFamily: "PlusJakartaSans-Bold",
  },
  headerTitle: {
    fontSize: 34,
    lineHeight: 40,
    color: INK,
    fontFamily: "PlusJakartaSans-ExtraBold",
    letterSpacing: -0.6,
  },
  headerSub: {
    fontSize: 14,
    lineHeight: 21,
    color: "#667085",
    fontFamily: "PlusJakartaSans-Regular",
    maxWidth: 320,
  },

  /* Scroll */
  scroll: { paddingHorizontal: 20 },

  /* Notice card */
  notice: {
    backgroundColor: "#F7F9F9",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E7EDEC",
    marginBottom: 32,
  },
  noticeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#E7EDEC",
    marginBottom: 14,
  },
  noticeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: LIVE_RED,
    marginRight: 7,
  },
  noticeBadgeText: {
    fontSize: 11,
    color: "#475467",
    fontFamily: "PlusJakartaSans-Bold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  noticeTitle: {
    fontSize: 18,
    lineHeight: 26,
    color: INK,
    fontFamily: "PlusJakartaSans-Bold",
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  noticeBody: {
    fontSize: 13,
    lineHeight: 21,
    color: "#667085",
    fontFamily: "PlusJakartaSans-Regular",
  },

  /* Section label */
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#98A2B3",
    fontFamily: "PlusJakartaSans-Bold",
    marginBottom: 12,
  },

  /* Feature list */
  list: {
    borderTopWidth: 1,
    borderTopColor: "#F0F2F5",
    marginBottom: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowCopy: { flex: 1 },
  rowLabel: {
    fontSize: 15,
    color: INK,
    fontFamily: "PlusJakartaSans-Bold",
    marginBottom: 2,
  },
  rowDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    color: "#667085",
    fontFamily: "PlusJakartaSans-Regular",
  },

  /* Quote */
  quoteBlock: {
    borderLeftWidth: 3,
    borderLeftColor: LIVE_RED,
    paddingLeft: 16,
    paddingVertical: 4,
    marginBottom: 32,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#344054",
    fontFamily: "PlusJakartaSans-Medium",
    marginBottom: 6,
  },
  quoteRef: {
    fontSize: 12,
    color: LIVE_RED,
    fontFamily: "PlusJakartaSans-Bold",
    letterSpacing: 0.3,
  },

  /* Actions */
  actionContainer: {
    gap: 12,
    marginBottom: 16,
  },
  notifyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#F2F4F7",
    borderWidth: 1,
    borderColor: "#E4E7EC",
  },
  notifyButtonActive: {
    backgroundColor: "rgba(37, 110, 99, 0.08)",
    borderColor: "rgba(37, 110, 99, 0.3)",
  },
  notifyButtonText: {
    fontSize: 14,
    color: INK,
    fontFamily: "PlusJakartaSans-SemiBold",
  },
  notifyButtonTextActive: {
    color: BRAND_GREEN,
  },
  homeButtonWrapper: {
    borderRadius: 999,
    overflow: "hidden",
  },
  homeButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  homeButtonText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#FFFFFF",
  },
});


