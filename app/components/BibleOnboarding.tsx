import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useDailyVerse } from "../hooks/useDailyVerse";

interface BibleOnboardingProps {
  onEnterBible: () => void;
}

const { width, height } = Dimensions.get("window");

export default function BibleOnboarding({
  onEnterBible,
}: BibleOnboardingProps) {
  const { currentVerse, loading, fadeAnim, loadTodaysVerse, fadeToNewVerse } =
    useDailyVerse();
  const [slideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient Effect */}
      <View style={styles.backgroundGradient} />

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/Jevah.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>Jevah Bible</Text>
          <Text style={styles.tagline}>Your Daily Spiritual Companion</Text>
        </View>

        {/* Daily Verse Section */}
        <View style={styles.verseSection}>
          <View style={styles.verseHeader}>
            <Ionicons name="book-outline" size={24} color="#256E63" />
            <Text style={styles.verseHeaderText}>Today's Verse</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#256E63" />
              <Text style={styles.loadingText}>Loading today's verse...</Text>
            </View>
          ) : currentVerse ? (
            <Animated.View
              style={[styles.verseContainer, { opacity: fadeAnim }]}
            >
              <View style={styles.verseCard}>
                <Text style={styles.verseText}>"{currentVerse.text}"</Text>
                <View style={styles.verseReference}>
                  <Text style={styles.verseReferenceText}>
                    {currentVerse.book} {currentVerse.chapter}:
                    {currentVerse.verse}
                  </Text>
                  <Text style={styles.translationText}>
                    {currentVerse.translation}
                  </Text>
                </View>
              </View>
              <Text style={styles.dateText}>
                {formatDate(currentVerse.date)}
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorText}>Unable to load today's verse</Text>
              <TouchableOpacity
                onPress={loadTodaysVerse}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.primaryButton} onPress={onEnterBible}>
            <Ionicons name="book" size={24} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Open Bible</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={fadeToNewVerse}
          >
            <Ionicons name="refresh" size={20} color="#256E63" />
            <Text style={styles.secondaryButtonText}>New Verse</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <View style={styles.featureItem}>
            <Ionicons name="search" size={20} color="#256E63" />
            <Text style={styles.featureText}>Search Scriptures</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="bookmark" size={20} color="#256E63" />
            <Text style={styles.featureText}>Save Favorites</Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="share" size={20} color="#256E63" />
            <Text style={styles.featureText}>Share Verses</Text>
          </View>
        </View>
      </Animated.View>
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
    backgroundColor: "linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)",
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
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 20,
    overflow: "hidden", // Ensure logo stays within circle
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50, // Make logo circular
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  verseSection: {
    flex: 1,
    justifyContent: "center",
  },
  verseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  verseHeaderText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#256E63",
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  verseContainer: {
    alignItems: "center",
  },
  verseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#256E63",
  },
  verseText: {
    fontSize: 18,
    lineHeight: 28,
    color: "#1F2937",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 16,
  },
  verseReference: {
    alignItems: "center",
  },
  verseReferenceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#256E63",
    marginBottom: 4,
  },
  translationText: {
    fontSize: 14,
    color: "#6B7280",
  },
  dateText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  retryButtonText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "500",
  },
  actionSection: {
    marginBottom: 40,
  },
  primaryButton: {
    backgroundColor: "#256E63",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#256E63",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#256E63",
    marginLeft: 6,
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
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
});
