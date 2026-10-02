const STORAGE_KEY = "jevah.contentVisibleNotifications.v1";

async function storage() {
  return (await import("@react-native-async-storage/async-storage")).default;
}

export async function loadRetainedContentVisible(): Promise<any[]> {
  try {
    const raw = await (await storage()).getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function retainContentVisible(notification: { _id?: string; relatedId?: string }): Promise<void> {
  const id = String(notification?._id || "").trim();
  if (!id) return;
  const current = await loadRetainedContentVisible();
  const next = [
    notification,
    ...current.filter((item) => item?._id !== id && item?.relatedId !== notification.relatedId),
  ].slice(0, 30);
  try {
    await (await storage()).setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // The in-memory notification list still shows it this session.
  }
}

export async function dropRetainedContentVisible(mediaIds: string[]): Promise<void> {
  const drop = new Set(mediaIds.map((id) => String(id || "").trim()).filter(Boolean));
  if (!drop.size) return;
  const current = await loadRetainedContentVisible();
  const next = current.filter((item) => !drop.has(String(item?.relatedId || "")));
  if (next.length === current.length) return;
  try {
    await (await storage()).setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
}
