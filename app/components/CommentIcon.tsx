/**
 * CommentIcon Component
 * 
 * This file wraps the shared CommentIcon component with comment modal integration.
 * The shared component supports both animated and non-animated variants.
 * 
 * @deprecated Import from src/shared/components/CommentIcon instead
 * This file is kept for backward compatibility
 */

import { CommentIcon as SharedCommentIcon } from "../../src/shared/components/CommentIcon";
import { CommentIconProps } from "../../src/shared/types/comment.types";
import { useCommentModal } from "../context/CommentModalContext";

export default function CommentIcon(props: CommentIconProps) {
  const { showCommentModal } = useCommentModal();
  
  const handlePress = () => {
    if (props.onPress) {
      props.onPress();
      return;
    }
    // If contentId is provided, open comment modal
    if (props.contentId) {
      showCommentModal(props.comments, props.contentId);
    }
  };

  // Use non-animated button for backward compatibility with existing usage
  return (
    <SharedCommentIcon
      {...props}
      useAnimatedButton={false}
      onPress={handlePress}
    />
  );
}

export { CommentIcon };
export type { CommentIconProps };
