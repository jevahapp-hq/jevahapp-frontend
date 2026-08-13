import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { clearBackendSession } from "../utils/sessionAuth";

export default function TempLogout() {
  const { signOut, isLoaded } = useAuth();
  const router = useRouter();
  const hasLoggedOut = useRef(false);

  useEffect(() => {
    const logout = async () => {
      if (!isLoaded || hasLoggedOut.current) return;
      hasLoggedOut.current = true;

      try {
        await clearBackendSession();
      } catch {
        // continue
      }

      try {
        await signOut();
      } catch {
        // Clerk may already be signed out (email/password users)
      }

      router.replace("/");
    };

    void logout();
  }, [isLoaded, signOut, router]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>You've been logged out.</Text>
      <ActivityIndicator
        size="large"
        color="#666"
        style={{ marginVertical: 20 }}
      />
      <Button title="Go to Login" onPress={() => router.replace("/")} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  heading: {
    fontSize: 20,
    fontWeight: "600",
    color: "#090E24",
  },
});
