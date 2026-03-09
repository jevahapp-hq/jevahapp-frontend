// CommunityScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import BottomNavOverlay from "../components/layout/BottomNavOverlay";
import { navigateMainTab } from "../utils/navigation";

const BRAND_GREEN = "#256E63";
const BRAND_GREEN_LIGHT = "#2E8B7D";
const BRAND_ORANGE = "#FEA74E";

const features = [
  {
    icon: "hand-right-outline" as const,
    label: "Prayer Wall",
    desc: "Lift each other up in unified prayer",
    color: "#279CCA",
    bg: "#EBF6FC",
  },
  {
    icon: "chatbubbles-outline" as const,
    label: "Forum",
    desc: "Discuss faith, life, and the Word",
    color: "#7C3AED",
    bg: "#F4F0FF",
  },
  {
    icon: "bar-chart-outline" as const,
    label: "Polls & Surveys",
    desc: "Share your voice with the community",
    color: "#DF930E",
    bg: "#FEF3E2",
  },
  {
    icon: "people-outline" as const,
    label: "Groups",
    desc: "Find your tribe and grow together",
    color: "#16A34A",
    bg: "#ECFDF5",
  },
  {
    icon: "megaphone-outline" as const,
    label: "Announcements",
    desc: "Stay in the loop with your community",
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  {
    icon: "sparkles-outline" as const,
    label: "Events",
    desc: "Meet virtually and in-person",
    color: BRAND_ORANGE,
    bg: "#FFF8F1",
  },
];

export default function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<string>("Community");
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <View style={styles.addBtn}>
          <Ionicons name="add" size={22} color="white" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Banner ── */}
        <LinearGradient
          colors={[BRAND_GREEN, BRAND_GREEN_LIGHT, "#1A534A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Decorative rings */}
          <View style={styles.ring1} />
          <View style={styles.ring2} />

          <View style={styles.heroBadge}>
            <View style={styles.heroDot} />
            <Text style={styles.heroBadgeText}>COMING SOON</Text>
          </View>

          <View style={styles.heroIcon}>
            <Ionicons name="globe-outline" size={36} color="#FFFFFF" />
          </View>

          <Text style={styles.heroTitle}>Connect with Your Community</Text>
          <Text style={styles.heroSub}>
            A sacred space built for believers — share, grow, and pray together.
          </Text>
        </LinearGradient>

        {/* ── Features Grid ── */}
        {/* ── Redesigned What's coming section (Live-style Premium) ── */}
        <View style={styles.premiumSection}>
          {/* Ambient Background Elements */}
          <View style={styles.ambientRing} />
          <View style={styles.ambientGlow} />

          <View style={styles.sectionHeader}>
            <View style={styles.liveIndicator} />
            <Text style={styles.sectionLabelPremium}>What's coming</Text>
          </View>

          <View style={styles.grid}>
            {features.map((f) => (
              <View key={f.label} style={styles.featureCardPremium}>
                <View style={[styles.featureIconWrapPremium, { backgroundColor: "rgba(255,255,255,0.05)" }]}>
                  <Ionicons name={f.icon} size={24} color={BRAND_ORANGE} />
                </View>
                <Text style={styles.featureLabelPremium}>{f.label}</Text>
                <Text style={styles.featureDescPremium}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Tagline block ── */}
        <View style={styles.quoteBlock}>
          <Ionicons name="bookmarks-outline" size={22} color={BRAND_GREEN} style={{ marginBottom: 8 }} />
          <Text style={styles.quoteText}>
            "As iron sharpens iron, so one person sharpens another."
          </Text>
          <Text style={styles.quoteRef}>Proverbs 27:17</Text>
        </View>

        {/* bottom spacer for nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNavOverlay
        selectedTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          navigateMainTab(tab as any);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8FAFB" },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    fontFamily: "Rubik-Bold",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BRAND_ORANGE,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Scroll */
  scroll: { paddingHorizontal: 16 },

  /* Hero */
  hero: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 28,
    overflow: "hidden",
    alignItems: "center",
    position: "relative",
  },
  ring1: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 40,
    borderColor: "rgba(255,255,255,0.06)",
    top: -80,
    right: -80,
  },
  ring2: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 30,
    borderColor: "rgba(255,255,255,0.05)",
    bottom: -60,
    left: -60,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND_ORANGE,
    marginRight: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
    fontFamily: "Rubik-Bold",
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: "Rubik-Bold",
    marginBottom: 10,
    lineHeight: 30,
  },
  heroSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: "Rubik",
    maxWidth: 280,
  },

  /* Section label */
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: "Rubik-Bold",
    marginBottom: 14,
    marginLeft: 2,
  },

  /* Premium Section Container (Live Stage Style) */
  premiumSection: {
    backgroundColor: "#090E24",
    borderRadius: 32,
    padding: 24,
    marginBottom: 28,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  ambientRing: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(254, 167, 78, 0.08)",
  },
  ambientGlow: {
    position: "absolute",
    bottom: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(254, 167, 78, 0.03)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BRAND_ORANGE,
    marginRight: 10,
    shadowColor: BRAND_ORANGE,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  sectionLabelPremium: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontFamily: "Rubik-Bold",
  },

  /* Features Grid - 2 columns */
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  featureCardPremium: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    marginBottom: 4,
  },
  featureIconWrapPremium: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  featureLabelPremium: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Rubik-SemiBold",
    marginBottom: 6,
  },
  featureDescPremium: {
    fontSize: 11,
    color: "#9CA3AF",
    lineHeight: 16,
    fontFamily: "Rubik",
    opacity: 0.9,
  },

  /* Quote */
  quoteBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: BRAND_GREEN,
  },
  quoteText: {
    fontSize: 15,
    color: "#374151",
    textAlign: "center",
    lineHeight: 24,
    fontFamily: "Rubik",
    fontStyle: "italic",
    marginBottom: 8,
  },
  quoteRef: {
    fontSize: 13,
    fontWeight: "700",
    color: BRAND_GREEN,
    fontFamily: "Rubik-SemiBold",
  },
});
