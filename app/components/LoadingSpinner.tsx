import React from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { UI_CONFIG } from "../../src/shared/constants";
import {
  getResponsiveBorderRadius,
  getResponsiveFontSize,
  getResponsiveShadow,
  getResponsiveSpacing,
  getResponsiveTextStyle,
} from "../../utils/responsive";

interface LoadingSpinnerProps {
  type?: "fullscreen" | "overlay" | "inline" | "button" | "card";
  size?: "small" | "large";
  text?: string;
  color?: string;
  backgroundColor?: string;
  showText?: boolean;
  transparent?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function LoadingSpinner({
  type = "inline",
  size = "large",
  text = "Loading...",
  color = "#256E63",
  backgroundColor = "rgba(255, 255, 255, 0.9)",
  showText = true,
  transparent = false,
}: LoadingSpinnerProps) {
  const spinnerSize = size === "small" ? "small" : "large";
  const textStyle = getResponsiveTextStyle("body");

  const renderContent = () => (
    <View
      style={[
        styles.content,
        { backgroundColor: transparent ? "transparent" : backgroundColor },
      ]}
    >
      <ActivityIndicator size={spinnerSize} color={color} />
      {showText && text && (
        <Text
          style={[
            styles.text,
            textStyle,
            { color: color === "#256E63" ? "#1D2939" : color },
          ]}
        >
          {text}
        </Text>
      )}
    </View>
  );

  switch (type) {
    case "fullscreen":
      return (
        <View
          style={[
            styles.fullscreen,
            { backgroundColor: transparent ? "transparent" : backgroundColor },
          ]}
        >
          {renderContent()}
        </View>
      );

    case "overlay":
      return (
        <View
          style={[
            styles.overlay,
            {
              backgroundColor: transparent
                ? "rgba(0, 0, 0, 0.3)"
                : backgroundColor,
            },
          ]}
        >
          <View
            style={[
              styles.overlayContent,
              {
                backgroundColor: transparent
                  ? "rgba(255, 255, 255, 0.95)"
                  : "white",
                borderRadius: getResponsiveBorderRadius("large"),
                padding: getResponsiveSpacing(24, 28, 32, 36),
                ...getResponsiveShadow(),
              },
            ]}
          >
            {renderContent()}
          </View>
        </View>
      );

    case "card":
      return (
        <View
          style={[
            styles.card,
            {
              backgroundColor: transparent ? "transparent" : "white",
              borderRadius: getResponsiveBorderRadius("medium"),
              padding: getResponsiveSpacing(20, 24, 28, 32),
              margin: getResponsiveSpacing(8, 12, 16, 20),
              ...getResponsiveShadow(),
            },
          ]}
        >
          {renderContent()}
        </View>
      );

    case "button":
      return (
        <View
          style={[
            styles.button,
            {
              backgroundColor: transparent ? "transparent" : color,
              borderRadius: getResponsiveBorderRadius("round"),
              paddingHorizontal: getResponsiveSpacing(16, 20, 24, 28),
              paddingVertical: getResponsiveSpacing(8, 10, 12, 14),
            },
          ]}
        >
          <ActivityIndicator
            size="small"
            color={transparent ? color : "white"}
          />
          {showText && text && (
            <Text
              style={[
                styles.buttonText,
                {
                  fontSize: getResponsiveFontSize(12, 14, 16, 18),
                  color: transparent ? color : "white",
                  marginLeft: getResponsiveSpacing(8, 10, 12, 14),
                },
              ]}
            >
              {text}
            </Text>
          )}
        </View>
      );

    default: // inline
      return (
        <View
          style={[
            styles.inline,
            { backgroundColor: transparent ? "transparent" : backgroundColor },
          ]}
        >
          {renderContent()}
        </View>
      );
  }
}

const styles = StyleSheet.create({
  fullscreen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9998,
  },
  overlayContent: {
    minWidth: screenWidth * 0.3,
    maxWidth: screenWidth * 0.8,
    alignItems: "center",
  },
  card: {
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  inline: {
    alignItems: "center",
    justifyContent: "center",
    padding: getResponsiveSpacing(16, 20, 24, 28),
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: getResponsiveSpacing(8, 10, 12, 14),
    textAlign: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
});

// Predefined loading components for common use cases
export const FullScreenLoader = ({
  text,
  transparent,
}: {
  text?: string;
  transparent?: boolean;
}) => (
  <LoadingSpinner
    type="fullscreen"
    text={text || "Loading..."}
    transparent={transparent}
  />
);

export const OverlayLoader = ({
  text,
  transparent,
}: {
  text?: string;
  transparent?: boolean;
}) => (
  <LoadingSpinner
    type="overlay"
    text={text || "Please wait..."}
    transparent={transparent}
  />
);

export const CardLoader = ({ text }: { text?: string }) => (
  <LoadingSpinner type="card" text={text || "Loading content..."} />
);

export const ButtonLoader = ({
  text,
  color,
}: {
  text?: string;
  color?: string;
}) => (
  <LoadingSpinner
    type="button"
    size="small"
    text={text || "Loading..."}
    color={color}
  />
);

export const InlineLoader = ({
  text,
  size,
}: {
  text?: string;
  size?: "small" | "large";
}) => <LoadingSpinner type="inline" size={size} text={text} />;

// Skeleton loading components
export const SkeletonLoader = ({
  type = "card",
  lines = 3,
  width = "100%",
  height = 20,
}: {
  type?: "card" | "text" | "avatar" | "button";
  lines?: number;
  width?: string | number;
  height?: number;
}) => {
  const skeletonStyle = {
    backgroundColor: UI_CONFIG.COLORS.SKELETON_BASE,
    borderRadius: getResponsiveBorderRadius("small"),
    marginVertical: getResponsiveSpacing(4, 6, 8, 10),
  };

  const renderSkeletonLines = () => {
    const linesArray = Array.from({ length: lines }, (_, index) => index);
    return linesArray.map((_, index) => (
      <View
        key={index}
        style={[
          skeletonStyle,
          {
            width: index === lines - 1 ? "60%" : width,
            height: getResponsiveSpacing(12, 14, 16, 18),
          },
        ]}
      />
    ));
  };

  switch (type) {
    case "card":
      return (
        <View
          style={[
            styles.card,
            {
              backgroundColor: "white",
              borderRadius: getResponsiveBorderRadius("medium"),
              padding: getResponsiveSpacing(16, 20, 24, 28),
              margin: getResponsiveSpacing(8, 12, 16, 20),
              ...getResponsiveShadow(),
            },
          ]}
        >
          <View
            style={[
              skeletonStyle,
              {
                width: "100%",
                height: getResponsiveSpacing(120, 140, 160, 180),
                marginBottom: getResponsiveSpacing(12, 16, 20, 24),
              },
            ]}
          />
          {renderSkeletonLines()}
        </View>
      );

    case "avatar":
      return (
        <View
          style={[
            skeletonStyle,
            {
              width: getResponsiveSpacing(40, 44, 48, 52),
              height: getResponsiveSpacing(40, 44, 48, 52),
              borderRadius: getResponsiveBorderRadius("round"),
            },
          ]}
        />
      );

    case "button":
      return (
        <View
          style={[
            skeletonStyle,
            {
              width: width,
              height: getResponsiveSpacing(44, 48, 52, 56),
              borderRadius: getResponsiveBorderRadius("round"),
            },
          ]}
        />
      );

    default: // text
      return (
        <View style={{ padding: getResponsiveSpacing(8, 12, 16, 20) }}>
          {renderSkeletonLines()}
        </View>
      );
  }
};

// Pulse animation for skeleton loaders
export const PulseLoader = ({
  children,
  duration = 1000,
}: {
  children: React.ReactNode;
  duration?: number;
}) => {
  const [opacity, setOpacity] = React.useState(0.3);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setOpacity((prev) => (prev === 0.3 ? 0.7 : 0.3));
    }, duration);

    return () => clearInterval(interval);
  }, [duration]);

  return <View style={{ opacity }}>{children}</View>;
};
