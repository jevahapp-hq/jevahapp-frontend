import AsyncStorage from "@react-native-async-storage/async-storage";
import { extractUploaderId as extractItemUploaderId } from "../../../src/shared/media/moderationVisibility";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

function isObjectId(value: string): boolean {
  return OBJECT_ID_PATTERN.test(value);
}

async function readStoredUser(): Promise<any | null> {
  const userStr = await AsyncStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch (e) {
    console.warn(
      "⚠️ isMediaOwner: Failed to parse user from AsyncStorage",
      e
    );
    return null;
  }
}

function idFromStoredUser(user: any): string {
  if (!user) return "";
  return String(
    user._id ||
      user.id ||
      user.userId ||
      user.userID || // defensive for alternate casing
      (user.profile && (user.profile._id || user.profile.id)) ||
      ""
  ).trim();
}

function idFromJwt(token: string): string {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return "";
    const payload = JSON.parse(atob(parts[1]));
    const id = payload.userId || payload.user_id || payload.id;
    if (!id) return "";
    const extracted = String(id).trim();
    console.log("✅ Extracted user ID from JWT token:", extracted);
    return extracted;
  } catch (tokenError) {
    console.warn("⚠️ Failed to extract user ID from token:", tokenError);
    return "";
  }
}

/**
 * Pull the uploader's id out of the many shapes the backend uses, in priority
 * order: populated `uploadedBy` object, the `uploadedBy` argument, a bare
 * ObjectId string, then `author` / `authorInfo` for devotionals and others.
 *
 * Returns `"assume-owner"` when the value is a display name rather than an id —
 * ownership can't be decided client-side, and the backend verifies anyway.
 */
function extractUploaderId(
  uploadedBy: string | { _id: string } | undefined,
  mediaItem?: any
): string | "assume-owner" {
  const fromItem = extractItemUploaderId(mediaItem);
  if (fromItem) return fromItem;

  if (
    uploadedBy &&
    typeof uploadedBy === "object" &&
    ((uploadedBy as any)._id || (uploadedBy as any).id)
  ) {
    const u = uploadedBy as any;
    return String(u._id || u.id || u.userId || "").trim();
  }

  if (typeof uploadedBy === "string") {
    const trimmed = uploadedBy.trim();
    if (isObjectId(trimmed)) return trimmed;
    console.log(
      "⚠️ isMediaOwner: uploadedBy appears to be a name, not an ID:",
      trimmed
    );
    return "assume-owner";
  }

  return "";
}

/**
 * Best-effort client-side ownership check used to decide whether to show the
 * delete affordance. When it can't be determined we return true and let the
 * backend reject the request.
 */
export const isMediaOwner = async (
  uploadedBy: string | { _id: string } | undefined,
  mediaItem?: any
): Promise<boolean> => {
  try {
    const user = await readStoredUser();
    let currentUserId = idFromStoredUser(user);

    if (!currentUserId) {
      const { getAuthToken } = await import("@/src/core/auth/tokenStore");
      const token = await getAuthToken();

      if (!token) {
        console.log("❌ isMediaOwner: No current user ID or auth token found");
        return false;
      }

      currentUserId = idFromJwt(token);

      if (!currentUserId) {
        console.log(
          "⚠️ isMediaOwner: No explicit user ID found — hide delete until ownership is proven."
        );
        return false;
      }
    }

    if (
      !uploadedBy &&
      !mediaItem?.authorInfo?._id &&
      !mediaItem?.author?._id &&
      !mediaItem?.uploadedBy &&
      !mediaItem?.userId &&
      !mediaItem?.createdBy &&
      !mediaItem?.ownerId &&
      !mediaItem?.owner
    ) {
      console.log("❌ isMediaOwner: No uploadedBy or author info provided");
      return false;
    }

    const uploadedById = extractUploaderId(uploadedBy, mediaItem);
    if (uploadedById === "assume-owner") return false;

    if (!uploadedById) {
      console.log("❌ isMediaOwner: Could not extract uploadedBy ID", {
        uploadedBy,
      });
      return false;
    }

    const isOwner = currentUserId === uploadedById;
    console.log("🔍 isMediaOwner check:", {
      currentUserId,
      uploadedById,
      isOwner,
    });
    return isOwner;
  } catch (error) {
    console.error("❌ Error checking media ownership:", error);
    return false;
  }
};

/** True when the stored user has the admin role. */
export const isAdmin = async (): Promise<boolean> => {
  try {
    const user = await readStoredUser();
    if (!user) return false;
    const role = user?.role || user?.userRole;
    return String(role).toLowerCase() === "admin";
  } catch (error) {
    console.error("❌ Error checking admin status:", error);
    return false;
  }
};
