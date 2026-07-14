import { useEffect, useState } from "react";
import { Forum } from "../../../utils/communityAPI";

type UseForumSelectionArgs = {
  discussions: Forum[];
  selectCategory: (categoryId: string) => void;
};

export function useForumSelection({
  discussions,
  selectCategory,
}: UseForumSelectionArgs) {
  const [selectedForumId, setSelectedForumId] = useState<string | null>(null);
  const [pendingForumId, setPendingForumId] = useState<string | null>(null);

  useEffect(() => {
    if (!discussions || discussions.length === 0) {
      if (!pendingForumId) {
        setSelectedForumId(null);
      }
      return;
    }

    // If we have a pending forum ID (from creating a new forum), try to select it
    if (pendingForumId) {
      const matchingDiscussion = discussions.find(
        (discussion) => discussion._id === pendingForumId
      );
      if (matchingDiscussion) {
        setSelectedForumId(pendingForumId);
        setPendingForumId(null);
        return;
      }
      // If not found yet, wait a bit more (discussions might still be loading)
      // The optimistic update should have added it, but server refresh might be pending
      return;
    }

    // If no pending forum, select the first one if none is selected
    if (
      !selectedForumId ||
      !discussions.some((discussion) => discussion._id === selectedForumId)
    ) {
      setSelectedForumId(discussions[0]._id);
    }
  }, [discussions, selectedForumId, pendingForumId]);

  const handleCategorySelect = (categoryId: string) => {
    if (!categoryId) return;
    selectCategory(categoryId);
    setSelectedForumId(null);
    setPendingForumId(null);
  };

  return {
    selectedForumId,
    setSelectedForumId,
    pendingForumId,
    setPendingForumId,
    handleCategorySelect,
  };
}
