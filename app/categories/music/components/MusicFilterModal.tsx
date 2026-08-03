import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

type MusicFilterModalProps = {
  visible: boolean;
  categories: string[];
  selectedCategory: string | null;
  onClose: () => void;
  onSelectCategory: (category: string | null) => void;
};

export function MusicFilterModal({
  visible,
  categories,
  selectedCategory,
  onClose,
  onSelectCategory,
}: MusicFilterModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 16,
            paddingBottom: 32,
            maxHeight: "70%",
          }}
        >
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: "#E5E7EB",
              alignSelf: "center",
              marginBottom: 16,
            }}
          />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: "#1D2939",
              fontFamily: "Rubik_700Bold",
              paddingHorizontal: 20,
              marginBottom: 16,
            }}
          >
            Filter by Category
          </Text>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            <TouchableOpacity
              onPress={() => {
                onSelectCategory(null);
                onClose();
              }}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: selectedCategory === null ? "#256E63" : "#1D2939",
                  fontFamily:
                    selectedCategory === null
                      ? "Rubik_600SemiBold"
                      : "Rubik_400Regular",
                }}
              >
                All Categories
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                onPress={() => {
                  onSelectCategory(category);
                  onClose();
                }}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E5E7EB",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color:
                      selectedCategory === category ? "#256E63" : "#1D2939",
                    fontFamily:
                      selectedCategory === category
                        ? "Rubik_600SemiBold"
                        : "Rubik_400Regular",
                  }}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
