/**
 * Category / content-type selection chips (icons + aligned padding)
 */

import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import {
  getResponsiveFontSize,
  getResponsiveSpacing,
  getTouchTargetSize,
} from "../../../../utils/responsive";

type IoniconName = keyof typeof Ionicons.glyphMap;

const CATEGORY_ICONS: Record<string, IoniconName> = {
  Worship: "musical-notes-outline",
  Inspiration: "sunny-outline",
  Youth: "people-outline",
  Teachings: "book-outline",
  Marriage: "heart-outline",
  Counselling: "chatbubbles-outline",
};

const CONTENT_TYPE_ICONS: Record<string, IoniconName> = {
  music: "musical-note-outline",
  videos: "videocam-outline",
  books: "library-outline",
  ebook: "document-text-outline",
  podcasts: "mic-outline",
  sermon: "radio-outline",
};

function resolveIcon(label: string, value: string): IoniconName {
  return (
    CONTENT_TYPE_ICONS[value] ||
    CATEGORY_ICONS[label] ||
    CATEGORY_ICONS[value] ||
    "ellipse-outline"
  );
}

type CategoryTypeTagsProps = {
  label: string;
  value: string;
  selected: string;
  onSelect: (value: string) => void;
  onSermonsChange?: (isSermon: boolean) => void;
  onAfterSelect?: (value: string) => void;
};

export function CategoryTypeTag({
  label,
  value,
  selected,
  onSelect,
  onSermonsChange,
  onAfterSelect,
}: CategoryTypeTagsProps) {
  const isSelected = value === selected;
  const tagPaddingHorizontal = getResponsiveSpacing(12, 14, 16);
  const tagPaddingVertical = getResponsiveSpacing(8, 9, 10);
  const tagFontSize = getResponsiveFontSize(12, 13, 14);
  const iconSize = getResponsiveFontSize(14, 15, 16);
  const touchTargetSize = getTouchTargetSize();
  const gap = getResponsiveSpacing(6, 7, 8);
  const icon = resolveIcon(label, value);

  return (
    <TouchableOpacity
      onPress={() => {
        onSelect(value);
        if (label === "Sermons" || value === "sermon") {
          onSermonsChange?.(true);
        } else {
          onSermonsChange?.(false);
        }
        onAfterSelect?.(value);
      }}
      activeOpacity={0.85}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: tagPaddingHorizontal,
        paddingVertical: tagPaddingVertical,
        minHeight: Math.max(touchTargetSize - 8, 40),
        marginRight: getResponsiveSpacing(8, 8, 10),
        marginBottom: getResponsiveSpacing(8, 8, 10),
        borderRadius: 999,
        borderWidth: 1,
        borderColor: isSelected ? "#0F172A" : "#E2E8F0",
        backgroundColor: isSelected ? "#0F172A" : "#FFFFFF",
      }}
    >
      <Ionicons
        name={icon}
        size={iconSize}
        color={isSelected ? "#FFFFFF" : "#64748B"}
        style={{ marginRight: gap }}
      />
      <Text
        style={{
          fontSize: tagFontSize,
          fontFamily: "PlusJakartaSans-Medium",
          color: isSelected ? "#FFFFFF" : "#0F172A",
          lineHeight: tagFontSize + 4,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

type CategoryTypeTagsListProps = {
  items: Array<{ label: string; value: string }>;
  selected: string;
  onSelect: (value: string) => void;
  onSermonsChange?: (isSermon: boolean) => void;
  onAfterSelect?: (value: string) => void;
};

export function CategoryTypeTags({
  items,
  selected,
  onSelect,
  onSermonsChange,
  onAfterSelect,
}: CategoryTypeTagsListProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {items.map((item) => (
        <CategoryTypeTag
          key={item.value}
          label={item.label}
          value={item.value}
          selected={selected}
          onSelect={onSelect}
          onSermonsChange={onSermonsChange}
          onAfterSelect={onAfterSelect}
        />
      ))}
    </View>
  );
}
