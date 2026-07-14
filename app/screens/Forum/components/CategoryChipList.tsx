import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { Forum } from "../../../utils/communityAPI";
import { styles } from "../styles";

type CategoryChipListProps = {
  categories: Forum[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string) => void;
};

export function CategoryChipList({
  categories,
  selectedCategoryId,
  onSelect,
}: CategoryChipListProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.categorySelectorContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.categorySelectorContent}
        renderItem={({ item }) => {
          const isActive = selectedCategoryId === item._id;
          return (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                isActive && styles.categoryChipActive,
              ]}
              onPress={() => onSelect(item._id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  isActive && styles.categoryChipTextActive,
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}
