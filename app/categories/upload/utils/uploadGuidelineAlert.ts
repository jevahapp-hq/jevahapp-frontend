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

let guidelineAlertOpen = false;

/** True while an upload alert is on screen. Navigating then crashes iOS. */
export function isUploadGuidelineAlertOpen(): boolean {
  return guidelineAlertOpen;
}

function closeGuidelineAlert() {
  guidelineAlertOpen = false;
}

/** One alert at a time. A second Alert.alert while one is up crashes iOS. */
export function presentUploadAlert(title: string, message: string): boolean {
  if (guidelineAlertOpen) return false;
  guidelineAlertOpen = true;
  Alert.alert(title, message, [{ text: "OK", onPress: closeGuidelineAlert }], {
    onDismiss: closeGuidelineAlert,
  });
  return true;
}

/** Returns true when an alert was shown. */
export function alertUploadGuidelineIssues(errors: string[]): boolean {
  if (!errors.length) return false;
  return presentUploadAlert(
    UPLOAD_GUIDELINE_TITLE,
    formatUploadGuidelineMessage(errors)
  );
}
