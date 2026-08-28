// CommunityScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { navigateMainTab } from "../utils/navigation";

const INK = "#090E24";
const BRAND_GREEN = "#256E63";
const BRAND_ORANGE = "#FEA74E";

type Feature = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
};

const features: Feature[] = [
  {
    icon: "hand-right-outline",
    label: "Prayer Wall",
    desc: "Lift each other up in unified prayer",
  },
  {
    icon: "chatbubbles-outline",
    label: "Forum",
    desc: "Discuss faith, life, and the Word",
  },
  {
    icon: "bar-chart-outline",
    label: "Polls & Surveys",
    desc: "Share your voice with the community",
  },
  {
    icon: "people-outline",
    label: "Groups",
    desc: "Find your tribe and grow together",
  },
  {
    icon: "megaphone-outline",
    label: "Announcements",
    desc: "Stay in the loop with your community",
  },
  {
    icon: "sparkles-outline",
    label: "Events",
    desc: "Meet virtually and in-person",
  },
];

export default function CommunityScreen({
  embedded = false,
}: {
  /** When true (Home keep-alive tab), hide nested BottomNav — parent owns chrome */
  embedded?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 28 }]}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>JEVAH</Text>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSub}>
            Built for believers to gather, grow, and pray together.
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.notice}>
          <View style={styles.noticeBadge}>
            <View style={styles.noticeDot} />
            <Text style={styles.noticeBadgeText}>In development</Text>
          </View>
          <Text style={styles.noticeTitle}>
            A dedicated space for fellowship is on the way
          </Text>
          <Text style={styles.noticeBody}>
            We are building Community carefully so conversation stays kind,
            focused, and rooted in scripture.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>What&apos;s coming</Text>

        <View style={styles.list}>
          {features.map((f, i) => (
            <View
              key={f.label}
              style={[
                styles.row,
                i === features.length - 1 && styles.rowLast,
              ]}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={f.icon} size={19} color={BRAND_GREEN} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowLabel}>{f.label}</Text>
                <Text style={styles.rowDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.quoteBlock}>
          <Text style={styles.quoteText}>
            As iron sharpens iron, so one person sharpens another.
          </Text>
          <Text style={styles.quoteRef}>Proverbs 27:17</Text>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {!embedded ? (
        <BottomNavOverlay
          selectedTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            navigateMainTab(tab as any);
          }}
        />
      ) : null}
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
    maxWidth: 300,
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
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND_ORANGE,
    marginRight: 7,
  },
  noticeBadgeText: {
    fontSize: 11,
    color: "#475467",
    fontFamily: "PlusJakartaSans-Bold",
    letterSpacing: 0.3,
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
    backgroundColor: "#F1F6F5",
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
    borderLeftColor: BRAND_GREEN,
    paddingLeft: 16,
    paddingVertical: 4,
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
    color: BRAND_GREEN,
    fontFamily: "PlusJakartaSans-Bold",
    letterSpacing: 0.3,
  },
});
