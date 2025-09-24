import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

export default function PdfViewer() {
  const router = useRouter();
  const { url: rawUrl, title: rawTitle } = useLocalSearchParams<{
    url?: string;
    title?: string;
  }>();
  const url = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  const title = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle;
  const [loaded, setLoaded] = useState(false);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const PdfRef = useRef<any>(null);

  // Prevent screenshots/screen recordings when module is available
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ScreenCapture = require("expo-screen-capture");
        await ScreenCapture.preventScreenCaptureAsync();
      } catch {}
    })();
    return () => {
      if (!active) return;
      try {
        const ScreenCapture = require("expo-screen-capture");
        ScreenCapture.allowScreenCaptureAsync().catch(() => {});
      } catch {}
      active = false;
    };
  }, []);

  // Try to enable native PDF viewer if present
  const PDFNative = useMemo(() => {
    try {
      const mod = require("react-native-pdf");
      const Comp = mod?.default || mod;
      if (Comp) setNativeAvailable(true);
      return Comp as any;
    } catch {
      setNativeAvailable(false);
      return null;
    }
  }, []);

  const viewerUrl = useMemo(() => {
    if (!url) return "";
    // Use Google Docs viewer for broad Android support
    const encoded = encodeURIComponent(url);
    return `https://drive.google.com/viewerng/viewer?embedded=true&url=${encoded}`;
  }, [url]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
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
          style={{ fontSize: 16, fontWeight: "600", color: "#111" }}
          numberOfLines={1}
        >
          {title || "Document"}
        </Text>
      </View>

      {!loaded && (
        <View
          style={{
            position: "absolute",
            top: 60,
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 1,
          }}
        >
          <ActivityIndicator size="small" color="#111" />
        </View>
      )}

      {nativeAvailable && url ? (
        // Native renderer when available for best fidelity and performance
        <PDFNative
          ref={PdfRef}
          source={{ uri: url, cache: false }}
          style={{ flex: 1, backgroundColor: "#fff" }}
          trustAllCerts={true}
          onLoadComplete={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          enableAnnotationRendering={false}
          enableAntialiasing
          enablePaging={false}
          renderActivityIndicator={() => (
            <ActivityIndicator size="large" color="#111" />
          )}
        />
      ) : viewerUrl ? (
        // WebView fallback with anti-download guards
        <WebView
          source={{ uri: viewerUrl }}
          onLoadEnd={() => setLoaded(true)}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(req) => {
            // Block navigation to file/data/blob schemes to avoid downloads
            const u = req?.url || "";
            if (/^(file:|data:|blob:)/i.test(u)) return false;
            return true;
          }}
          onFileDownload={() => false}
          injectedJavaScript={`
            document.addEventListener('contextmenu', event => event.preventDefault());
            document.documentElement.style.webkitTouchCallout='none';
            document.documentElement.style.webkitUserSelect='none';
            true;
          `}
          renderLoading={() => (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color="#111" />
            </View>
          )}
        />
      ) : (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Text style={{ color: "#666" }}>No document URL provided.</Text>
        </View>
      )}
    </View>
  );
}
