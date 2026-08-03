export type DisplayMode = "list" | "grid" | "small" | "large";

export interface DiscoverCard {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  color: string;
}
