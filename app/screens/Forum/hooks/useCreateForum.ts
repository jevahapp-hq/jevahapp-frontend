import { useState } from "react";
import { Alert } from "react-native";
import { Forum } from "../../../utils/communityAPI";

type CreateForumFn = (data: {
  categoryId: string;
  title: string;
  description: string;
}) => Promise<Forum | null | undefined>;

type UseCreateForumArgs = {
  categories: Forum[];
  selectedCategoryId: string | null;
  discussions: Forum[];
  createForum: CreateForumFn;
  selectCategory: (categoryId: string) => void;
  setSelectedForumId: (id: string | null) => void;
  setPendingForumId: (id: string | null) => void;
};

export function useCreateForum({
  categories,
  selectedCategoryId,
  discussions,
  createForum,
  selectCategory,
  setSelectedForumId,
  setPendingForumId,
}: UseCreateForumArgs) {
  const [showCreateForumModal, setShowCreateForumModal] = useState(false);
  const [forumTitle, setForumTitle] = useState("");
  const [forumDescription, setForumDescription] = useState("");
  const [selectedCategoryForCreation, setSelectedCategoryForCreation] =
    useState<string | null>(null);
  const [isCreatingForum, setIsCreatingForum] = useState(false);

  const resetCreateForumForm = () => {
    setForumTitle("");
    setForumDescription("");
    setSelectedCategoryForCreation(null);
  };

  const closeCreateForumModal = () => {
    setShowCreateForumModal(false);
    resetCreateForumForm();
  };

  const openCreateForumModal = () => {
    if (categories.length === 0) {
      Alert.alert(
        "No Categories Available",
        "Forum categories are not available yet. Please contact an administrator."
      );
      return;
    }

    const defaultCategoryId =
      selectedCategoryId &&
      categories.some((category) => category._id === selectedCategoryId)
        ? selectedCategoryId
        : categories[0]._id;

    setSelectedCategoryForCreation(defaultCategoryId);
    setShowCreateForumModal(true);
  };

  const handleCreateForum = async () => {
    if (!forumTitle.trim() || forumTitle.trim().length < 3) {
      Alert.alert(
        "Validation Error",
        "Forum title must be at least 3 characters"
      );
      return;
    }

    if (forumTitle.trim().length > 100) {
      Alert.alert(
        "Validation Error",
        "Forum title must be less than 100 characters"
      );
      return;
    }

    if (!forumDescription.trim() || forumDescription.trim().length < 10) {
      Alert.alert(
        "Validation Error",
        "Forum description must be at least 10 characters"
      );
      return;
    }

    if (forumDescription.trim().length > 500) {
      Alert.alert(
        "Validation Error",
        "Forum description must be less than 500 characters"
      );
      return;
    }

    if (!selectedCategoryForCreation) {
      Alert.alert("Validation Error", "Please select a forum category.");
      return;
    }

    setIsCreatingForum(true);

    try {
      const result = await createForum({
        categoryId: selectedCategoryForCreation,
        title: forumTitle.trim(),
        description: forumDescription.trim(),
      });

      if (result) {
        resetCreateForumForm();
        setShowCreateForumModal(false);

        const targetCategoryId =
          result.categoryId || selectedCategoryForCreation;

        // Ensure we're viewing the correct category
        if (!selectedCategoryId || selectedCategoryId !== targetCategoryId) {
          selectCategory(targetCategoryId);
          setPendingForumId(result._id);
        } else {
          setPendingForumId(result._id);
          if (discussions.some((d) => d._id === result._id)) {
            setSelectedForumId(result._id);
            setPendingForumId(null);
          }
        }

        Alert.alert("Success", "Forum created successfully!");
      } else {
        Alert.alert("Error", "Failed to create forum. Please try again.");
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to create forum. Please try again."
      );
    } finally {
      setIsCreatingForum(false);
    }
  };

  return {
    showCreateForumModal,
    forumTitle,
    setForumTitle,
    forumDescription,
    setForumDescription,
    selectedCategoryForCreation,
    setSelectedCategoryForCreation,
    isCreatingForum,
    openCreateForumModal,
    closeCreateForumModal,
    handleCreateForum,
  };
}
