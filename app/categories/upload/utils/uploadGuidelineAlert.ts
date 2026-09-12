import { Alert } from "react-native";
import { getLiteMaxVideoUploadBytes } from "../../../../src/shared/lite/liteProfile";
import { getMaxFileSizeBytes } from "../constants";
import type { FileInfo } from "./fileTypeDetection";
import { formatUploadGuidelineMessage } from "./eligibilityRules";
import { buildFileGuidelineErrors } from "./uploadFileInspect";

export const UPLOAD_GUIDELINE_TITLE = "Doesn't meet upload guidelines";

/** File guideline errors plus this device's upload size cap (64MB on lite). */
export function collectDeviceGuidelineErrors(
  file: FileInfo | null,
  selectedType: string
): string[] {
  if (!file) return [];
  const maxBytes = getLiteMaxVideoUploadBytes(
    getMaxFileSizeBytes(selectedType || "videos")
  );
  return buildFileGuidelineErrors(file, selectedType, maxBytes);
}

/** Returns true when an alert was shown. */
export function alertUploadGuidelineIssues(errors: string[]): boolean {
  if (!errors.length) return false;
  Alert.alert(UPLOAD_GUIDELINE_TITLE, formatUploadGuidelineMessage(errors), [
    { text: "OK" },
  ]);
  return true;
}
