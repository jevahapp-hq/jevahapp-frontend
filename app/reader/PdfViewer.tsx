import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

export default function PdfViewer() {
  const router = useRouter();
  const { url: rawUrl, title: rawTitle } = useLocalSearchParams<{
    url?: string;
    title?: string;
  }>();
  const url = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  const title = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle;

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [fallbackUri, setFallbackUri] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const cachePath = useMemo(() => {
    const safe = encodeURIComponent(String(url || ""));
    return `${FileSystem.cacheDirectory}pdf-cache/${safe}.pdf`;
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    const ensureDir = async () => {
      try {
        const dir = `${FileSystem.cacheDirectory}pdf-cache`;
        const info = await FileSystem.getInfoAsync(dir);
        if (!info.exists)
          await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      } catch {}
    };

    const download = async () => {
      if (!url) {
        setErrorText("No PDF URL provided");
        setLoading(false);
        return;
      }
      // Always prepare a docs viewer URL for Android (WebView doesn't render PDFs natively)
      const docsUri = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
        String(url)
      )}`;
      if (Platform.OS === "android") {
        setFallbackUri(docsUri);
      }
      setLoading(true);
      setErrorText(null);
      try {
        await ensureDir();
        // Use cached file if available
        const info = await FileSystem.getInfoAsync(cachePath, { size: true });
        if (info.exists && (info.size || 0) > 1000) {
          if (!cancelled) setLocalUri(cachePath);
          return;
        }
        const dl = FileSystem.createDownloadResumable(
          url,
          cachePath,
          {},
          (d) => {
            if (
              d.totalBytesExpectedToWrite &&
              d.totalBytesExpectedToWrite > 0
            ) {
              const p = d.totalBytesWritten / d.totalBytesExpectedToWrite;
              setProgress(Math.max(0, Math.min(1, p)));
            }
          }
        );
        const res = await dl.downloadAsync();
        if (!cancelled && res?.uri) {
          setLocalUri(res.uri);
        }
      } catch (e: any) {
        // Fallback to Google Docs viewer for broad compatibility
        if (!cancelled) {
          setFallbackUri(
            `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
              String(url)
            )}`
          );
          setErrorText("Falling back to online viewer");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    download();
    return () => {
      cancelled = true;
    };
  }, [url, cachePath]);

  const openExternal = async () => {
    try {
      if (localUri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(localUri);
      } else if (url) {
        // As a fallback, open the remote URL in system browser
        const Linking = require("react-native").Linking;
        Linking.openURL(url);
      }
    } catch {}
  };

  const header = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 10,
      }}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ padding: 8, marginRight: 8 }}
      >
        <Ionicons name="arrow-back" size={22} color="#111" />
      </TouchableOpacity>
      <Text
        style={{ fontSize: 16, fontWeight: "600", color: "#111", flex: 1 }}
        numberOfLines={1}
      >
        {title || "PDF"}
      </Text>
      <TouchableOpacity onPress={openExternal} style={{ padding: 8 }}>
        <Ionicons name="open-outline" size={20} color="#111" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {header}
      {loading && !fallbackUri && !localUri ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#090E24" />
          <Text style={{ marginTop: 8, color: "#475467" }}>
            {progress > 0
              ? `Downloading… ${Math.round(progress * 100)}%`
              : "Preparing document…"}
          </Text>
        </View>
      ) : // On iOS use local file for best performance; on Android show docs viewer
      Platform.OS === "ios" && localUri ? (
        <WebView
          style={{ flex: 1 }}
          source={{ uri: localUri }}
          originWhitelist={["*"]}
          allowFileAccess
          allowingReadAccessToURL={localUri}
          startInLoadingState
          renderLoading={() => (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="large" color="#090E24" />
            </View>
          )}
          onError={() =>
            setFallbackUri(
              `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
                String(url)
              )}`
            )
          }
        />
      ) : fallbackUri ? (
        <WebView
          style={{ flex: 1 }}
          source={{ uri: fallbackUri }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          scalesPageToFit
          startInLoadingState
          renderLoading={() => (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="large" color="#090E24" />
            </View>
          )}
          onError={() => setErrorText("Unable to load PDF")}
        />
      ) : (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#666" }}>
            {errorText || "Unable to open document"}
          </Text>
        </View>
      )}
    </View>
  );
}
