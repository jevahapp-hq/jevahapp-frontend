/**
 * VideoComponent Types
 * Extracted from VideoComponent.tsx for better modularity
 */

import { ImageSourcePropType } from "react-native";

export interface VideoCardData {
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
  fileUrl: string;
  imageUrl: ImageSourcePropType;
  title: string;
  subTitle: string;
  views: number;
  onPress?: () => void;
  isHot?: boolean;
  isRising?: boolean;
  trendingScore?: number;
}

