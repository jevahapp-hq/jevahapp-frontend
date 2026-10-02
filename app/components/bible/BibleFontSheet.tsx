import { Ionicons } from "@expo/vector-icons";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  BIBLE_FONT_CHOICES,
  bibleFontFamily,
  useBibleReadingStyle,
} from "../../utils/bibleReadingStyle";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function BibleFontSheet({ visible, onClose }: Props) {
  const reading = useBibleReadingStyle();

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
          accessibilityLabel="Close text settings"
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Text</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={styles.close}
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color="#1F2937" />
            </Pressable>
          </View>

          <View style={styles.sizeRow}>
            <Pressable
              onPress={reading.smaller}
              disabled={!reading.canSmaller}
              style={[styles.sizeButton, !reading.canSmaller && styles.disabled]}
              accessibilityLabel="Smaller text"
            >
              <Text style={styles.sizeSmall}>A</Text>
            </Pressable>
            <View style={styles.sizeTrack} />
            <Pressable
              onPress={reading.larger}
              disabled={!reading.canLarger}
              style={[styles.sizeButton, !reading.canLarger && styles.disabled]}
              accessibilityLabel="Larger text"
            >
              <Text style={styles.sizeLarge}>A</Text>
            </Pressable>
          </View>

          <View style={styles.fontRow}>
            {BIBLE_FONT_CHOICES.map((choice) => {
              const selected = reading.fontId === choice.id;
              return (
                <Pressable
                  key={choice.id}
                  onPress={() => reading.setFont(choice.id)}
                  style={[styles.fontCard, selected && styles.fontCardSelected]}
                  accessibilityLabel={choice.name}
                >
                  <Text
                    style={[
                      styles.sample,
                      { fontFamily: bibleFontFamily(choice.id) },
                    ]}
                  >
                    Ag
                  </Text>
                  <Text style={styles.fontName}>{choice.name}</Text>
                </Pressable>
              );
            })}
          </View>
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
    marginBottom: 16,
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
  sizeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  sizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: {
    opacity: 0.35,
  },
  sizeSmall: {
    fontSize: 16,
    color: "#1F2937",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  sizeLarge: {
    fontSize: 26,
    color: "#1F2937",
    fontFamily: "PlusJakartaSans_600SemiBold",
  },
  sizeTrack: {
    flex: 1,
    height: 2,
    backgroundColor: "#E5E7EB",
    borderRadius: 1,
  },
  fontRow: {
    flexDirection: "row",
    gap: 10,
  },
  fontCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  fontCardSelected: {
    borderColor: "#256E63",
    backgroundColor: "#F0FDF4",
  },
  sample: {
    fontSize: 28,
    color: "#1F2937",
    marginBottom: 4,
  },
  fontName: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#4B5563",
  },
});
