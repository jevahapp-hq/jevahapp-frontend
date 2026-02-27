/**
 * ReelsModals
 * All modals used by the Reels screen in one place.
 * Easier to maintain and debug modal behavior.
 */
import React from "react";
import { View } from "react-native";
import MediaDetailsModal from "../../../src/shared/components/MediaDetailsModal";
import ReportMediaModal from "../../../src/shared/components/ReportMediaModal";
import { DeleteMediaConfirmation } from "../../components/DeleteMediaConfirmation";
import BottomNavOverlay from "../../components/layout/BottomNavOverlay";
import { ReelsHeader } from "./ReelsHeader";

export interface ReelsModalsProps {
  currentVideo: any;
  title: string;
  isIOS: boolean;
  activeTab: string;
  showDeleteModal: boolean;
  showReportModal: boolean;
  showDetailsModal: boolean;
  onBackPress: () => void;
  onTabChange: (tab: string) => void;
  onCloseDelete: () => void;
  onDeleteSuccess: () => void;
  onCloseReport: () => void;
  onCloseDetails: () => void;
  getResponsiveSpacing: (s: number, m: number, l: number) => number;
  getResponsiveSize: (s: number, m: number, l: number) => number;
  getTouchTargetSize: () => number;
}

export function ReelsModals({
  currentVideo,
  title,
  isIOS,
  activeTab,
  showDeleteModal,
  showReportModal,
  showDetailsModal,
  onBackPress,
  onTabChange,
  onCloseDelete,
  onDeleteSuccess,
  onCloseReport,
  onCloseDetails,
  getResponsiveSpacing,
  getResponsiveSize,
  getTouchTargetSize,
}: ReelsModalsProps) {
  return (
    <>
      <ReelsHeader
        onBackPress={onBackPress}
        getResponsiveSpacing={getResponsiveSpacing}
        getResponsiveSize={getResponsiveSize}
        getTouchTargetSize={getTouchTargetSize}
      />
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          backgroundColor: "transparent",
          pointerEvents: "box-none" as const,
          paddingBottom: isIOS ? 20 : 0,
        }}
      >
        <BottomNavOverlay
          selectedTab={activeTab}
          onTabChange={onTabChange}
        />
      </View>
      <DeleteMediaConfirmation
        visible={showDeleteModal}
        mediaId={currentVideo._id || ""}
        mediaTitle={currentVideo.title || "this video"}
        onClose={onCloseDelete}
        onSuccess={onDeleteSuccess}
      />
      <ReportMediaModal
        visible={showReportModal}
        onClose={onCloseReport}
        mediaId={currentVideo._id || ""}
        mediaTitle={currentVideo.title || title}
      />
      <MediaDetailsModal
        visible={showDetailsModal}
        onClose={onCloseDetails}
        mediaItem={currentVideo}
      />
    </>
  );
}
