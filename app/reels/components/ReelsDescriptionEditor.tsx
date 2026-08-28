/**
 * Bottom sheet for editing a reel's description. Keyboard-aware so the field
 * and the Save button stay visible on small screens.
 */
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DESCRIPTION_MAX_LENGTH } from "../../utils/mediaEdit/updateMediaDescription";

type Props = {
  visible: boolean;
  initialValue: string;
  isSaving: boolean;
  error?: string | null;
  onCancel: () => void;
  onSubmit: (next: string) => void;
};

export const ReelsDescriptionEditor: React.FC<Props> = ({
  visible,
  initialValue,
  isSaving,
  error,
  onCancel,
  onSubmit,
}) => {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);

  // Re-seed each time the sheet opens so a cancelled edit doesn't persist.
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const remaining = DESCRIPTION_MAX_LENGTH - value.length;
  const dirty = value.trim() !== (initialValue || "").trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropFill} onPress={onCancel} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          >
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onCancel}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Ionicons name="close" size={22} color="#667085" />
              </TouchableOpacity>
              <Text style={styles.title}>Edit description</Text>
              <TouchableOpacity
                onPress={() => onSubmit(value)}
                disabled={isSaving || !dirty || remaining < 0}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Save description"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#1D2939" />
                ) : (
                  <Text
                    style={[
                      styles.save,
                      (!dirty || remaining < 0) && styles.saveDisabled,
                    ]}
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TextInput
              value={value}
              onChangeText={setValue}
              multiline
              autoFocus
              maxLength={DESCRIPTION_MAX_LENGTH}
              placeholder="Tell viewers about this video…"
              placeholderTextColor="#98A2B3"
              style={styles.input}
              editable={!isSaving}
              textAlignVertical="top"
            />

            <View style={styles.footer}>
              {error ? (
                <Text style={styles.error}>{error}</Text>
              ) : (
                <Text style={styles.counter}>{remaining} characters left</Text>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(16, 24, 40, 0.55)",
  },
  backdropFill: { flex: 1 },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 16,
    color: "#1D2939",
  },
  save: {
    fontFamily: "PlusJakartaSans-Bold",
    fontSize: 15,
    color: "#256E63",
  },
  saveDisabled: { color: "#98A2B3" },
  input: {
    minHeight: 120,
    maxHeight: 220,
    borderWidth: 1,
    borderColor: "#EAECF0",
    borderRadius: 12,
    padding: 14,
    fontFamily: "PlusJakartaSans",
    fontSize: 14,
    lineHeight: 20,
    color: "#1D2939",
    backgroundColor: "#F9FAFB",
  },
  footer: { marginTop: 10, minHeight: 18 },
  counter: {
    fontFamily: "PlusJakartaSans",
    fontSize: 12,
    color: "#98A2B3",
  },
  error: {
    fontFamily: "PlusJakartaSans-Medium",
    fontSize: 12,
    color: "#D92D20",
  },
});
