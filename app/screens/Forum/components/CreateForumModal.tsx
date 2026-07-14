import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Forum } from "../../../utils/communityAPI";
import { styles } from "../styles";

type CreateForumModalProps = {
  visible: boolean;
  categories: Forum[];
  categoriesLoading: boolean;
  forumTitle: string;
  forumDescription: string;
  selectedCategoryForCreation: string | null;
  isCreatingForum: boolean;
  onChangeTitle: (text: string) => void;
  onChangeDescription: (text: string) => void;
  onSelectCategory: (categoryId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function CreateForumModal({
  visible,
  categories,
  categoriesLoading,
  forumTitle,
  forumDescription,
  selectedCategoryForCreation,
  isCreatingForum,
  onChangeTitle,
  onChangeDescription,
  onSelectCategory,
  onClose,
  onSubmit,
}: CreateForumModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.createForumModal}>
        <View style={styles.createForumModalContent}>
          <View style={styles.createForumModalHeader}>
            <Text style={styles.createForumModalTitle}>Create Forum</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              disabled={isCreatingForum}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.createForumScroll}
            contentContainerStyle={styles.createForumScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.createForumForm}>
              <Text style={styles.createForumLabel}>Forum Title *</Text>
              <TextInput
                style={styles.createForumInput}
                value={forumTitle}
                onChangeText={onChangeTitle}
                placeholder="Enter forum title (3-100 characters)"
                maxLength={100}
                editable={!isCreatingForum}
              />
              <Text style={styles.createForumHelperText}>
                {forumTitle.length}/100 characters
              </Text>

              <Text style={styles.createForumLabel}>Description *</Text>
              <TextInput
                style={[styles.createForumInput, styles.createForumTextArea]}
                value={forumDescription}
                onChangeText={onChangeDescription}
                placeholder="Enter forum description (10-500 characters)"
                multiline
                maxLength={500}
                editable={!isCreatingForum}
              />
              <Text style={styles.createForumHelperText}>
                {forumDescription.length}/500 characters
              </Text>

              <Text style={styles.createForumLabel}>Category *</Text>
              {categoriesLoading ? (
                <View style={styles.createForumCategoryLoading}>
                  <ActivityIndicator size="small" color="#256E63" />
                  <Text style={styles.createForumCategoryLoadingText}>
                    Loading categories...
                  </Text>
                </View>
              ) : categories.length === 0 ? (
                <Text style={styles.createForumHelperText}>
                  No categories available. Please contact an administrator.
                </Text>
              ) : (
                <View style={styles.createForumCategoryList}>
                  {categories.map((category) => {
                    const isActive =
                      selectedCategoryForCreation === category._id;
                    return (
                      <TouchableOpacity
                        key={category._id}
                        style={[
                          styles.createForumCategoryChip,
                          isActive && styles.createForumCategoryChipActive,
                        ]}
                        onPress={() => onSelectCategory(category._id)}
                        activeOpacity={0.8}
                        disabled={isCreatingForum}
                      >
                        <Text
                          style={[
                            styles.createForumCategoryChipText,
                            isActive &&
                              styles.createForumCategoryChipTextActive,
                          ]}
                        >
                          {category.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.createForumModalActions}>
            <TouchableOpacity
              style={styles.cancelForumButton}
              onPress={onClose}
              disabled={isCreatingForum}
            >
              <Text style={styles.cancelForumButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitForumButton,
                (!forumTitle.trim() ||
                  !forumDescription.trim() ||
                  !selectedCategoryForCreation ||
                  isCreatingForum) &&
                  styles.submitForumButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={
                !forumTitle.trim() ||
                !forumDescription.trim() ||
                !selectedCategoryForCreation ||
                isCreatingForum
              }
            >
              {isCreatingForum ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitForumButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
