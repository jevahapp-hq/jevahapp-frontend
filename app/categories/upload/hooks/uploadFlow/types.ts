import type {
  EligibilityStatus,
  MediaFile,
  ModerationError,
  UploadResultState,
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
  setUploadResult: (v: UploadResultState | null) => void;
  setEligibilityStatus: (v: EligibilityStatus | null) => void;
  validateMediaEligibilityLocal: (overrides?: {
    file?: MediaFile | null;
    title?: string;
    selectedCategory?: string;
    selectedType?: string;
  }) => EligibilityStatus;
  resetForm: () => void;
  /** Soft UX notice (toast) instead of Alert for missing fields */
  onSoftNotice?: (text: string) => void;
};

export type UploadProgressController = {
  startSimulated: () => void;
  stopSimulated: () => void;
  connectSocket: (uploadId: string) => Promise<void>;
  cleanupSocket: () => void;
};
