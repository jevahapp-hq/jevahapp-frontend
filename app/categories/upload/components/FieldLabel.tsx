import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { getResponsiveFontSize } from "../../../../utils/responsive";

export const FIELD_HELP: Record<string, string> = {
  title:
    "A short, clear name for your post (what people see first in the feed).",
  description:
    "Optional story or context. You can also generate one with AI after you add a title, file, and cover.",
  category:
    "The topic lane this post belongs in (Worship, Youth, Teachings, etc.).",
  contentType:
    "The format of your file — Videos, GIF, Music, Books, Podcasts, or Sermons. Match the file you uploaded.",
  cover:
    "A square image that represents your post. Required for a strong first impression.",
};

export function FieldLabel({
  label,
  icon,
  helpKey,
  openHelp,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  helpKey: string;
  openHelp: (key: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
      }}
    >
      <Ionicons
        name={icon}
        size={14}
        color="#64748B"
        style={{ marginRight: 6 }}
      />
      <Text
        style={{
          fontSize: getResponsiveFontSize(11, 12, 12),
          color: "#64748B",
          fontFamily: "PlusJakartaSans-SemiBold",
          letterSpacing: 0.4,
          flex: 1,
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => openHelp(helpKey)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Help for ${label}`}
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F1F5F9",
        }}
      >
        <Ionicons name="help-circle-outline" size={14} color="#64748B" />
      </Pressable>
    </View>
  );
}
