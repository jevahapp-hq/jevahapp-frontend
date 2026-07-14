import type {
  EligibilityStatus,
  MediaFile,
  ModerationError,
  UploadState,
} from "../../types";

export type UploadFlowDeps = {
  file: MediaFile | null;
  thumbnail: MediaFile | null;
  title: string;
  description: string;
  selectedCategory: string;
  selectedType: string;
  isSermonContent: boolean;
  setLoading: (v: boolean) => void;
  setUploadState: (
    v: UploadState | ((prev: UploadState) => UploadState)
  ) => void;
  setModerationError: (v: ModerationError | null) => void;
  setEligibilityStatus: (v: EligibilityStatus | null) => void;
  validateMediaEligibilityLocal: () => EligibilityStatus;
  resetForm: () => void;
};

export type UploadProgressController = {
  startSimulated: () => void;
  stopSimulated: () => void;
  connectSocket: (uploadId: string) => Promise<void>;
  cleanupSocket: () => void;
};
