import React, { createContext, ReactNode, useContext } from "react";
import { useCommentModalController } from "../hooks/comments/useCommentModalController";
import {
  COMMENT_MODAL_NOOP,
  type CommentModalContextType,
} from "./commentModalTypes";

export type {
  CommentMediaAnchor,
  CommentCreatorInfo,
  Comment,
  SubmitCommentInput,
  EditCommentInput,
  CommentModalContextType,
} from "./commentModalTypes";

const CommentModalContext = createContext<CommentModalContextType | undefined>(
  undefined
);

export const useCommentModal = () => {
  const context = useContext(CommentModalContext);
  if (!context) {
    console.warn(
      "useCommentModal called outside of CommentModalProvider. Returning no-op implementation."
    );
    return COMMENT_MODAL_NOOP;
  }
  return context;
};

interface CommentModalProviderProps {
  children: ReactNode;
}

export const CommentModalProvider: React.FC<CommentModalProviderProps> = ({
  children,
}) => {
  const value = useCommentModalController();
  return (
    <CommentModalContext.Provider value={value}>
      {children}
    </CommentModalContext.Provider>
  );
};
