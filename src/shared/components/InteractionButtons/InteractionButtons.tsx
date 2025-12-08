/**
 * InteractionButtons Component
 * 
 * This file now wraps UnifiedInteractionButtons for backward compatibility.
 * New code should use UnifiedInteractionButtons directly.
 */

import React from "react";
import { InteractionButtonsProps } from "../../types";
import { UnifiedInteractionButtons } from "./UnifiedInteractionButtons";

export const InteractionButtons: React.FC<InteractionButtonsProps> = (props) => {
  // Map old props to new UnifiedInteractionButtons props
  return (
    <UnifiedInteractionButtons
      contentId={props.contentId}
      contentType={props.item?.contentType || "media"}
      layout={props.layout}
      onLike={props.onLike}
      onComment={props.onComment}
      onSave={props.onSave}
      onShare={props.onShare}
      onDownload={props.onDownload}
      userLikeState={props.userLikeState}
      userSaveState={props.userSaveState}
      likeCount={props.likeCount}
      saveCount={props.saveCount}
      commentCount={props.commentCount}
      viewCount={props.viewCount}
      isDownloaded={props.isDownloaded}
      showCounts={true}
    />
  );
};

export default InteractionButtons;
