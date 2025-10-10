import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import EbookAudioControls from "../components/EbookAudioControls";
import { useTextToSpeech } from "../hooks/useTextToSpeech";

export default function PdfViewer() {
  const router = useRouter();
  const {
    url: rawUrl,
    title: rawTitle,
    desc: rawDesc,
  } = useLocalSearchParams<{
    url?: string;
    title?: string;
    desc?: string;
  }>();
  const url = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  const title = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle;
  const desc = Array.isArray(rawDesc) ? rawDesc[0] : rawDesc;

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [fallbackUri, setFallbackUri] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [extractionReady, setExtractionReady] = useState(false);
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const queueRef = useRef<string[]>([]);
  const readingRef = useRef(false);
  const [combinedText, setCombinedText] = useState<string>("");

  const { speak, stop, setVoice, getAvailableVoices } = useTextToSpeech({
    onDone: () => {
      // Advance to next chunk if available
      const next = queueRef.current.shift();
      if (next) {
        speak(next);
      } else {
        readingRef.current = false;
      }
    },
  });

  // Choose a default voice once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const voices = await getAvailableVoices();
        const pick = (gender: "female" | "male") =>
          voices.find(
            (v: any) =>
              v.language?.toLowerCase().includes("en") &&
              (v.name?.toLowerCase().includes(gender) ||
                v.identifier?.toLowerCase().includes(gender))
          );
        const female = pick("female");
        const anyEn = voices.find((v: any) =>
          v.language?.toLowerCase().includes("en")
        );
        if (!cancelled) setVoice((female || anyEn)?.identifier || undefined);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [getAvailableVoices, setVoice]);

  // Chunking utility to keep TTS stable
  const chunkText = useCallback((text: string, maxLen: number = 1500) => {
    const chunks: string[] = [];
    const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
    let buf = "";
    for (const s of sentences) {
      if ((buf + " " + s).trim().length > maxLen) {
        if (buf) chunks.push(buf.trim());
        if (s.length > maxLen) {
          // sentence too long, hard split
          for (let i = 0; i < s.length; i += maxLen) {
            chunks.push(s.slice(i, i + maxLen));
          }
          buf = "";
        } else {
          buf = s;
        }
      } else {
        buf = (buf + " " + s).trim();
      }
    }
    if (buf) chunks.push(buf.trim());
    return chunks;
  }, []);

  // Start reading if not already and we have queue
  const ensureReading = useCallback(() => {
    if (!readingRef.current && queueRef.current.length > 0) {
      readingRef.current = true;
      const next = queueRef.current.shift();
      if (next) speak(next);
    }
  }, [speak]);

  // Combine text for controls (allows manual restart)
  useEffect(() => {
    setCombinedText(pageTexts.join("\n\n"));
  }, [pageTexts]);

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

      {/* Hidden extractor WebView using pdf.js to extract per-page text */}
      {/** Note: We keep it visually hidden; it only posts page texts via postMessage **/}
      <WebView
        style={{ height: 0, width: 0, opacity: 0 }}
        originWhitelist={["*"]}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data || "{}");
            if (data.type === "ready") {
              setExtractionReady(true);
            } else if (data.type === "pageText") {
              const txt = String(data.text || "").trim();
              if (txt.length > 0) {
                setPageTexts((prev) => [...prev, txt]);
                const chunks = chunkText(txt);
                queueRef.current.push(...chunks);
                ensureReading();
              }
            } else if (data.type === "error") {
              console.warn("PDF extraction error:", data.message);
            }
          } catch (e) {}
        }}
        injectedJavaScriptBeforeContentLoaded={`(function(){
          document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
          document.addEventListener('keydown', function(e){
            const k = e.key.toLowerCase();
            if ((e.ctrlKey||e.metaKey) && (k==='s'||k==='p'||k==='u')) { e.preventDefault(); e.stopPropagation(); }
          });
        })(); true;`}
        source={{
          html: (() => {
            const pdfUrl = String(localUri || url || "");
            const esc = (s: string) =>
              s.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
            return `<!DOCTYPE html>
          <html>
          <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
          <body style="margin:0;background:#fff;">
            <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
            <script>
              (function(){
                const RN = window.ReactNativeWebView;
                function post(obj){ try{ RN.postMessage(JSON.stringify(obj)); }catch(e){} }
                post({type:'ready'});
                try {
                  const url = '${esc(pdfUrl)}';
                  if(!url){ post({type:'error', message:'No URL'}); return; }
                  const pdfjsLib = window['pdfjsLib'];
                  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                  pdfjsLib.getDocument({url:url, withCredentials:false}).promise.then(async function(pdf){
                    const total = pdf.numPages;
                    for(let p=1; p<=total; p++){
                      const page = await pdf.getPage(p);
                      const content = await page.getTextContent();
                      const strings = content.items.map(i=> (i.str||'')).join(' ');
                      post({type:'pageText', page:p, totalPages:total, text: strings});
                    }
                  }).catch(function(err){ post({type:'error', message: String(err)}); });
                } catch (err){ post({type:'error', message: String(err)}); }
              })();
            </script>
          </body>
          </html>`;
          })(),
        }}
      />

      {/* Audio controls pinned at bottom (frontend-only TTS) */}
      <EbookAudioControls
        text={combinedText || title || ""}
        title={title || "Audio Reader"}
      />
    </View>
  );
}
