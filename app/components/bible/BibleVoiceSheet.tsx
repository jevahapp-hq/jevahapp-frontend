import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export type BibleVoiceChoice = {
  id: string;
  name: string;
  description: string;
};

type Props = {
  visible: boolean;
  voices: readonly BibleVoiceChoice[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export default function BibleVoiceSheet({
  visible,
  voices,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close voice list"
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Voice</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.close}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="#1F2937" />
            </Pressable>
          </View>
          {voices.map((voice) => {
            const selected = voice.id === selectedId;
            return (
              <Pressable
                key={voice.id}
                onPress={() => onSelect(voice.id)}
                style={[styles.row, selected && styles.rowSelected]}
                accessibilityLabel={voice.name}
                accessibilityState={{ selected }}
              >
                <View style={styles.rowText}>
                  <Text style={[styles.name, selected && styles.nameSelected]}>
                    {voice.name}
                  </Text>
                  <Text style={styles.description}>{voice.description}</Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color="#256E63" />
                ) : (
                  <Ionicons name="ellipse-outline" size={22} color="#D1D5DB" />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 8,
    zIndex: 2,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#1F2937",
  },
  close: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rowSelected: {
    borderColor: "#256E63",
    backgroundColor: "#F0FDF4",
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#1F2937",
  },
  nameSelected: {
    color: "#256E63",
  },
  description: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#6B7280",
  },
});
