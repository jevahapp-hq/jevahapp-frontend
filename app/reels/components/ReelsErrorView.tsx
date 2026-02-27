import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface ReelsErrorViewProps {
  errorMessage: string;
  onRetry: () => void;
  onGoBack: () => void;
}

export function ReelsErrorView({ errorMessage, onRetry, onGoBack }: ReelsErrorViewProps) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
      }}
    >
      <Text style={{ color: "#fff", fontSize: 18, marginBottom: 20 }}>
        Something went wrong
      </Text>
      <Text style={{ color: "#ccc", fontSize: 14, marginBottom: 30 }}>
        {errorMessage}
      </Text>
      <TouchableOpacity
        onPress={onRetry}
        style={{
          backgroundColor: "#FEA74E",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>Try Again</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onGoBack}
        style={{
          backgroundColor: "transparent",
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
          marginTop: 10,
          borderWidth: 1,
          borderColor: "#FEA74E",
        }}
      >
        <Text style={{ color: "#FEA74E", fontSize: 16 }}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}
