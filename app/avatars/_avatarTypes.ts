import type { ReactNode } from "react";
import type { ImageSourcePropType } from "react-native";

export type AvatarEntry = {
  id: string;
  src: ImageSourcePropType | string;
};

export type RenderAvatarRowProps = {
  renderAvatarRow: (avatars: AvatarEntry[]) => ReactNode;
  uploadedImage?: string | null;
  setUploadedImage?: (uri: string) => void;
  onUseUploadedImage?: () => void;
};
