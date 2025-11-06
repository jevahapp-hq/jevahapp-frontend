// Create Poll Form Component
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CreatePollFormProps {
  onSuccess?: (poll: any) => void;
  onCancel?: () => void;
  initialPoll?: any; // For editing
}

export const CreatePollForm: React.FC<CreatePollFormProps> = ({
  onSuccess,
  onCancel,
  initialPoll,
}) => {
  const isEditing = !!initialPoll;
  const [question, setQuestion] = useState(initialPoll?.question || initialPoll?.title || "");
  const [options, setOptions] = useState<string[]>(
    initialPoll?.options?.map((opt: any) => opt.text || opt) || ["", ""]
  );
  const [multiSelect, setMultiSelect] = useState(initialPoll?.multiSelect || false);
  const [description, setDescription] = useState(initialPoll?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    // Validation
    if (!question.trim() || question.length < 5) {
      Alert.alert("Validation Error", "Question must be at least 5 characters");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim().length > 0);
    if (validOptions.length < 2) {
      Alert.alert("Validation Error", "Please provide at least 2 options");
      return;
    }

    if (validOptions.length > 10) {
      Alert.alert("Validation Error", "Maximum 10 options allowed");
      return;
    }

    setIsSubmitting(true);

    try {
      // Call parent's onSuccess callback with the poll data
      // Parent component will handle the actual API call
      if (onSuccess) {
        onSuccess({
          question: question.trim(),
          options: validOptions.map((opt) => opt.trim()),
          multiSelect,
          description: description.trim() || undefined,
        });
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create poll");
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.label}>Question *</Text>
      <TextInput
        style={styles.input}
        value={question}
        onChangeText={setQuestion}
        placeholder="Enter your poll question..."
        multiline
        maxLength={200}
        editable={!isSubmitting}
      />
      <Text style={styles.helperText}>{question.length}/200 characters</Text>

      <Text style={styles.label}>Options * (Minimum 2, Maximum 10)</Text>
      {options.map((option, index) => (
        <View key={index} style={styles.optionRow}>
          <TextInput
            style={styles.optionInput}
            value={option}
            onChangeText={(value) => updateOption(index, value)}
            placeholder={`Option ${index + 1}`}
            maxLength={200}
            editable={!isSubmitting}
          />
          {options.length > 2 && (
            <TouchableOpacity
              onPress={() => removeOption(index)}
              style={styles.removeButton}
              disabled={isSubmitting}
            >
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      ))}
      {options.length < 10 && (
        <TouchableOpacity
          onPress={addOption}
          style={styles.addButton}
          disabled={isSubmitting}
        >
          <Ionicons name="add-circle-outline" size={20} color="#256E63" />
          <Text style={styles.addText}>Add Option</Text>
        </TouchableOpacity>
      )}

      <View style={styles.switchRow}>
        <View style={styles.switchLabelContainer}>
          <Text style={styles.switchLabel}>Allow Multiple Selections</Text>
          <Text style={styles.switchDescription}>
            Users can select multiple options
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setMultiSelect(!multiSelect)}
          style={[styles.switch, multiSelect && styles.switchActive]}
          disabled={isSubmitting}
        >
          <View
            style={[
              styles.switchThumb,
              multiSelect && styles.switchThumbActive,
            ]}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Description (Optional)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder="Add more context about your poll..."
        multiline
        maxLength={500}
        editable={!isSubmitting}
      />
      <Text style={styles.helperText}>{description.length}/500 characters</Text>

      <View style={styles.buttonRow}>
        {onCancel && (
          <TouchableOpacity
            onPress={onCancel}
            style={[styles.button, styles.cancelButton]}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.button, styles.submitButton]}
          disabled={isSubmitting || !question.trim()}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {isEditing ? "Update Poll" : "Create Poll"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 16,
    color: "#1F2937",
    fontFamily: "Rubik-SemiBold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    fontFamily: "Rubik-Regular",
    color: "#111827",
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    fontFamily: "Rubik-Regular",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    fontFamily: "Rubik-Regular",
    color: "#111827",
  },
  removeButton: {
    marginLeft: 8,
    padding: 4,
  },
  addButton: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#E8F8F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addText: {
    color: "#256E63",
    fontWeight: "600",
    fontSize: 14,
    fontFamily: "Rubik-SemiBold",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  switchLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    fontFamily: "Rubik-SemiBold",
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: "#6B7280",
    fontFamily: "Rubik-Regular",
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D1D5DB",
    padding: 2,
    justifyContent: "center",
  },
  switchActive: {
    backgroundColor: "#256E63",
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    transform: [{ translateX: 0 }],
  },
  switchThumbActive: {
    transform: [{ translateX: 22 }],
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Rubik-SemiBold",
  },
  submitButton: {
    backgroundColor: "#256E63",
  },
  submitText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
    fontFamily: "Rubik-SemiBold",
  },
});

