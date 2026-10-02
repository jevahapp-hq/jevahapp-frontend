// Delete Media Hook
import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteMedia, isMediaOwner } from "../utils/mediaDeleteAPI";
import { Alert } from "react-native";

interface UseDeleteMediaReturn {
  deleteMediaItem: (mediaId: string | string[]) => Promise<boolean>;
  checkOwnership: (uploadedBy: string | { _id: string } | undefined, mediaItem?: any) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  reset: () => void;
}

export const useDeleteMedia = (): UseDeleteMediaReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const checkOwnership = useCallback(
    async (uploadedBy: string | { _id: string } | undefined, mediaItem?: any): Promise<boolean> => {
      try {
        return await isMediaOwner(uploadedBy, mediaItem);
      } catch (err) {
        console.error("Error checking ownership:", err);
        return false;
      }
    },
    []
  );

  const deleteMediaItem = useCallback(
    async (mediaId: string | string[]): Promise<boolean> => {
      // Prevent duplicate calls
      if (isLoading) {
        console.log("⚠️ Delete already in progress, ignoring duplicate call");
        return false;
      }

      setIsLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const result = await deleteMedia(mediaId);
        if (result.success) {
          setSuccess(true);
          return true;
        }
        return false;
      } catch (err: any) {
        const errorMessage = err.message || "Failed to delete media";
        if (errorMessage.includes("already been deleted")) {
          setSuccess(true);
          return true;
        }
        setError(errorMessage);
        Alert.alert("Delete Failed", errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
  );

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
    setIsLoading(false);
  }, []);

  return {
    deleteMediaItem,
    checkOwnership,
    isLoading,
    error,
    success,
    reset,
  };
};

