/**
 * Lightweight “email sent” confirmation. Not a route.
 */
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function EmailSeenSheet() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.handle} />
      <Image
        source={require("../../../assets/images/Clip path group.png")}
        style={styles.image}
        resizeMode="contain"
      />
      <Text style={styles.title}>You've got an email</Text>
      <Text style={styles.subtitle}>
        Check your email — we sent a verification code. Enter it on the next
        screen to finish signup.
      </Text>
      <TouchableOpacity
        style={styles.cta}
        activeOpacity={0.88}
        onPress={() => router.push("/auth/codeVerification")}
      >
        <Text style={styles.ctaText}>Okay, got it</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0D5DD",
    marginBottom: 16,
  },
  image: {
    width: 96,
    height: 96,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#101828",
    fontFamily: "PlusJakartaSans-Bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#475467",
    fontFamily: "PlusJakartaSans-Regular",
    textAlign: "center",
    marginBottom: 24,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#090E24",
    paddingVertical: 16,
    borderRadius: 16,
    width: "100%",
    minHeight: 52,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "PlusJakartaSans-SemiBold",
  },
});
