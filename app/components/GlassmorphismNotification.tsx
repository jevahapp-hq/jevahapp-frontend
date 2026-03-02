import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: screenWidth } = Dimensions.get("window");

interface GlassmorphismNotificationProps {
  visible: boolean;
  type: "success" | "info" | "warning" | "error";
  title: string;
  message: string;
  icon?: string;
  onClose: () => void;
  onAction?: () => void;
  actionText?: string;
  duration?: number;
}

const GlassmorphismNotification: React.FC<GlassmorphismNotificationProps> = ({
  visible,
  type,
  title,
  message,
  icon,
  onClose,
  onAction,
  actionText,
  duration = 4000,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const handleClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Use requestAnimationFrame to ensure this runs after the current render cycle
      requestAnimationFrame(() => {
        onClose();
      });
    });
  }, [slideAnim, opacityAnim, onClose]);

  useEffect(() => {
    if (visible) {
      // Use requestAnimationFrame to ensure animations start after render
      requestAnimationFrame(() => {
        // Slide in animation
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      });

      // Auto close after duration
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      // Close animation when visibility changes to false
      handleClose();
    }
  }, [visible, handleClose, duration]);

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          backgroundColor: "rgba(20, 184, 166, 0.25)", // Teal with more opacity
          borderColor: "rgba(20, 184, 166, 0.4)",
          iconColor: "#FFD700", // Golden
          iconName: icon || "check-circle",
        };
      case "info":
        return {
          backgroundColor: "rgba(20, 184, 166, 0.25)", // Teal
          borderColor: "rgba(20, 184, 166, 0.4)",
          iconColor: "#FFD700", // Golden
          iconName: icon || "info",
        };
      case "warning":
        return {
          backgroundColor: "rgba(20, 184, 166, 0.25)", // Teal
          borderColor: "rgba(20, 184, 166, 0.4)",
          iconColor: "#FFD700", // Golden
          iconName: icon || "warning",
        };
      case "error":
        return {
          backgroundColor: "rgba(20, 184, 166, 0.25)", // Teal
          borderColor: "rgba(20, 184, 166, 0.4)",
          iconColor: "#FFD700", // Golden
          iconName: icon || "error",
        };
      default:
        return {
          backgroundColor: "rgba(20, 184, 166, 0.25)", // Teal
          borderColor: "rgba(20, 184, 166, 0.4)",
          iconColor: "#FFD700", // Golden
          iconName: icon || "info",
        };
    }
  };

  const typeStyles = getTypeStyles();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.notification,
          {
            backgroundColor: typeStyles.backgroundColor,
            borderColor: typeStyles.borderColor,
          },
        ]}
      >
        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <MaterialIcons name="close" size={20} color="#666" />
        </TouchableOpacity>

        {/* Icon and content */}
        <View style={styles.content}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: "rgba(255, 215, 0, 0.4)" }, // More opaque golden background
            ]}
          >
            <MaterialIcons
              name={typeStyles.iconName as any}
              size={24}
              color={typeStyles.iconColor}
            />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>
        </View>

        {/* Action button */}
        {onAction && actionText && (
          <TouchableOpacity style={styles.actionButton} onPress={onAction}>
            <Text style={[styles.actionText, { color: typeStyles.iconColor }]}>
              {actionText}
            </Text>
            <MaterialIcons
              name="arrow-forward"
              size={16}
              color={typeStyles.iconColor}
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    zIndex: 1000,
    transform: [{ translateY: -100 }], // Center vertically
  },
  notification: {
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 15,
    // Super enhanced glassmorphism effect
    backdropFilter: "blur(30px)",
    // Fallback for React Native - more opaque for better visibility
    backgroundColor: "rgba(20, 184, 166, 0.4)",
    // Additional blur effect
    overflow: "hidden",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginRight: 32,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700", // Bolder font weight
    color: "#FFD700", // Golden text
    marginBottom: 4,
    textShadowColor: "rgba(0, 0, 0, 1)", // Stronger shadow
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  message: {
    fontSize: 14,
    fontWeight: "500", // Medium font weight
    color: "#FFD700", // Golden text
    lineHeight: 20,
    textShadowColor: "rgba(0, 0, 0, 0.9)", // Stronger shadow
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 4,
  },
});

export default GlassmorphismNotification;
