import { Ionicons } from "@expo/vector-icons";
import { TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../styles";

type PostComposerProps = {
  forumTitle?: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
};

export function PostComposer({
  forumTitle,
  value,
  onChangeText,
  onSubmit,
}: PostComposerProps) {
  return (
    <View style={styles.startConversationContainer}>
      <View style={styles.plusButton}>
        <Ionicons name="chatbubbles-outline" size={20} color="#666" />
      </View>

      <TextInput
        style={styles.conversationInput}
        placeholder={`Start a conversation in ${forumTitle || "this forum"}...`}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        multiline
        maxLength={5000}
      />

      {value.trim().length > 0 && (
        <TouchableOpacity
          style={styles.sendButton}
          onPress={onSubmit}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={20} color="#256E63" />
        </TouchableOpacity>
      )}
    </View>
  );
}
