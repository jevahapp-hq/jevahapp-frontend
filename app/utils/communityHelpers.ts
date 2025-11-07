// Community Helper Utilities
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { CreatePrayerRequest } from "./communityAPI";

// ============= FORM VALIDATION =============

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const validatePrayerForm = (
  data: CreatePrayerRequest
): ValidationResult => {
  const errors: string[] = [];

  if (!data.prayerText || data.prayerText.trim().length === 0) {
    errors.push("Prayer text is required");
  } else if (data.prayerText.length > 2000) {
    errors.push("Prayer text must be less than 2000 characters");
  }

  if (data.color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(data.color)) {
    errors.push("Invalid color format");
  }

  const validShapes = [
    "rectangle",
    "circle",
    "scalloped",
    "square",
    "square2",
    "square3",
    "square4",
  ];
  if (data.shape && !validShapes.includes(data.shape)) {
    errors.push("Invalid shape");
  }

  if (data.verse?.reference && !data.verse.reference.trim()) {
    errors.push("Verse reference cannot be empty if verse text is provided");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateForumPostForm = (data: {
  content: string;
  embeddedLinks?: Array<{
    url: string;
    title?: string;
    description?: string;
    thumbnail?: string;
    type: "video" | "article" | "resource" | "other";
  }>;
}): ValidationResult => {
  const errors: string[] = [];

  if (!data.content || data.content.trim().length === 0) {
    errors.push("Post content is required");
  } else if (data.content.length > 5000) {
    errors.push("Post content must be less than 5000 characters");
  }

  if (data.embeddedLinks && data.embeddedLinks.length > 5) {
    errors.push("Maximum 5 embedded links allowed");
  }

  if (data.embeddedLinks) {
    data.embeddedLinks.forEach((link, index) => {
      if (!link.url || !isValidUrl(link.url)) {
        errors.push(`Link ${index + 1}: Invalid URL format`);
      }
      if (link.title && link.title.length > 200) {
        errors.push(`Link ${index + 1}: Title must be less than 200 characters`);
      }
      if (link.description && link.description.length > 500) {
        errors.push(
          `Link ${index + 1}: Description must be less than 500 characters`
        );
      }
      if (!link.type) {
        errors.push(`Link ${index + 1}: Type is required`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateGroupForm = (data: {
  name: string;
  description?: string;
  visibility?: "public" | "private";
}): ValidationResult => {
  const errors: string[] = [];

  const trimmedName = data.name ? data.name.trim() : "";
  if (!trimmedName) {
    errors.push("Group name is required");
  } else if (trimmedName.length < 3) {
    errors.push("Group name must be at least 3 characters");
  } else if (trimmedName.length > 100) {
    errors.push("Group name must be less than 100 characters");
  }

  if (data.description !== undefined) {
    const trimmedDescription = data.description.trim();
    if (trimmedDescription && trimmedDescription.length < 3) {
      errors.push("Group description must be at least 3 characters");
    } else if (trimmedDescription.length > 500) {
      errors.push("Group description must be less than 500 characters");
    }
  }

  if (
    data.visibility !== undefined &&
    data.visibility !== "public" &&
    data.visibility !== "private"
  ) {
    errors.push("Group visibility must be either public or private");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validatePollForm = (data: {
  title: string;
  description?: string;
  options: string[];
  expiresAt?: string;
}): ValidationResult => {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push("Poll title is required");
  } else if (data.title.length < 5) {
    errors.push("Poll title must be at least 5 characters");
  } else if (data.title.length > 200) {
    errors.push("Poll title must be less than 200 characters");
  }

  if (data.description && data.description.length > 500) {
    errors.push("Poll description must be less than 500 characters");
  }

  if (!data.options || data.options.length < 2) {
    errors.push("Poll must have at least 2 options");
  } else if (data.options.length > 10) {
    errors.push("Poll can have maximum 10 options");
  }

  data.options.forEach((option, index) => {
    if (!option || option.trim().length === 0) {
      errors.push(`Option ${index + 1} cannot be empty`);
    } else if (option.length > 200) {
      errors.push(`Option ${index + 1} must be less than 200 characters`);
    }
  });

  if (data.expiresAt) {
    const expiryDate = new Date(data.expiresAt);
    if (isNaN(expiryDate.getTime())) {
      errors.push("Invalid expiry date");
    } else if (expiryDate <= new Date()) {
      errors.push("Expiry date must be in the future");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============= URL VALIDATION =============

export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
};

// ============= LINK EMBEDDING =============

export const extractLinkMetadata = async (
  url: string
): Promise<{
  title?: string;
  description?: string;
  thumbnail?: string;
  type: "video" | "article" | "resource" | "other";
}> => {
  // Detect link type
  const isVideo =
    /youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|tevah\.com/i.test(url);
  const isArticle = /medium\.com|blog|article|news/i.test(url);

  let type: "video" | "article" | "resource" | "other" = "other";
  if (isVideo) type = "video";
  else if (isArticle) type = "article";
  else type = "resource";

  // You can fetch OG tags here if needed
  // For now, return basic detection
  return {
    type,
    // title, description, thumbnail would come from OG tag fetching
  };
};

// ============= IMAGE UPLOAD =============

export interface ImagePickerResult {
  uri: string;
  type: string;
  name: string;
}

export const pickAndResizeImage = async (
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.8
): Promise<ImagePickerResult | null> => {
  try {
    // Request permission
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Permission denied for media library");
    }

    // Pick image
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) {
      return null;
    }

    if (!result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];

    // Resize if needed
    const manipulated = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize: { width: maxWidth, height: maxHeight } }],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      uri: manipulated.uri,
      type: "image/jpeg",
      name: "image.jpg",
    };
  } catch (error) {
    console.error("Error picking image:", error);
    throw error;
  }
};

// ============= DEBOUNCE UTILITY =============

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

// ============= DATE FORMATTING =============

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks > 1 ? "s" : ""} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString();
};

// ============= RETRY UTILITY =============

export const retryApiCall = async <T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await apiCall();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error("Max retries exceeded");
};

