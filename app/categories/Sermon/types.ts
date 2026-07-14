import { ImageSourcePropType } from "react-native";

export interface SermonCardData {
  fileUrl: string;
  title: string;
  speaker: string;
  uploadedBy?: string;
  timeAgo: string;
  speakerAvatar: any;
  favorite: number;
  views: number;
  saved: number;
  sheared: number;
  comment: number;
  imageUrl?: any;
  onPress?: () => void;
  createdAt?: string;
}

export interface RecommendedItem {
  key?: string;
  fileUrl: string;
  imageUrl: ImageSourcePropType | any;
  title: string;
  subTitle: string;
  views: number;
  onPress?: () => void;
  isHot?: boolean;
  isRising?: boolean;
  trendingScore?: number;
}

export type PlayType = "progress" | "center";
