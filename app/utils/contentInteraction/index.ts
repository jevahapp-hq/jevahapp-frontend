export type {
  BatchMetadataItem,
  CommentData,
  ContentInteraction,
  ContentStats,
} from "./types";

export { createClient, type ContentInteractionClient } from "./client";
export { ContentInteractionService, contentInteractionAPI } from "./service";
export { contentInteractionAPI as default } from "./service";
