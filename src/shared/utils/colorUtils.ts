/**
 * Color Utility Functions
 * Utilities for manipulating colors (lighten, darken, etc.)
 */

/**
 * Darken a hex color by a percentage
 * @param hex - Hex color string (e.g., "#256E63")
 * @param percent - Percentage to darken (0-100, default 30)
 * @returns Darkened hex color string
 */
export const darkenColor = (hex: string, percent: number = 30): string => {
  if (!hex || typeof hex !== "string") {
    return hex;
  }

  // Remove # if present
  const cleanHex = hex.replace("#", "");
  
  // Parse hex to RGB
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) {
    return hex; // Return original if invalid
  }

  // Calculate darkening amount
  const amt = Math.round(2.55 * percent);
  
  // Extract RGB components
  const R = (num >> 16) - amt;
  const G = ((num >> 8) & 0x00ff) - amt;
  const B = (num & 0x0000ff) - amt;

  // Clamp values between 0 and 255
  const clampedR = Math.max(0, Math.min(255, R));
  const clampedG = Math.max(0, Math.min(255, G));
  const clampedB = Math.max(0, Math.min(255, B));

  // Convert back to hex
  return (
    "#" +
    (
      0x1000000 +
      clampedR * 0x10000 +
      clampedG * 0x100 +
      clampedB
    )
      .toString(16)
      .slice(1)
  );
};

/**
 * Lighten a hex color by a percentage
 * @param hex - Hex color string (e.g., "#256E63")
 * @param percent - Percentage to lighten (0-100, default 30)
 * @returns Lightened hex color string
 */
export const lightenColor = (hex: string, percent: number = 30): string => {
  if (!hex || typeof hex !== "string") {
    return hex;
  }

  // Remove # if present
  const cleanHex = hex.replace("#", "");
  
  // Parse hex to RGB
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) {
    return hex; // Return original if invalid
  }

  // Calculate lightening amount
  const amt = Math.round(2.55 * percent);
  
  // Extract RGB components
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  // Clamp values between 0 and 255
  const clampedR = Math.max(0, Math.min(255, R));
  const clampedG = Math.max(0, Math.min(255, G));
  const clampedB = Math.max(0, Math.min(255, B));

  // Convert back to hex
  return (
    "#" +
    (
      0x1000000 +
      clampedR * 0x10000 +
      clampedG * 0x100 +
      clampedB
    )
      .toString(16)
      .slice(1)
  );
};
