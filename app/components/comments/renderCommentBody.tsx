import { Ionicons } from "@expo/vector-icons";
import { memo, useMemo, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { COMMENT_COMPOSER_COLORS as C } from "./types";

type Props = {
  text: string;
  imageUrl?: string | null;
  mentionNames?: string[];
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function RenderCommentBodyInner({ text, imageUrl, mentionNames }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const uri = (imageUrl || "").trim();
  const hasUri = !!uri;

  const nodes = useMemo(() => {
    if (!text) return null;
    const names = (mentionNames || [])
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    if (!names.length) {
      return <Text style={styles.text}>{text}</Text>;
    }
    const pattern = new RegExp(
      `(@(?:${names.map(escapeRegExp).join("|")}))`,
      "g"
    );
    const parts = text.split(pattern);
    return (
      <Text style={styles.text}>
        {parts.map((part, i) => {
          if (part.startsWith("@") && names.some((n) => part === `@${n}`)) {
            return (
              <Text key={i} style={styles.mention}>
                {part}
              </Text>
            );
          }
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    );
  }, [text, mentionNames]);

  return (
    <View style={styles.wrap}>
      {nodes}
      {hasUri && !imgFailed ? (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => {
            if (__DEV__) {
              console.warn(
                "⚠️ Comment image 404/unreachable (CDN URL not public):",
                uri
              );
            }
            setImgFailed(true);
          }}
        />
      ) : null}
      {hasUri && imgFailed ? (
        <View style={[styles.image, styles.imageBroken]}>
          <Ionicons name="image-outline" size={28} color={C.meta} />
          <Text style={styles.brokenText}>Photo unavailable</Text>
        </View>
      ) : null}
    </View>
  );
}

export const RenderCommentBody = memo(RenderCommentBodyInner);

const styles = StyleSheet.create({
  wrap: {
    marginTop: 2,
  },
  text: {
    fontSize: 15,
    lineHeight: 20,
    color: C.text,
  },
  mention: {
    color: C.mention,
    fontWeight: "600",
  },
  image: {
    marginTop: 8,
    width: 220,
    height: 220,
    borderRadius: 12,
    backgroundColor: C.inputBg,
  },
  imageBroken: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.border,
  },
  brokenText: {
    marginTop: 6,
    fontSize: 12,
    color: C.meta,
    fontWeight: "600",
  },
});
