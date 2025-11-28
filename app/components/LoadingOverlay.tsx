// components/LoadingOverlay.tsx
import React from "react";
import { View, ActivityIndicator, StyleSheet, Text } from "react-native";

interface LoadingOverlayProps {
  message?: string;
  progress?: number;
}

export default function LoadingOverlay({ 
  message = "Uploading...", 
  progress 
}: LoadingOverlayProps) {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator size="large" color="#000" />
      <Text style={styles.text}>{message}</Text>
      {progress !== undefined && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  progressContainer: {
    width: "60%",
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    marginTop: 16,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#000",
    borderRadius: 2,
  },
});
