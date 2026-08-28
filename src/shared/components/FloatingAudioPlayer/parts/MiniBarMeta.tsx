import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, View } from "react-native";
import { floatingMiniBarStyles as styles } from "../floatingMiniBarStyles";

type Props = {
  title: string;
  subtitle: string;
};

export const MiniBarMeta = React.memo(function MiniBarMeta({
  title,
  subtitle,
}: Props) {
  return (
    <>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </>
  );
});
