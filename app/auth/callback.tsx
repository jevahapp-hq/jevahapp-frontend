import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

export default function AuthCallbackScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/Profile/profileSetUp");
    }
  }, [isLoaded, isSignedIn]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
      <ActivityIndicator size="large" color="#090E24" />
      <Text style={{ marginTop: 16, color: "#090E24", fontSize: 18, fontWeight: "600" }}>
        Signing you in...
      </Text>
    </View>
  );
} 