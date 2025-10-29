import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface BibleSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function BibleSettingsModal({
  visible,
  onClose,
}: BibleSettingsModalProps) {
  const [multiLang, setMultiLang] = useState(false);
  const [allowSharing, setAllowSharing] = useState(true);
  const [allowAudio, setAllowAudio] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);

  if (!visible) return null;

  const SettingRow = ({
    iconName,
    title,
    value,
    onValueChange,
  }: {
    iconName: any;
    title: string;
    value: boolean;
    onValueChange: (v: boolean) => void;
  }) => (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIconContainer}>
          <Ionicons name={iconName} size={18} color="#256E63" />
        </View>
        <View>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{value ? "On" : "Off"}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D1D5DB", true: "#256E63" }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerIconButton}>
              <Ionicons name="arrow-back" size={22} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bible Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.headerIconButton}>
              <Ionicons name="close" size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {/* Rows */}
          <SettingRow
            iconName="language-outline"
            title="Access Bible In Multiple languages"
            value={multiLang}
            onValueChange={setMultiLang}
          />
          <SettingRow
            iconName="settings-outline"
            title="Allow Sharing"
            value={allowSharing}
            onValueChange={setAllowSharing}
          />
          <SettingRow
            iconName="settings-outline"
            title="Allow Audio"
            value={allowAudio}
            onValueChange={setAllowAudio}
          />
          <SettingRow
            iconName="accessibility-outline"
            title="Save History"
            value={saveHistory}
            onValueChange={setSaveHistory}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 16,
    color: "#1F2937",
    fontFamily: "Rubik_600SemiBold",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 8,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 14,
    color: "#1F2937",
    fontFamily: "Rubik_600SemiBold",
  },
  rowSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    fontFamily: "Rubik_400Regular",
  },
});
