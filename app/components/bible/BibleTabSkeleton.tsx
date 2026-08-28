import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, View } from "react-native";
import Skeleton from "../../../src/shared/components/Skeleton/Skeleton";

/**
 * Loading placeholder for the Bible tab.
 *
 * Mirrors the geometry of BibleOnboarding (logo circle, verse card, primary
 * action, three feature columns) so the real screen swaps in without any
 * shift in layout.
 */
export default function BibleTabSkeleton() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#F0FDF4", "#ECFDF5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      />

      <View style={styles.content}>
        {/* Logo + app name + tagline */}
        <View style={styles.logoSection}>
          <Skeleton width={120} height={120} borderRadius={60} />
          <Skeleton
            width={168}
            height={26}
            borderRadius={8}
            style={styles.appName}
          />
          <Skeleton width={220} height={15} borderRadius={7} />
        </View>

        {/* "Today's Verse" header */}
        <View style={styles.verseSection}>
          <View style={styles.verseHeader}>
            <Skeleton width={24} height={24} borderRadius={6} />
            <Skeleton
              width={124}
              height={17}
              borderRadius={8}
              style={styles.verseHeaderText}
            />
          </View>

          {/* Verse card */}
          <View style={styles.verseCard}>
            <Skeleton height={16} borderRadius={8} style={styles.verseLine} />
            <Skeleton height={16} borderRadius={8} style={styles.verseLine} />
            <Skeleton
              width="72%"
              height={16}
              borderRadius={8}
              style={styles.verseLineLast}
            />
            <View style={styles.verseReference}>
              <Skeleton width={132} height={15} borderRadius={7} />
              <Skeleton
                width={56}
                height={13}
                borderRadius={6}
                style={styles.translation}
              />
            </View>
          </View>

          <Skeleton
            width={196}
            height={13}
            borderRadius={6}
            style={styles.date}
          />
        </View>

        {/* Open Bible button */}
        <View style={styles.actionSection}>
          <Skeleton height={56} borderRadius={12} />
        </View>

        {/* Feature row */}
        <View style={styles.featuresSection}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.featureItem}>
              <Skeleton width={20} height={20} borderRadius={5} />
              <Skeleton
                width={72}
                height={11}
                borderRadius={5}
                style={styles.featureText}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  appName: {
    marginTop: 12,
    marginBottom: 6,
  },
  verseSection: {
    flex: 0,
    justifyContent: "center",
  },
  verseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  verseHeaderText: {
    marginLeft: 8,
  },
  verseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#256E63",
  },
  verseLine: {
    marginBottom: 10,
  },
  verseLineLast: {
    alignSelf: "center",
    marginBottom: 18,
  },
  verseReference: {
    alignItems: "center",
  },
  translation: {
    marginTop: 6,
  },
  date: {
    alignSelf: "center",
  },
  actionSection: {
    marginTop: 0,
    marginBottom: 20,
  },
  featuresSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  featureItem: {
    alignItems: "center",
    flex: 1,
  },
  featureText: {
    marginTop: 6,
  },
});
