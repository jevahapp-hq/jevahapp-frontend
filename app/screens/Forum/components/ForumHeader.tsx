import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles";

type ForumHeaderProps = {
  onBack: () => void;
};

export function ForumHeader({ onBack }: ForumHeaderProps) {
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#000" />
      </TouchableOpacity>

      <Text style={styles.headerTitle}>Forum</Text>

      <TouchableOpacity style={styles.filterButton}>
        <Ionicons name="options-outline" size={24} color="#000" />
      </TouchableOpacity>
    </View>
  );
}
