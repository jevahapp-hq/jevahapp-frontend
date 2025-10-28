import React, { useState } from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";

interface AvatarWithFallbackProps {
  source: any;
  size?: number;
  name?: string;
  borderWidth?: number;
  borderColor?: string;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
}

export const AvatarWithFallback: React.FC<AvatarWithFallbackProps> = ({
  source,
  size = 48,
  name,
  borderWidth = 0,
  borderColor = "#D1D5DB",
  backgroundColor = "#E5E7EB",
  textColor = "#344054",
  style,
}) => {
  const [errored, setErrored] = useState(false);
  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderWidth,
          borderColor,
        },
        style,
      ]}
    >
      {!errored && source ? (
        <Image
          source={source}
          style={{
            width: size - borderWidth * 2,
            height: size - borderWidth * 2,
            borderRadius: (size - borderWidth * 2) / 2,
          }}
          resizeMode="cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <Text
          style={[
            styles.initial,
            {
              fontSize: size * 0.35,
              color: textColor,
            },
          ]}
        >
          {initial}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initial: {
    fontFamily: "Rubik_600SemiBold",
  },
});

export default AvatarWithFallback;
