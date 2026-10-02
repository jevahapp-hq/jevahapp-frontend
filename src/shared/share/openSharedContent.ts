import { getMediaById } from "../../core/api/media/feeds";
import { useReelsStore } from "@/store/useReelsStore";

type RouterLike = {
  replace: (href: { pathname: string; params: Record<string, string> }) => void;
};

function launchItem(mediaId: string) {
  return {
    _id: mediaId,
    title: "Untitled",
    speaker: "",
    timeAgo: "",
    views: 0,
    sheared: 0,
    saved: 0,
    favorite: 0,
    fileUrl: "",
    imageUrl: "",
    speakerAvatar: "",
    contentType: "videos",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Open the post a shared link points at.
 */
export async function openSharedContent(
  mediaId: string,
  router: RouterLike
): Promise<boolean> {
  const id = decodeURIComponent(String(mediaId || "").trim());
  if (!id) return false;

  let item = launchItem(id);
  const loaded = await getMediaById(id).catch(() => null);
  const media = loaded?.success ? loaded.data : null;
  const record = media?.media || media?.item || media;
  if (record && typeof record === "object") {
    item = {
      ...item,
      ...record,
      _id: String(record._id || record.id || id),
    };
  }

  useReelsStore.getState().setVideoList([item]);
  useReelsStore.getState().setCurrentIndex(0);
  router.replace({
    pathname: "/reels/Reelsviewscroll",
    params: {
      title: String(item.title || "Untitled"),
      currentIndex: "0",
      source: "shared-link",
      category: String(item.contentType || "videos"),
      mediaId: item._id,
    },
  });
  return true;
}
