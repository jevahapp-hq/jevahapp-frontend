import { useLikeQueueBootstrap } from "../utils/contentInteraction/useLikeQueueBootstrap";

/**
 * Tiny mount-only bridge so the root layout stays free of queue logic.
 */
export default function LikeQueueBootstrap() {
  useLikeQueueBootstrap();
  return null;
}
