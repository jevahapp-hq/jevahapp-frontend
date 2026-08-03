/**
 * Title, description, AI generate, categories, content types, eligibility
 */

import { useCallback, useState } from "react";
import { View } from "react-native";
import type {
  DetectedFileType,
  EligibilityStatus,
  MediaFile,
} from "../types";
import { AiDescriptionBlock } from "./AiDescriptionBlock";
import { CategoryTypeSection } from "./CategoryTypeSection";
import { FIELD_HELP, FieldLabel } from "./FieldLabel";
import { TitleDescriptionFields } from "./TitleDescriptionFields";

export { FIELD_HELP, FieldLabel };

type UploadFormFieldsProps = {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  file: MediaFile | null;
  thumbnail: MediaFile | null;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedType: string;
  setSelectedType: (v: string) => void;
  setIsSermonContent: (v: boolean) => void;
  detectedFileType: DetectedFileType;
  eligibilityStatus: EligibilityStatus | null;
  setEligibilityStatus: (v: EligibilityStatus | null) => void;
  validateMediaEligibilityLocal: (overrides?: {
    file?: MediaFile | null;
    title?: string;
    selectedCategory?: string;
    selectedType?: string;
  }) => EligibilityStatus;
  isGeneratingDescription: boolean;
  descriptionGenerationError: string | null;
  bibleVerses: string[];
  onGenerateAIDescription: () => void;
};

export function UploadFormFields({
  title,
  setTitle,
  description,
  setDescription,
  file,
  thumbnail,
  selectedCategory,
  setSelectedCategory,
  selectedType,
  setSelectedType,
  setIsSermonContent,
  detectedFileType,
  eligibilityStatus,
  setEligibilityStatus,
  validateMediaEligibilityLocal,
  isGeneratingDescription,
  descriptionGenerationError,
  bibleVerses,
  onGenerateAIDescription,
}: UploadFormFieldsProps) {
  const [helpKey, setHelpKey] = useState<string | null>(null);

  const applyValidation = useCallback(
    (overrides?: {
      file?: MediaFile | null;
      title?: string;
      selectedCategory?: string;
      selectedType?: string;
    }) => {
      const validation = validateMediaEligibilityLocal(overrides);
      setEligibilityStatus(validation);
    },
    [validateMediaEligibilityLocal, setEligibilityStatus]
  );

  const openHelp = (key: string) => {
    setHelpKey((prev) => (prev === key ? null : key));
  };

  return (
    <View className="flex-1">
      <TitleDescriptionFields
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        helpKey={helpKey}
        openHelp={openHelp}
        onTitleChange={(text) => {
          setTitle(text);
          applyValidation({ title: text });
        }}
      />

      <AiDescriptionBlock
        title={title}
        hasFile={!!file}
        hasThumbnail={!!thumbnail}
        isGeneratingDescription={isGeneratingDescription}
        descriptionGenerationError={descriptionGenerationError}
        bibleVerses={bibleVerses}
        onGenerateAIDescription={onGenerateAIDescription}
      />

      <CategoryTypeSection
        file={file}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        setIsSermonContent={setIsSermonContent}
        detectedFileType={detectedFileType}
        eligibilityStatus={eligibilityStatus}
        helpKey={helpKey}
        openHelp={openHelp}
        applyValidation={applyValidation}
      />
    </View>
  );
}
