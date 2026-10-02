import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { READING_VOICES } from "../utils/readingVoices";

type VoiceChoice = {
  id: string;
  name: string;
  description: string;
};

type Props = {
  selectedId: string;
  onSelect: (id: string) => void;
  voices?: readonly VoiceChoice[];
};

export default function ReadingVoicePicker({
  selectedId,
  onSelect,
  voices = READING_VOICES,
}: Props) {
  return (
    <View style={styles.row}>
      {voices.map((voice) => {
        const selected = voice.id === selectedId;
        return (
          <TouchableOpacity
            key={voice.id}
            style={[styles.pill, selected && styles.pillSelected]}
            onPress={() => onSelect(voice.id)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${voice.name}, ${voice.description} voice`}
          >
            <Text style={[styles.name, selected && styles.nameSelected]}>
              {voice.name}
            </Text>
            <Text style={[styles.description, selected && styles.descriptionSelected]}>
              {voice.description}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: "stretch",
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  pill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillSelected: {
    backgroundColor: "#256E63",
    borderColor: "#256E63",
  },
  name: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans-SemiBold",
    color: "#1F2937",
  },
  nameSelected: {
    color: "#FFFFFF",
  },
  description: {
    marginTop: 1,
    fontSize: 11,
    fontFamily: "PlusJakartaSans-Regular",
    color: "#6B7280",
  },
  descriptionSelected: {
    color: "rgba(255,255,255,0.85)",
  },
});
