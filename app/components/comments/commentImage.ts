import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { CommentImageAttachment } from "./types";

const MAX_EDGE = 1080;
const QUALITY = 0.82;

/**
 * Pick a comment image (free crop, IG-style) and resize for upload.
 */
export async function pickCommentImage(): Promise<CommentImageAttachment | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Photo library permission is required");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 1,
    exif: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const manipulated = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: MAX_EDGE } }],
    {
      compress: QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );

  return {
    uri: manipulated.uri,
    type: "image/jpeg",
    name: `comment-${Date.now()}.jpg`,
  };
}

export function buildCommentImageFormData(args: {
  content: string;
  parentCommentId?: string | null;
  mentions?: { userId: string; displayName: string }[];
  image: CommentImageAttachment;
}): FormData {
  const form = new FormData();
  form.append("content", args.content);
  if (args.parentCommentId) {
    form.append("parentCommentId", args.parentCommentId);
  } else {
    form.append("parentCommentId", "");
  }
  if (args.mentions?.length) {
    form.append("mentions", JSON.stringify(args.mentions));
  }
  form.append("image", {
    uri: args.image.uri,
    type: args.image.type || "image/jpeg",
    name: args.image.name || "comment.jpg",
  } as any);
  return form;
}
