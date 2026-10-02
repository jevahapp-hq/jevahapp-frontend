import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getMediaById } from "../../src/core/api/media/feeds";
import {
  buildContentOpenGraph,
  contentPublicUrl,
} from "../../src/shared/share/contentShare";
import { openSharedContent } from "../../src/shared/share/openSharedContent";

type PageFields = {
  title: string;
  description: string;
  imageUrl: string;
};

function applyOpenGraph(fields: PageFields, mediaId: string) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const meta = buildContentOpenGraph({
    id: mediaId,
    title: fields.title,
    description: fields.description,
    imageUrl: fields.imageUrl,
  });
  document.title = meta.title;
  const entries: [string, string][] = [
    ["og:title", meta.title],
    ["og:description", meta.description],
    ["og:url", meta.url],
    ["og:type", meta.type],
    ["og:site_name", meta.siteName],
  ];
  if (meta.image) entries.push(["og:image", meta.image]);
  for (const [property, content] of entries) {
    let el = document.head.querySelector(`meta[property="${property}"]`);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("property", property);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }
}

export default function SharedContentScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const mediaId = decodeURIComponent(String(params.id || "").trim());
  const router = useRouter();
  const [fields, setFields] = useState<PageFields | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!mediaId) {
      setMissing(true);
      return;
    }
    if (Platform.OS !== "web") {
      void openSharedContent(mediaId, router);
      return;
    }

    let cancelled = false;
    void getMediaById(mediaId)
      .then((loaded) => {
        if (cancelled) return;
        const media = loaded?.success ? loaded.data : null;
        const record = media?.media || media?.item || media;
        const title = String(record?.title || "Jevah").trim() || "Jevah";
        const description = String(
          record?.description || record?.caption || ""
        ).trim();
        const imageUrl = [record?.thumbnailUrl, record?.imageUrl].find(
          (value: unknown) => typeof value === "string" && /^https?:\/\//i.test(value)
        ) as string | undefined;
        const next = {
          title,
          description,
          imageUrl: imageUrl || "",
        };
        setFields(next);
        applyOpenGraph(next, mediaId);
      })
      .catch(() => {
        if (cancelled) return;
        const next = { title: "Jevah", description: "", imageUrl: "" };
        setFields(next);
        applyOpenGraph(next, mediaId);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaId, router]);

  if (missing) {
    return (
      <View style={styles.page}>
        <Text style={styles.title}>This link is missing a post.</Text>
      </View>
    );
  }

  if (Platform.OS !== "web") {
    return (
      <View style={styles.page}>
        <ActivityIndicator color="#256E63" />
      </View>
    );
  }

  const url = contentPublicUrl(mediaId);
  return (
    <View style={styles.page}>
      {fields?.imageUrl ? (
        <Image source={{ uri: fields.imageUrl }} style={styles.cover} />
      ) : null}
      <Text style={styles.title}>{fields?.title || "Jevah"}</Text>
      {fields?.description ? (
        <Text style={styles.description}>{fields.description}</Text>
      ) : null}
      <Text style={styles.link}>{url}</Text>
      {!fields ? <ActivityIndicator color="#256E63" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#FCFCFD",
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: "center",
  },
  cover: {
    width: "100%",
    maxWidth: 420,
    height: 236,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: "#E5E5EA",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1C1C1E",
    textAlign: "center",
  },
  description: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 22,
    color: "#3A3E50",
    textAlign: "center",
  },
  link: {
    marginTop: 20,
    fontSize: 14,
    color: "#256E63",
    textAlign: "center",
  },
});
