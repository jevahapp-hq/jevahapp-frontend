import { useEffect, useState } from "react";
import { isForumPostOwner } from "../../../hooks/useForums";
import { ForumPost as ForumPostType } from "../../../utils/communityAPI";

export function useForumOwnership(posts: ForumPostType[]) {
  const [selectedPostOwners, setSelectedPostOwners] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const checkOwnership = async () => {
      const ownershipMap: Record<string, boolean> = {};
      for (const post of posts) {
        ownershipMap[post._id] = await isForumPostOwner(post);
      }
      setSelectedPostOwners(ownershipMap);
    };
    if (posts.length > 0) {
      checkOwnership();
    }
  }, [posts]);

  return selectedPostOwners;
}
