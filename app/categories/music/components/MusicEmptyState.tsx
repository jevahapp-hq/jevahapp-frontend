import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { MusicLane } from "../MusicLaneTabs";

type MusicEmptyStateProps = {
  loading: boolean;
  error: string | null;
  musicLane: MusicLane;
  onBecomeCreator: () => void;
};

export function MusicEmptyState({
  loading,
  error,
  musicLane,
  onBecomeCreator,
}: MusicEmptyStateProps) {
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#256E63" />
        <Text
          style={{
            marginTop: 12,
            fontSize: 14,
            color: "#98A2B3",
            fontFamily: "Rubik_400Regular",
          }}
        >
          Loading songs...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        <Ionicons name="alert-circle-outline" size={48} color="#98A2B3" />
        <Text
          style={{
            marginTop: 12,
            fontSize: 16,
            color: "#98A2B3",
            fontFamily: "Rubik_400Regular",
            textAlign: "center",
          }}
        >
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
      }}
    >
      <Ionicons name="musical-notes-outline" size={48} color="#98A2B3" />
      <Text
        style={{
          marginTop: 12,
          fontSize: 16,
          color: "#98A2B3",
          fontFamily: "Rubik_400Regular",
          textAlign: "center",
        }}
      >
        No songs found
      </Text>
      {musicLane === "artists" ? (
        <TouchableOpacity onPress={onBecomeCreator} style={{ marginTop: 16 }}>
          <Text
            style={{
              color: "#0A332D",
              fontFamily: "Rubik_500Medium",
              fontSize: 14,
            }}
          >
            Are you an artist? Become a creator
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
