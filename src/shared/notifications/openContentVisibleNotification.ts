import { getMediaById } from "../../core/api/media/feeds";
import { useReelsStore } from "@/store/useReelsStore";
import {
  contentVisibleLaunchItem,
  isContentVisibleNotification,
} from "./contentVisibleNotification";

type RouterLike = {
  push: (href: { pathname: string; params: Record<string, string> }) => void;
};

/**
 * Open the approved post. Marks are handled by the notification screen.
 */
export async function openContentVisibleNotification(
  notification: any,
  router: RouterLike
): Promise<boolean> {
  if (!isContentVisibleNotification(notification)) return false;
  const item = contentVisibleLaunchItem(notification);
  if (!item) return false;

  useReelsStore.getState().setVideoList([item]);
  useReelsStore.getState().setCurrentIndex(0);
  router.push({
    pathname: "/reels/Reelsviewscroll",
    params: {
      title: item.title,
      currentIndex: "0",
      source: "content-visible",
      category: String(item.contentType || "videos"),
      mediaId: item._id,
    },
  });

  const loaded = await getMediaById(item._id).catch(() => null);
  const media = loaded?.success ? loaded.data : null;
  const record = media?.media || media?.item || media;
  if (record && typeof record === "object") {
    useReelsStore.getState().setVideoList([
      {
        ...item,
        ...record,
        _id: String(record._id || record.id || item._id),
      },
    ]);
  }
  return true;
}
