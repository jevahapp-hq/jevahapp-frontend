/**
 * Upload screen orchestrator — wires hooks + presentational pieces
 */

import { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getButtonSize,
  getKeyboardAdjustment,
  getResponsiveFontSize,
  getResponsiveSpacing,
  getScreenDimensions,
  getTouchTargetSize,
} from "../../../utils/responsive";
import AuthHeader from "../../components/AuthHeader";
import TopToast from "../../components/TopToast";
import { useMediaStore } from "../../store/useUploadStore";
import { AiVerificationPlate } from "./components/AiVerificationPlate";
import { MediaPickers } from "./components/MediaPickers";
import { ModerationErrorInline } from "./components/ModerationErrorModal";
import { UploadFormFields } from "./components/UploadFormFields";
import { UploadLimitsPlate } from "./components/UploadLimitsPlate";
import { UploadProgressModal } from "./components/UploadProgressModal";
import { UploadResultModal } from "./components/UploadResultModal";
import { useAIDescription } from "./hooks/useAIDescription";
import { useMediaPickers } from "./hooks/useMediaPickers";
import { useUploadFlow } from "./hooks/useUploadFlow";
import { useUploadFormState } from "./hooks/useUploadFormState";

export default function UploadScreen() {
  const form = useUploadFormState();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{
    visible: boolean;
    text: string;
    type: "success" | "error" | "info";
  }>({ visible: false, text: "", type: "info" });

  const showSoftNotice = useCallback((text: string) => {
    setToast({ visible: true, text, type: "info" });
  }, []);

  const { pickMedia, pickThumbnail } = useMediaPickers({
    title: form.title,
    selectedCategory: form.selectedCategory,
    selectedType: form.selectedType,
    setFile: form.setFile,
    setDetectedFileType: form.setDetectedFileType,
    setThumbnail: form.setThumbnail,
    setSelectedType: form.setSelectedType,
    setIsSermonContent: form.setIsSermonContent,
    setEligibilityStatus: form.setEligibilityStatus,
    validateMediaEligibilityLocal: form.validateMediaEligibilityLocal,
  });

  const {
    isGeneratingDescription,
    descriptionGenerationError,
    bibleVerses,
    generateAIDescription,
  } = useAIDescription({
    title: form.title,
    selectedType: form.selectedType,
    selectedCategory: form.selectedCategory,
    file: form.file,
    thumbnail: form.thumbnail,
    setDescription: form.setDescription,
  });

  const { handleUpload, confirmSuccessNavigate, cancelSuccessNavigate } =
    useUploadFlow({
      file: form.file,
      thumbnail: form.thumbnail,
      title: form.title,
      description: form.description,
      selectedCategory: form.selectedCategory,
      selectedType: form.selectedType,
      isSermonContent: form.isSermonContent,
      setLoading: form.setLoading,
      setUploadState: form.setUploadState,
      setModerationError: form.setModerationError,
      setUploadResult: form.setUploadResult,
      setEligibilityStatus: form.setEligibilityStatus,
      validateMediaEligibilityLocal: form.validateMediaEligibilityLocal,
      resetForm: form.resetForm,
      onSoftNotice: showSoftNotice,
    });

  const result = form.uploadResult;
  const isSuccess = result?.kind === "success";

  return (
    <>
      <UploadProgressModal
        visible={form.loading}
        uploadState={form.uploadState}
      />

      <KeyboardAvoidingView
        {...getKeyboardAdjustment()}
        className="flex-1 bg-white"
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
              paddingTop: getResponsiveSpacing(16, 20, 24, 32),
            }}
          >
            <AuthHeader title="New Upload" />
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingBottom: getResponsiveSpacing(20, 30, 40),
              minHeight: getScreenDimensions().height - 100,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                paddingHorizontal: getResponsiveSpacing(16, 20, 24, 32),
                paddingTop: getResponsiveSpacing(8, 10, 12, 16),
              }}
            >
              <View className="mt-2 mb-6">
                <MediaPickers
                  file={form.file}
                  thumbnail={form.thumbnail}
                  orientation={form.orientation}
                  onPickMedia={pickMedia}
                  onPickThumbnail={pickThumbnail}
                />
              </View>

              <UploadLimitsPlate selectedType={form.selectedType} />

              <UploadFormFields
                title={form.title}
                setTitle={form.setTitle}
                description={form.description}
                setDescription={form.setDescription}
                file={form.file}
                thumbnail={form.thumbnail}
                selectedCategory={form.selectedCategory}
                setSelectedCategory={form.setSelectedCategory}
                selectedType={form.selectedType}
                setSelectedType={form.setSelectedType}
                setIsSermonContent={form.setIsSermonContent}
                detectedFileType={form.detectedFileType}
                eligibilityStatus={form.eligibilityStatus}
                setEligibilityStatus={form.setEligibilityStatus}
                validateMediaEligibilityLocal={
                  form.validateMediaEligibilityLocal
                }
                isGeneratingDescription={isGeneratingDescription}
                descriptionGenerationError={descriptionGenerationError}
                bibleVerses={bibleVerses}
                onGenerateAIDescription={generateAIDescription}
              />

              {form.moderationError && !result ? (
                <ModerationErrorInline
                  moderationError={form.moderationError}
                  setModerationError={form.setModerationError}
                  setUploadState={form.setUploadState}
                />
              ) : null}

              <View className="items-center mt-6">
                <AiVerificationPlate />

                <TouchableOpacity
                  onPress={async () => {
                    const stopAudio = useMediaStore.getState().stopAudioFn;
                    if (stopAudio) await stopAudio();
                    handleUpload();
                  }}
                  className="bg-black justify-center rounded-full items-center"
                  style={{
                    width: Math.min(
                      getScreenDimensions().width -
                        getResponsiveSpacing(16, 20, 24, 32) * 2,
                      300
                    ),
                    height: getButtonSize().height,
                    minHeight: getTouchTargetSize(),
                    opacity: form.uploadState.status === "verifying" ? 0.5 : 1,
                  }}
                  activeOpacity={0.8}
                  disabled={form.uploadState.status === "verifying"}
                >
                  <Text
                    className="text-white font-semibold"
                    style={{ fontSize: getResponsiveFontSize(16, 18, 20) }}
                  >
                    {form.uploadState.status === "verifying"
                      ? "Verifying..."
                      : "Post"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <TopToast
        visible={toast.visible}
        text={toast.text}
        type={toast.type}
        topOffset={Math.max(insets.top + 8, 48)}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />

      <UploadResultModal
        result={result}
        onPrimary={() => {
          if (isSuccess) {
            confirmSuccessNavigate();
            return;
          }
          form.setUploadResult(null);
        }}
        onSecondary={
          isSuccess
            ? () => {
                cancelSuccessNavigate();
              }
            : undefined
        }
        onDismiss={() => {
          if (isSuccess) {
            cancelSuccessNavigate();
            return;
          }
          form.setUploadResult(null);
        }}
      />
    </>
  );
}
