import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity } from "react-native";
import { mediaApi } from "../../core/api/MediaApi";

interface SaveButtonProps {
  contentId: string;
  contentType?: string;
  initialSaved?: boolean;
  initialSaveCount?: number;
  onSaveChange?: (saved: boolean, count?: number) => void;
  size?: number;
  color?: string;
  savedColor?: string;
  showCount?: boolean;
  disabled?: boolean;
  showText?: boolean;
}

const SaveButton: React.FC<SaveButtonProps> = ({
  contentId,
  contentType = "media",
  initialSaved = false,
  initialSaveCount = 0,
  onSaveChange,
  size = 20,
  color = "#9CA3AF",
  savedColor = "#FF8A00",
  showCount = true,
  disabled = false,
  showText = false,
}) => {
  const [saved, setSaved] = useState(initialSaved);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update state when props change
  useEffect(() => {
    setSaved(initialSaved);
    setSaveCount(initialSaveCount);
  }, [initialSaved, initialSaveCount]);

  const toggleSave = useCallback(async () => {
    if (loading || disabled) return;

    setLoading(true);
    setError(null);

    // Optimistic update
    const previousSaved = saved;
    const previousCount = saveCount;
    const newSaved = !saved;
    const newCount = newSaved ? saveCount + 1 : Math.max(0, saveCount - 1);

    setSaved(newSaved);
    setSaveCount(newCount);
    onSaveChange?.(newSaved, newCount);

    try {
      // Use existing working endpoint for now
      let result;
      if (contentType === "media") {
        result = await mediaApi.toggleMediaBookmark(contentId);
      } else {
        // For non-media content, try the universal endpoint
        try {
          result = await mediaApi.toggleSave(contentId, contentType);
        } catch (universalError) {
          console.warn(
            "Universal bookmark endpoint not available, using fallback"
          );
          result = await mediaApi.toggleMediaBookmark(contentId);
        }
      }

      if (result.success && result.data) {
        // Update with server response
        const serverSaved =
          result.data.bookmarked ?? result.data.saved ?? newSaved;
        const serverCount =
          result.data.bookmarkCount ?? result.data.saveCount ?? newCount;

        setSaved(serverSaved);
        setSaveCount(serverCount);
        onSaveChange?.(serverSaved, serverCount);

        // Show user feedback
        const message = serverSaved
          ? "Saved to library"
          : "Removed from library";
        Alert.alert("Library", message);

        // Track analytics
        try {
          // Import analytics dynamically to avoid circular deps
          const { trackEvent } = await import("../../../app/utils/analytics");
          trackEvent("content_saved", {
            contentType,
            contentId,
            saved: serverSaved,
            saveCount: serverCount,
            timestamp: new Date().toISOString(),
          });
        } catch (analyticsError) {
          console.warn("Analytics tracking failed:", analyticsError);
        }
      } else {
        // Revert optimistic update on failure
        setSaved(previousSaved);
        setSaveCount(previousCount);
        onSaveChange?.(previousSaved, previousCount);

        const errorMessage = result.error || "Failed to update save status";
        setError(errorMessage);

        // Show user-friendly error
        Alert.alert("Error", errorMessage);
      }
    } catch (error: any) {
      // Revert optimistic update on error
      setSaved(previousSaved);
      setSaveCount(previousCount);
      onSaveChange?.(previousSaved, previousCount);

      const errorMessage = error.message || "Network error occurred";
      setError(errorMessage);

      // Handle specific error types
      if (
        error.message?.includes("401") ||
        error.message?.includes("Unauthorized")
      ) {
        Alert.alert(
          "Authentication Required",
          "Please log in to save content",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Login",
              onPress: () => {
                // Navigate to login - implement based on your navigation
                console.log("Navigate to login");
              },
            },
          ]
        );
      } else if (error.message?.includes("404")) {
        Alert.alert("Error", "Content not found");
      } else {
        Alert.alert("Error", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    disabled,
    saved,
    saveCount,
    contentId,
    contentType,
    onSaveChange,
  ]);

  const currentColor = saved ? savedColor : color;
  const iconName = saved ? "bookmark" : "bookmark-outline";

  return (
    <TouchableOpacity
      onPress={toggleSave}
      disabled={loading || disabled}
      style={{
        flexDirection: "row",
        alignItems: "center",
        opacity: loading || disabled ? 0.6 : 1,
        padding: 4,
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentColor} />
      ) : (
        <Ionicons name={iconName as any} size={size} color={currentColor} />
      )}

      {showText && (
        <Text
          style={{
            marginLeft: 4,
            fontSize: 10,
            color: currentColor,
            fontWeight: "normal",
          }}
        >
          {saved ? "Saved" : "Save"}
        </Text>
      )}

      {showCount && !showText && (
        <Text
          style={{
            marginLeft: 4,
            fontSize: 10,
            color: currentColor,
            fontWeight: "normal",
          }}
        >
          {saveCount}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export default SaveButton;
