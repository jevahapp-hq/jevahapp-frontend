/**
 * Warning Suppression Utilities
 * Handles common React Native warnings that don't affect functionality
 */

// Safe import to avoid errors
let LogBox: any = null;
try {
  const RN = require("react-native");
  LogBox = RN.LogBox;
} catch (error) {
  console.warn("Could not import LogBox:", error);
}

/**
 * Suppress VirtualizedList nesting warnings
 * This warning appears when FlatList/SectionList is nested inside ScrollView
 * but doesn't affect functionality in most cases
 */
export const suppressVirtualizedListWarnings = () => {
  if (__DEV__ && LogBox) {
    try {
      // Suppress the specific VirtualizedList nesting warning
      LogBox.ignoreLogs([
        "VirtualizedLists should never be nested inside plain ScrollViews",
        "VirtualizedLists should never be nested inside plain ScrollViews with the same orientation",
      ]);
    } catch (error) {
      console.warn("Could not suppress warnings:", error);
    }
  }
};

/**
 * Suppress other common non-critical warnings
 */
export const suppressCommonWarnings = () => {
  if (__DEV__ && LogBox) {
    try {
      LogBox.ignoreLogs([
        // VirtualizedList warnings
        "VirtualizedLists should never be nested inside plain ScrollViews",
        "VirtualizedLists should never be nested inside plain ScrollViews with the same orientation",

        // Common React Native warnings that don't affect functionality
        "componentWillReceiveProps has been renamed",
        "componentWillMount has been renamed",
        "componentWillUpdate has been renamed",

        // Expo warnings
        "expo-av",
        "expo-haptics",

        // Network warnings (if any)
        "Network request failed",
      ]);
    } catch (error) {
      console.warn("Could not suppress warnings:", error);
    }
  }
};

/**
 * Initialize warning suppression
 * Call this in your main App component or index file
 */
export const initializeWarningSuppression = () => {
  try {
    suppressCommonWarnings();
    console.log("🔇 Warning suppression initialized");
  } catch (error) {
    console.warn("⚠️ Warning suppression failed:", error);
  }
};

/**
 * Custom error handler for non-critical errors
 */
export const handleNonCriticalError = (
  error: any,
  context: string = "Unknown"
) => {
  console.warn(`⚠️ Non-critical error in ${context}:`, error);

  // You can add analytics or logging here if needed
  // analytics().recordError(error, { context });
};

/**
 * Check if an error should be suppressed
 */
export const shouldSuppressError = (error: any): boolean => {
  const errorMessage = error?.message || error?.toString() || "";

  const suppressibleErrors = [
    "VirtualizedLists should never be nested",
    "componentWillReceiveProps has been renamed",
    "componentWillMount has been renamed",
    "componentWillUpdate has been renamed",
  ];

  return suppressibleErrors.some((suppressibleError) =>
    errorMessage.includes(suppressibleError)
  );
};
