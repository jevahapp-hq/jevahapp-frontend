/**
 * Category / content-type selection chips
 */

import { Text, TouchableOpacity } from "react-native";
import {
  getResponsiveFontSize,
  getResponsiveSpacing,
  getTouchTargetSize,
} from "../../../../utils/responsive";

type CategoryTypeTagsProps = {
  label: string;
  value: string;
  selected: string;
  onSelect: (value: string) => void;
  onSermonsChange?: (isSermon: boolean) => void;
  onAfterSelect?: () => void;
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
  const tagPaddingHorizontal = getResponsiveSpacing(10, 14, 18);
  const tagPaddingVertical = getResponsiveSpacing(6, 8, 10);
  const tagFontSize = getResponsiveFontSize(12, 14, 16);
  const touchTargetSize = getTouchTargetSize();

  return (
    <TouchableOpacity
      key={value}
      onPress={() => {
        onSelect(value);
        if (label === "Sermons") {
          onSermonsChange?.(true);
        } else {
          onSermonsChange?.(false);
        }
        onAfterSelect?.();
      }}
      className={`rounded-full mr-2 mb-2 border ${
        isSelected ? "bg-black border-black" : "bg-white border-gray-300"
      }`}
      style={{
        paddingHorizontal: tagPaddingHorizontal,
        paddingVertical: tagPaddingVertical,
        minHeight: touchTargetSize,
      }}
      activeOpacity={0.8}
    >
      <Text
        className={isSelected ? "text-white" : "text-black"}
        style={{ fontSize: tagFontSize }}
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
  onAfterSelect?: () => void;
};

export function CategoryTypeTags({
  items,
  selected,
  onSelect,
  onSermonsChange,
  onAfterSelect,
}: CategoryTypeTagsListProps) {
  return (
    <>
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
    </>
  );
}
