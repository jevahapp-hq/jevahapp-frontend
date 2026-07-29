/**
 * Premium upload result modal — success / error / moderation / review.
 * Replaces Alert.alert + legacy RN Modal for a TikTok-clean feel.
 */
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import type { ModerationError, UploadResultState } from "../types";
import { formatFriendlyRejectionMessage } from "../utils";
import { UploadOverlayShell } from "./UploadOverlayShell";

export type { UploadResultState } from "../types";

type Props = {
  result: UploadResultState | null;
  busy?: boolean;
  onPrimary: () => void;
  onSecondary?: () => void;
  onDismiss: () => void;
};

const THEME: Record<
  UploadResultState["kind"],
  {
    icon: keyof typeof Ionicons.glyphMap;
    ring: string;
    accent: string;
    btn: string;
  }
> = {
  success: {
    icon: "checkmark-circle",
    ring: "#E8F8EF",
    accent: "#0B7A3B",
    btn: "#0B7A3B",
  },
  error: {
    icon: "cloud-offline-outline",
    ring: "#FFF0F3",
    accent: "#FE2C55",
    btn: "#FE2C55",
  },
  moderation: {
    icon: "bulb-outline",
    ring: "#FFF4E5",
    accent: "#C45C00",
    btn: "#C45C00",
  },
  review: {
    icon: "time-outline",
    ring: "#FFF8E1",
    accent: "#A67C00",
    btn: "#A67C00",
  },
};

export function buildModerationResult(
  moderation: ModerationError
): UploadResultState {
  const friendly = formatFriendlyRejectionMessage(
    moderation.status,
    moderation.reason,
    moderation.flags,
    moderation.message
  );
  return {
    kind: friendly.isReview ? "review" : "moderation",
    title: friendly.isReview ? "Under review" : "Needs a small tweak",
    message: friendly.message,
    tip: friendly.isReview
      ? undefined
      : "Make sure the title and description clearly reflect gospel-aligned teaching, then try again.",
    primaryLabel: friendly.isReview ? "Got it" : "Try again",
    moderation,
  };
}

export function buildSuccessResult(): UploadResultState {
  return {
    kind: "success",
    title: "You're live",
    message:
      "Your content passed verification and is ready on the feed. Jump in now, or stay to post another.",
    primaryLabel: "View feed",
    secondaryLabel: "Stay here",
  };
}

export function buildErrorResult(
  message: string,
  title = "Upload failed"
): UploadResultState {
  return {
    kind: "error",
    title,
    message: message || "Something went wrong. Please try again.",
    tip: "Check your connection and file size, then try posting again.",
    primaryLabel: "Try again",
  };
}

export function UploadResultModal({
  result,
  busy,
  onPrimary,
  onSecondary,
  onDismiss,
}: Props) {
  const visible = !!result;
  const kind = result?.kind || "error";
  const theme = THEME[kind];

  return (
    <UploadOverlayShell
      visible={visible}
      onClose={busy ? () => {} : onDismiss}
    >
      {result ? (
        <View style={styles.inner}>
          <View style={[styles.iconRing, { backgroundColor: theme.ring }]}>
            <Ionicons name={theme.icon} size={30} color={theme.accent} />
          </View>

          <Text style={styles.title}>{result.title}</Text>
          <Text style={styles.message}>{result.message}</Text>

          {result.tip ? (
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>{result.tip}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.btn }]}
            onPress={onPrimary}
            disabled={!!busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>
                {result.primaryLabel || "OK"}
              </Text>
            )}
          </TouchableOpacity>

          {result.secondaryLabel && onSecondary ? (
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={onSecondary}
              disabled={!!busy}
              activeOpacity={0.7}
            >
              <Text style={styles.ghostText}>{result.secondaryLabel}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={onDismiss}
              disabled={!!busy}
              activeOpacity={0.7}
            >
              <Text style={styles.ghostText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </UploadOverlayShell>
  );
}

const styles = StyleSheet.create({
  inner: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 18,
    alignItems: "center",
  },
  iconRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: "#161823",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: "#8A8B91",
    textAlign: "center",
    marginBottom: 14,
  },
  tipBox: {
    alignSelf: "stretch",
    backgroundColor: "#F8F8F8",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  tipText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#5C5D63",
    textAlign: "center",
  },
  primaryBtn: {
    alignSelf: "stretch",
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  ghostBtn: {
    alignSelf: "stretch",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#8A8B91",
  },
});
