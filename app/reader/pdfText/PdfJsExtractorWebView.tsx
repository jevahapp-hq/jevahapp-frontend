import { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { getPdfJsExtractorHtml } from "./pdfJsExtractorHtml";

export type PdfJsExtractorMessage =
  | { type: "ready" }
  | { type: "started"; totalPages: number }
  | { type: "page"; pageNumber: number; text: string; totalPages: number }
  | { type: "done"; totalPages: number }
  | { type: "error"; message: string };

type Props = {
  pdfBase64: string | null;
  enabled: boolean;
  onMessage: (message: PdfJsExtractorMessage) => void;
};

const CHUNK_SIZE = 180000;
const html = getPdfJsExtractorHtml();

async function injectBase64(web: WebView, b64: string): Promise<void> {
  web.injectJavaScript(`window.__pdfB64=''; true;`);
  for (let i = 0; i < b64.length; i += CHUNK_SIZE) {
    const part = JSON.stringify(b64.slice(i, i + CHUNK_SIZE));
    web.injectJavaScript(`window.__pdfB64 += ${part}; true;`);
  }
  web.injectJavaScript(`window.__extractPdf && window.__extractPdf(); true;`);
}

/**
 * 1×1 off-screen WebView that runs PDF.js. Kept mounted while Listen is open
 * so chapter 1 can stream in before the rest of the book finishes.
 */
export default function PdfJsExtractorWebView({
  pdfBase64,
  enabled,
  onMessage,
}: Props) {
  const webRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const pendingRef = useRef<string | null>(null);
  const injectedForRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pdfBase64) {
      injectedForRef.current = null;
      pendingRef.current = null;
    }
  }, [pdfBase64]);

  useEffect(() => {
    if (!enabled || !pdfBase64) return;
    if (injectedForRef.current === pdfBase64) return;
    if (readyRef.current && webRef.current) {
      injectedForRef.current = pdfBase64;
      void injectBase64(webRef.current, pdfBase64);
      return;
    }
    pendingRef.current = pdfBase64;
  }, [enabled, pdfBase64]);

  if (!enabled) return null;

  return (
    <View style={styles.host} pointerEvents="none" collapsable={false}>
      <WebView
        ref={webRef}
        source={{ html }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        style={styles.web}
        androidLayerType={Platform.OS === "android" ? "hardware" : undefined}
        onMessage={(event) => {
          try {
            const data = JSON.parse(
              event.nativeEvent.data || "{}"
            ) as PdfJsExtractorMessage;
            if (data.type === "ready") {
              readyRef.current = true;
              const pending = pendingRef.current;
              if (pending && webRef.current && injectedForRef.current !== pending) {
                injectedForRef.current = pending;
                pendingRef.current = null;
                void injectBase64(webRef.current, pending);
              }
            }
            onMessage(data);
          } catch {
            // ignore malformed extractor messages
          }
        }}
        onError={() => {
          onMessage({
            type: "error",
            message: "Could not start the text extractor.",
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    left: -4,
    top: -4,
    overflow: "hidden",
  },
  web: {
    width: 1,
    height: 1,
    backgroundColor: "transparent",
  },
});
