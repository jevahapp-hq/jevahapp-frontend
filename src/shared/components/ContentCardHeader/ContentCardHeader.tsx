import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import ThreeDotsMenuButton from "../ThreeDotsMenuButton/ThreeDotsMenuButton";

interface ContentCardHeaderProps {
  avatarSource: any;
  displayName: string;
  timeAgo: string;
  onMenuPress: () => void;
  avatarSize?: number;
  showInitialFallback?: boolean;
  className?: string;
}

export const ContentCardHeader: React.FC<ContentCardHeaderProps> = ({
  avatarSource,
  displayName,
  timeAgo,
  onMenuPress,
  avatarSize = 48,
  showInitialFallback = true,
  className = "",
}) => {
  const [avatarErrored, setAvatarErrored] = React.useState(false);
  const firstInitial = (displayName || "?").trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.container, className ? { className } : {}]}>
      {/* Avatar */}
      <View
        style={[
          styles.avatarContainer,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          },
        ]}
      >
        {!avatarErrored && avatarSource ? (
          <Image
            source={avatarSource}
            style={{
              width: avatarSize - 6,
              height: avatarSize - 6,
              borderRadius: (avatarSize - 6) / 2,
            }}
            resizeMode="cover"
            onError={() => setAvatarErrored(true)}
          />
        ) : (
          showInitialFallback && (
            <Text
              style={[
                styles.initial,
                {
                  fontSize: avatarSize * 0.35,
                },
              ]}
            >
              {firstInitial}
            </Text>
          )
        )}
      </View>

      {/* Name, Dot, Date container */}
      <View style={styles.textContainer}>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={styles.dot} />
        <Text style={styles.timeAgo}>{timeAgo}</Text>
      </View>

      {/* Three Dots Menu */}
      <ThreeDotsMenuButton onPress={onMenuPress} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avatarContainer: {
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 3,
    borderColor: "#D1D5DB",
  },
  initial: {
    fontFamily: "Rubik_600SemiBold",
    color: "#344054",
  },
  textContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontSize: 14,
    fontFamily: "Rubik_700Bold",
    color: "#1F2937",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FF8A00",
    marginHorizontal: 8,
  },
  timeAgo: {
    fontSize: 11,
    fontFamily: "Rubik_400Regular",
    color: "#6B7280",
    textTransform: "uppercase",
  },
});

export default ContentCardHeader;
