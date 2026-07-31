/**
 * Banner / CTA driven by capabilities.nextStep — single switch, not scattered status checks.
 */
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import type { CreatorMe, CreatorNextStep } from "../../services/creators/types";

type Props = {
  me: CreatorMe;
  loading?: boolean;
  onPress: () => void;
  compact?: boolean;
};

function titleFor(step: CreatorNextStep): string {
  switch (step) {
    case "apply":
      return "Become a creator";
    case "wait_review":
      return "Application under review";
    case "upload_first_track":
      return "Creator studio";
    case "manage_catalog":
      return "Creator studio";
    case "contact_support":
      return "Creator account";
    default:
      return "Creator hub";
  }
}

function iconFor(step: CreatorNextStep): keyof typeof Ionicons.glyphMap {
  switch (step) {
    case "wait_review":
      return "time-outline";
    case "contact_support":
      return "alert-circle-outline";
    case "upload_first_track":
    case "manage_catalog":
      return "musical-notes-outline";
    default:
      return "mic-outline";
  }
}

export function CreatorStatusBanner({ me, loading, onPress, compact }: Props) {
  const step = me.capabilities.nextStep;
  const message = me.capabilities.statusMessage;

  if (loading && !me.artist) {
    return (
      <View
        className="mx-0 mt-4 mb-2 rounded-2xl bg-gray-100 px-4 py-3 flex-row items-center"
        style={{ minHeight: compact ? 52 : 64 }}
      >
        <ActivityIndicator color="#0A332D" />
        <Text className="ml-3 text-gray-500 text-sm">Checking creator status…</Text>
      </View>
    );
  }

  const tint =
    step === "wait_review"
      ? { bg: "#FFF8E7", border: "#F5C542", text: "#8A6A00" }
      : step === "contact_support"
        ? { bg: "#FEF2F2", border: "#FECACA", text: "#B91C1C" }
        : { bg: "#F0F7F5", border: "#C5DDD6", text: "#0A332D" };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="mt-4 mb-2 rounded-2xl px-4 py-3.5 flex-row items-center"
      style={{
        backgroundColor: tint.bg,
        borderWidth: 1,
        borderColor: tint.border,
      }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: "#fff" }}
      >
        <Ionicons name={iconFor(step)} size={22} color={tint.text} />
      </View>
      <View className="flex-1 pr-2">
        <Text className="font-semibold text-base" style={{ color: tint.text }}>
          {titleFor(step)}
        </Text>
        {!compact ? (
          <Text className="text-sm mt-0.5" style={{ color: "#5C5D63" }} numberOfLines={2}>
            {message}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#8A8B91" />
    </TouchableOpacity>
  );
}
