import { useCallback, useEffect } from "react";
import {
  extractAuthorId,
  seedAuthorFromSession,
  clearAuthorFetchFailures,
} from "../../../../shared/author";
import type { MediaItem } from "../../../../shared/types";
import { getUserDisplayNameFromContent } from "../../../../shared/utils";
import { UserProfileCache } from "../../../../../app/utils/cache/UserProfileCache";

type ProfileLike = {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  avatarUpload?: string;
};

export function useFeedAuthorDisplay(
  user: ProfileLike | null | undefined,
  authorStoreVersion?: number
) {
  const currentUserId = user?._id || user?.id || null;

  const resolveDisplayName = useCallback(
    (item?: MediaItem | null) => {
      if (!item) return "Anonymous User";
      const name = getUserDisplayNameFromContent(item);
      if (name && !/^(anonymous(\s+user)?|unknown)$/i.test(name.trim())) {
        return name;
      }
      const authorId = extractAuthorId(item) || "";
      const isMine =
        (currentUserId && authorId && String(currentUserId) === authorId) ||
        item.moderationStatus === "under_review";
      if (isMine && user) {
        const mine = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        if (mine && !/^(anonymous(\s+user)?|unknown)$/i.test(mine)) {
          return mine;
        }
        if (user.email) return String(user.email).split("@")[0];
      }
      return name;
    },
    [currentUserId, user, authorStoreVersion]
  );

  useEffect(() => {
    if (!currentUserId || !user) return;
    const payload = {
      _id: String(currentUserId),
      id: String(currentUserId),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      avatar: (user.avatar || user.avatarUpload || "") as string,
      avatarUpload: (user.avatarUpload || user.avatar || "") as string,
      email: user.email || "",
    };
    UserProfileCache.cacheUserProfile(String(currentUserId), payload as any);
    seedAuthorFromSession(payload);
    clearAuthorFetchFailures();
  }, [currentUserId, user]);

  return { currentUserId, resolveDisplayName };
}
