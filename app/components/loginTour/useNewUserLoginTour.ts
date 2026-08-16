import { useEffect, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import { useUserProfile } from "../../hooks/useUserProfile";
import { trackEvent } from "../../utils/analytics";
import {
  claimLoginTourPending,
  consumeLoginTourBindSeen,
  markLoginTourSeen,
  shouldShowLoginTour,
} from "./loginTourStorage";

export type LoginTourDismissReason = "skipped" | "completed";

export function useNewUserLoginTour() {
  const { user } = useUserProfile();
  const [visible, setVisible] = useState(false);
  const [elevateNav, setElevateNav] = useState(false);
  const shownRef = useRef(false);

  const userId = String(user?._id || user?.id || "").trim();
  const createdAt = user?.createdAt;

  useEffect(() => {
    if (consumeLoginTourBindSeen(userId || null)) {
      setVisible(false);
      return;
    }
    if (userId) claimLoginTourPending(userId);

    let cancelled = false;
    const reveal = () => {
      if (cancelled || shownRef.current) return;
      if (!shouldShowLoginTour(user)) return;
      shownRef.current = true;
      if (userId) claimLoginTourPending(userId);
      setVisible(true);
      trackEvent("tour_shown", { userId: userId || undefined });
    };

    const task = InteractionManager.runAfterInteractions(reveal);
    const fallback = setTimeout(reveal, 900);
    return () => {
      cancelled = true;
      task.cancel();
      clearTimeout(fallback);
    };
  }, [userId, createdAt]);

  const dismiss = (reason: LoginTourDismissReason, slide = 0) => {
    markLoginTourSeen(userId || null);
    setElevateNav(false);
    setVisible(false);
    trackEvent(reason === "skipped" ? "tour_skipped" : "tour_completed", {
      slide,
      userId: userId || undefined,
    });
  };

  return {
    visible,
    elevateNav,
    setElevateNav,
    dismiss,
    firstName: String(user?.firstName || "").trim(),
  };
}
