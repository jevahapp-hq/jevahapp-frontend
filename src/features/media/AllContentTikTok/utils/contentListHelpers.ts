import { MediaItem } from "../../../../shared/types";
import { getContentKey } from "../../../../shared/utils";

/**
 * Create a unified flat array from the split content lists
 * This is used for FlatList optimization
 */
export const createUnifiedContentArray = (
  firstFour: MediaItem[],
  nextFour: MediaItem[],
  rest: MediaItem[]
): MediaItem[] => {
  return [...firstFour, ...nextFour, ...rest];
};

/**
 * Get the starting index for a section in the unified array
 */
export const getSectionStartIndex = (
  section: "firstFour" | "nextFour" | "rest",
  firstFourLength: number,
  nextFourLength: number
): number => {
  switch (section) {
    case "firstFour":
      return 0;
    case "nextFour":
      return firstFourLength;
    case "rest":
      return firstFourLength + nextFourLength;
    default:
      return 0;
  }
};

/**
 * Check if an item index belongs to a specific section
 */
export const isItemInSection = (
  index: number,
  section: "firstFour" | "nextFour" | "rest",
  firstFourLength: number,
  nextFourLength: number
): boolean => {
  const startIndex = getSectionStartIndex(section, firstFourLength, nextFourLength);
  let endIndex: number;

  switch (section) {
    case "firstFour":
      endIndex = firstFourLength;
      break;
    case "nextFour":
      endIndex = firstFourLength + nextFourLength;
      break;
    case "rest":
      endIndex = Infinity; // rest goes to the end
      break;
    default:
      return false;
  }

  return index >= startIndex && index < endIndex;
};

