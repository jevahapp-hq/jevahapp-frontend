import { Text, View } from "react-native";
import { getResponsiveFontSize } from "../../../../utils/responsive";
import { categories, contentTypes } from "../constants";
import type {
  DetectedFileType,
  EligibilityStatus,
  MediaFile,
} from "../types";
import { CategoryTypeTags } from "./CategoryTypeTags";
import { EligibilityBanner } from "./EligibilityBanner";
import { FIELD_HELP, FieldLabel } from "./FieldLabel";
import { FieldHelpTip } from "./FieldHelpTip";

type CategoryTypeSectionProps = {
  file: MediaFile | null;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedType: string;
  setSelectedType: (v: string) => void;
  setIsSermonContent: (v: boolean) => void;
  detectedFileType: DetectedFileType;
  eligibilityStatus: EligibilityStatus | null;
  helpKey: string | null;
  openHelp: (key: string) => void;
  applyValidation: (overrides?: {
    file?: MediaFile | null;
    title?: string;
    selectedCategory?: string;
    selectedType?: string;
  }) => void;
};

export function CategoryTypeSection({
  file,
  selectedCategory,
  setSelectedCategory,
  selectedType,
  setSelectedType,
  setIsSermonContent,
  detectedFileType,
  eligibilityStatus,
  helpKey,
  openHelp,
  applyValidation,
}: CategoryTypeSectionProps) {
  return (
    <>
      <FieldLabel
        label="CATEGORY"
        icon="grid-outline"
        helpKey="category"
        openHelp={openHelp}
      />
      <FieldHelpTip
        visible={helpKey === "category"}
        text={FIELD_HELP.category}
      />
      <View className="mb-4">
        <CategoryTypeTags
          items={categories.map((item) => ({ label: item, value: item }))}
          selected={selectedCategory}
          onSelect={(value) => {
            setSelectedCategory(value);
            applyValidation({ selectedCategory: value });
          }}
        />
      </View>

      <FieldLabel
        label="CONTENT TYPE"
        icon="layers-outline"
        helpKey="contentType"
        openHelp={openHelp}
      />
      <FieldHelpTip
        visible={helpKey === "contentType"}
        text={FIELD_HELP.contentType}
      />
      {file && (
        <Text
          style={{
            fontSize: getResponsiveFontSize(10, 11, 12),
            color: "#64748B",
            fontFamily: "PlusJakartaSans-Regular",
            marginBottom: 8,
          }}
        >
          {detectedFileType === "video" &&
            "Detected: Video — pick Videos or Sermons"}
          {detectedFileType === "audio" &&
            "Detected: Audio — pick Music, Podcasts, or Sermons"}
          {detectedFileType === "ebook" &&
            "Detected: Document — pick Books or Ebook"}
          {detectedFileType === "unknown" &&
            "File type unclear — choose the matching content type"}
        </Text>
      )}
      <View className="mb-4">
        <CategoryTypeTags
          items={contentTypes}
          selected={selectedType}
          onSelect={(value) => {
            setSelectedType(value);
            setIsSermonContent(value === "sermon");
            applyValidation({ selectedType: value });
          }}
          onSermonsChange={setIsSermonContent}
        />
      </View>

      {eligibilityStatus && (
        <EligibilityBanner eligibilityStatus={eligibilityStatus} />
      )}
    </>
  );
}
