import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  canDownloadPack,
  formatPackSize,
  type BibleTranslation,
} from "../../services/bibleTranslations";

interface BibleTranslationPickerProps {
  visible: boolean;
  selectedId: string;
  translations: BibleTranslation[];
  installedIds: string[];
  downloadingId: string | null;
  onSelect: (id: string) => void;
  onDownload: (translation: BibleTranslation) => void;
  onClose: () => void;
}

function metaLine(t: BibleTranslation, installed: boolean): string {
  if (t.license === "licensed") return "Online only";
  if (installed) return "On this device";
  if (t.offline && canDownloadPack(t)) {
    const size = formatPackSize(t.packBytes);
    return size ? `Download ${size}` : "Download for offline";
  }
  return "";
}

export default function BibleTranslationPicker({
  visible,
  selectedId,
  translations,
  installedIds,
  downloadingId,
  onSelect,
  onDownload,
  onClose,
}: BibleTranslationPickerProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Translation</Text>
          <Text style={styles.subtitle}>
            Same chapter stays open when you switch. Download only when the
            catalog marks a version offline.
          </Text>
          <ScrollView
            style={styles.list}
            keyboardShouldPersistTaps="handled"
          >
            {translations.map((t) => {
              const selected = t.id === selectedId;
              const installed = installedIds.includes(t.id);
              const showDownload =
                !installed && t.offline && canDownloadPack(t);
              const busy = downloadingId === t.id;
              const meta = metaLine(t, installed);
              return (
                <View
                  key={t.id}
                  style={[styles.row, selected && styles.rowSelected]}
                >
                  <TouchableOpacity
                    style={styles.rowText}
                    onPress={() => onSelect(t.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.abbr}>{t.abbreviation}</Text>
                    <Text style={styles.name}>{t.name}</Text>
                    {meta && !showDownload ? (
                      <Text style={styles.meta}>{meta}</Text>
                    ) : null}
                  </TouchableOpacity>
                  {showDownload ? (
                    <TouchableOpacity
                      style={styles.downloadBtn}
                      onPress={() => onDownload(t)}
                      disabled={busy}
                      accessibilityLabel={`Download ${t.abbreviation} pack`}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color="#256E63" />
                      ) : (
                        <>
                          <Ionicons
                            name="cloud-download-outline"
                            size={16}
                            color="#256E63"
                          />
                          <Text style={styles.downloadText}>
                            {formatPackSize(t.packBytes) || "Download"}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : selected ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#256E63"
                    />
                  ) : installed ? (
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={22}
                      color="#256E63"
                    />
                  ) : (
                    <Ionicons
                      name="ellipse-outline"
                      size={22}
                      color="#D1D5DB"
                    />
                  )}
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 8,
    maxHeight: "72%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 12,
  },
  list: {
    maxHeight: 360,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  rowSelected: {
    backgroundColor: "#F0FDF4",
  },
  rowText: {
    flex: 1,
    marginRight: 8,
  },
  abbr: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#256E63",
  },
  name: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#1F2937",
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#6B7280",
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 72,
    justifyContent: "center",
    gap: 4,
  },
  downloadText: {
    fontSize: 12,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#256E63",
  },
  closeBtn: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 12,
  },
  closeText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#256E63",
  },
});
