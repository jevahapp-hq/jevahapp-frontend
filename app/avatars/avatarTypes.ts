import type { ReactNode } from "react";
import type { ImageSourcePropType } from "react-native";

export type AvatarEntry = {
  id: string;
  src: ImageSourcePropType;
};

export type RenderAvatarRowProps = {
  renderAvatarRow: (avatars: AvatarEntry[]) => ReactNode;
};
