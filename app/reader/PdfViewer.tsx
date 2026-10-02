import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, StatusBar, Text, TextInput, TouchableOpacity, View } from "react-native";
import { NativeViewGestureHandler, TapGestureHandler } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { triggerHapticFeedback } from "../../src/shared/utils/haptics";
import {
  cachePdfUrl,
  ensurePdfCacheDir,
  evictOldPdfCache,
  getPdfCachePath,
} from "../utils/pdfCache";
import { PERF, perfMark, perfMeasure } from "../../src/shared/utils/perfMarks";
import {
  pausePlaybackSession,
  setMiniPlayerSuppression,
} from "../../src/shared/audio";
import { dismissReadingNarration } from "../../src/shared/audio/dismissReadingNarration";
import { useEbookReaderViewTracking } from "./hooks/useEbookReaderViewTracking";
import { usePdfChapterExtraction } from "./hooks/usePdfChapterExtraction";
import { rememberHomeFeedCategory } from "../../src/shared/media/homeFeedCategory";
import { pageFromScrollPosition, pdfPageCountFromSnippet } from "./pdfPageFromTap";

const EbookReadAloud = lazy(() => import("./EbookReadAloud"));

/**
 * Runs inside the PDF viewer. Google's viewer draws each page as an image
 * labeled "Page N of M". A tap posts that page; scrolling posts the page
 * that is actually on screen.
 */
const PDF_PAGE_TAP_SCRIPT = `
(function() {
  if (window.__jevahPdfTapWatch) return;
  window.__jevahPdfTapWatch = true;
  var lastPage = 0;
  var scrollAtTap = 0;

  function send(payload) {
    if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return;
    payload.source = "jevah-tap";
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  }

  function parsePageLabel(text) {
    if (!text) return null;
    var match = String(text).match(/Page\\s+(\\d+)\\s+of\\s+(\\d+)/i);
    if (!match) return null;
    var page = parseInt(match[1], 10);
    var total = parseInt(match[2], 10);
    if (!(page > 0)) return null;
    return { page: page, total: total > 0 ? total : 0 };
  }

  function fromNode(node) {
    var current = node;
    var depth = 0;
    while (current && depth < 8) {
      if (current.alt) {
        var fromAlt = parsePageLabel(current.alt);
        if (fromAlt) return fromAlt;
      }
      if (current.getAttribute) {
        var fromAria = parsePageLabel(current.getAttribute("aria-label"));
        if (fromAria) return fromAria;
      }
      current = current.parentElement;
      depth++;
    }
    return null;
  }

  function pageAtPoint(x, y) {
    if (typeof x === "number" && typeof y === "number" && document.elementFromPoint) {
      var direct = fromNode(document.elementFromPoint(x, y));
      if (direct) return direct;
    }
    if (typeof x !== "number" || typeof y !== "number") return null;
    var imgs = document.querySelectorAll("img");
    var best = null;
    var bestArea = Infinity;
    for (var i = 0; i < imgs.length; i++) {
      var label = parsePageLabel(imgs[i].alt);
      if (!label) continue;
      var rect = imgs[i].getBoundingClientRect();
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) continue;
      var area = rect.width * rect.height;
      if (area < bestArea) {
        bestArea = area;
        best = label;
      }
    }
    return best;
  }

  function pageMostVisible() {
    var imgs = document.querySelectorAll("img");
    var best = null;
    var bestArea = 0;
    var viewH = window.innerHeight || 0;
    var viewW = window.innerWidth || 0;
    for (var i = 0; i < imgs.length; i++) {
      var label = parsePageLabel(imgs[i].alt);
      if (!label) continue;
      var rect = imgs[i].getBoundingClientRect();
      var top = Math.max(rect.top, 0);
      var bottom = Math.min(rect.bottom, viewH);
      var left = Math.max(rect.left, 0);
      var right = Math.min(rect.right, viewW);
      var area = Math.max(0, bottom - top) * Math.max(0, right - left);
      if (area > bestArea) {
        bestArea = area;
        best = label;
      }
    }
    if (best) return best;
    var input = document.querySelector('input[aria-label^="Page"]');
    if (input) {
      var n = parseInt(input.value, 10);
      if (n > 0) {
        var total = 0;
        if (imgs.length) {
          var labeled = parsePageLabel(imgs[0].alt);
          if (labeled) total = labeled.total;
        }
        return { page: n, total: total };
      }
    }
    return null;
  }

  function scrollMarker() {
    var top = window.pageYOffset || 0;
    var nodes = document.querySelectorAll("div");
    for (var i = 0; i < nodes.length; i++) {
      var nodeTop = nodes[i].scrollTop || 0;
      if (nodeTop > top) top = nodeTop;
    }
    return top;
  }

  function reportVisible() {
    var found = pageMostVisible();
    if (!found) {
      sendMetrics();
      return;
    }
    if (found.page !== lastPage && Math.abs(scrollMarker() - scrollAtTap) < 24) return;
    if (found.page === lastPage) return;
    lastPage = found.page;
    send({ type: "pageChange", page: found.page, totalPages: found.total || 0 });
  }

  function sendMetrics() {
    var el = document.scrollingElement || document.documentElement || document.body;
    var top = window.pageYOffset || (el && el.scrollTop) || 0;
    var height = el ? el.scrollHeight : 0;
    var view = window.innerHeight || 0;
    var width = window.innerWidth || 0;
    var nodes = document.querySelectorAll("div");
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (node.scrollHeight > height && node.clientHeight > view * 0.45) {
        height = node.scrollHeight;
        top = node.scrollTop || 0;
        view = node.clientHeight || view;
      }
    }
    if (!(height > view * 1.15)) return;
    send({ type: "pdfMetrics", top: top, height: height, view: view, width: width });
  }

  window.__jevahReportPdfPage = function(clientY, clientX) {
    scrollAtTap = scrollMarker();
    var found = pageAtPoint(clientX, clientY);
    if (found) {
      lastPage = found.page;
      send({ type: "pageClick", page: found.page, totalPages: found.total || 0 });
      return;
    }
    send({ type: "tapPoint", x: clientX || 0, y: clientY || 0 });
  };

  var touchStartX = null;
  var touchStartY = null;
  document.addEventListener("touchstart", function(e) {
    var t = e.touches && e.touches[0];
    touchStartX = t ? t.clientX : null;
    touchStartY = t ? t.clientY : null;
  }, true);
  function onTap(x, y) {
    if (touchStartY != null && y != null && Math.abs(y - touchStartY) > 18) return;
    if (touchStartX != null && x != null && Math.abs(x - touchStartX) > 18) return;
    window.__jevahReportPdfPage(y, x);
  }
  document.addEventListener("click", function(e) {
    onTap(e.clientX, e.clientY);
  }, true);
  document.addEventListener("touchend", function(e) {
    var t = e.changedTouches && e.changedTouches[0];
    if (!t) return;
    onTap(t.clientX, t.clientY);
  }, true);

  var scrollTimer = null;
  function onScroll() {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(reportVisible, 70);
  }
  window.addEventListener("scroll", onScroll, true);
  document.addEventListener("scroll", onScroll, true);
  setInterval(reportVisible, 450);
})();
true;
`;
const PdfJsExtractorWebView = lazy(() => import("./pdfText/PdfJsExtractorWebView"));

// Decode URL-encoded text (like the %20 for spaces, %E2%80%99 for special chars)
const decodeText = (text: string) => {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '));
  } catch (e) {
    // If decode fails, try simple replacements
    return text
      .replace(/%20/g, ' ')
      .replace(/%E2%80%99/g, "'")
      .replace(/%2C/g, ',')
      .replace(/\+/g, ' ');
  }
};

export default function PdfViewer() {
  const router = useRouter();
  const {
    url: rawUrl,
    ebookId: rawEbookId,
    title: rawTitle,
    desc: rawDesc,
    from: rawFrom,
    homeCategory: rawHomeCategory,
  } = useLocalSearchParams<{
    url?: string;
    ebookId?: string;
    title?: string;
    desc?: string;
    from?: string;
    homeCategory?: string;
  }>();
  // Decode URL parameters - expo-router may encode them
  const decodedUrl = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  // Safely decode URL - try decodeURIComponent, but fallback to original if it fails
  const url = decodedUrl ? (() => {
    try {
      // Only decode if it looks encoded (contains %)
      if (decodedUrl.includes('%')) {
        return decodeURIComponent(decodedUrl);
      }
      return decodedUrl;
    } catch (e) {
      console.warn("⚠️ URL decode failed, using original:", e);
      return decodedUrl;
    }
  })() : undefined;
  const ebookId = Array.isArray(rawEbookId) ? rawEbookId[0] : rawEbookId;
  const title = Array.isArray(rawTitle) ? rawTitle[0] : rawTitle;
  const desc = Array.isArray(rawDesc) ? rawDesc[0] : rawDesc;
  const from = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom;
  const homeCategory = Array.isArray(rawHomeCategory)
    ? rawHomeCategory[0]
    : rawHomeCategory;
  const ebookFirstPageMeasuredRef = useRef(false);

  const handleReaderBack = useCallback(() => {
    if (homeCategory) rememberHomeFeedCategory(homeCategory);
    if (from === "downloads") {
      router.replace("/downloads/DownloadsScreen");
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace({
      pathname: "/categories/HomeScreen",
      params: {
        default: "Home",
        ...(homeCategory ? { defaultCategory: homeCategory } : {}),
      },
    });
  }, [from, homeCategory, router]);

  // Log received params for debugging
  useEffect(() => {
    console.log("📖 PdfViewer received params:", {
      rawUrl,
      decodedUrl,
      url,
      ebookId,
      title,
      hasUrl: !!url,
      urlType: typeof url,
      platform: Platform.OS,
    });
  }, [rawUrl, decodedUrl, url, ebookId, title]);

  useEffect(() => {
    if (!url) return;
    ebookFirstPageMeasuredRef.current = false;
    perfMark("ebook.first_page.start");
  }, [url]);

  const markEbookFirstPage = useCallback(() => {
    if (ebookFirstPageMeasuredRef.current) return;
    ebookFirstPageMeasuredRef.current = true;
    perfMeasure(PERF.EBOOK_FIRST_PAGE, "ebook.first_page.start");
  }, []);

  // On Android, set fallbackUri immediately when URL is available
  useEffect(() => {
    if (Platform.OS === "android" && url && !fallbackUri && !localUri) {
      const trimmedUrl = String(url).trim();
      const isValidUrl = /^(https?|file):\/\//.test(trimmedUrl);

      if (isValidUrl && !trimmedUrl.startsWith("file://") && !trimmedUrl.startsWith(FileSystem.documentDirectory || "")) {
        const docsUri = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(trimmedUrl)}`;
        console.log("🤖 Android: Setting Google Docs viewer immediately from useEffect");
        setFallbackUri(docsUri);
        setLoading(false);
        setErrorText(null);
      }
    }
  }, [url, fallbackUri, localUri]);

  // On Android, start with loading false and prepare fallback immediately
  const [loading, setLoading] = useState(Platform.OS !== "android");
  const [progress, setProgress] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  // Initialize fallbackUri for Android immediately if URL is available
  const [fallbackUri, setFallbackUri] = useState<string | null>(() => {
    if (Platform.OS === "android" && url) {
      const trimmedUrl = String(url).trim();
      const isValidUrl = /^(https?|file):\/\//.test(trimmedUrl);
      if (isValidUrl && !trimmedUrl.startsWith("file://") && !trimmedUrl.startsWith(FileSystem.documentDirectory || "")) {
        const docsUri = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(trimmedUrl)}`;
        console.log("🤖 Android: Initializing Google Docs viewer immediately");
        return docsUri;
      }
    }
    return null;
  });
  const [errorText, setErrorText] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentViewingPage, setCurrentViewingPage] = useState<number>(1);
  const [listenMode, setListenMode] = useState(false);
  const [listenStartPage, setListenStartPage] = useState(1);
  const [audioStartPage, setAudioStartPage] = useState<number | null>(null);
  const [pageInput, setPageInput] = useState("1");
  const [showDoubleTapHint, setShowDoubleTapHint] = useState(false);
  const currentViewingPageRef = useRef(1);
  const totalPagesRef = useRef(0);
  const pageInputFocusedRef = useRef(false);
  const webViewRef = useRef<WebView>(null);
  const doubleTapRef = useRef<any>(null);
  const nativeScrollRef = useRef<any>(null);
  const scrollMetricsRef = useRef({ y: 0, height: 0, viewH: 0, viewW: 0 });
  const webPageReportsRef = useRef(false);
  const tapHoldUntilRef = useRef(0);
  const scrollYAtTapRef = useRef(0);
  const lastTapFillAtRef = useRef(0);

  const {
    status: extractionStatus,
    error: extractionError,
    pdfBase64,
    chapters,
    extractedPages,
    totalPages: extractedTotalPages,
    handleExtractorMessage,
    retry: retryExtraction,
  } = usePdfChapterExtraction({
    url,
    localUri,
    enabled: listenMode,
  });

  useEbookReaderViewTracking({
    ebookId,
    currentPage: currentViewingPage,
    totalPages: totalPages || extractedTotalPages,
  });

  currentViewingPageRef.current = currentViewingPage;
  totalPagesRef.current = totalPages;

  const markAudioStartPage = useCallback((page: number) => {
    const n = Math.max(1, Math.round(Number(page)) || 1);
    const capped = totalPages > 0 ? Math.min(n, totalPages) : n;
    setAudioStartPage(capped);
    setPageInput(String(capped));
    setCurrentViewingPage(capped);
    setShowDoubleTapHint(false);
    triggerHapticFeedback("medium");
  }, [totalPages]);

  const parseTypedPage = useCallback((): number | null => {
    const n = parseInt(String(pageInput).replace(/[^\d]/g, ""), 10);
    if (!Number.isFinite(n) || n < 1) return null;
    return totalPages > 0 ? Math.min(n, totalPages) : n;
  }, [pageInput, totalPages]);

  const onNativeDoubleTap = useCallback(() => {
    markAudioStartPage(currentViewingPageRef.current || 1);
  }, [markAudioStartPage]);

  const fillPageField = useCallback(
    (page: number, total?: number, fromTap?: boolean, fromViewer?: boolean) => {
      const trustedTotal = fromViewer && total && total > 0 ? total : 0;
      const n = Math.max(1, Math.round(Number(page)) || 1);
      const capLimit = trustedTotal > 0 ? trustedTotal : totalPagesRef.current;
      const capped = capLimit > 0 ? Math.min(n, capLimit) : n;
      if (fromTap) {
        lastTapFillAtRef.current = Date.now();
        tapHoldUntilRef.current = Date.now() + 2500;
        scrollYAtTapRef.current = scrollMetricsRef.current.y;
        pageInputFocusedRef.current = false;
      } else if (pageInputFocusedRef.current) {
        return;
      } else if (
        !fromViewer &&
        Date.now() < tapHoldUntilRef.current &&
        Math.abs(scrollMetricsRef.current.y - scrollYAtTapRef.current) < 28
      ) {
        return;
      }
      setCurrentViewingPage(capped);
      setPageInput(String(capped));
      if (trustedTotal > 0) setTotalPages(trustedTotal);
    },
    []
  );

  const reinjectPageTapScript = useCallback(() => {
    const run = () => webViewRef.current?.injectJavaScript(PDF_PAGE_TAP_SCRIPT);
    run();
    setTimeout(run, 700);
    setTimeout(run, 2000);
  }, []);

  const onNativePageTap = useCallback(
    (event?: { nativeEvent?: { x?: number; y?: number } }) => {
      const y = Number(event?.nativeEvent?.y);
      const x = Number(event?.nativeEvent?.x);
      if (!webPageReportsRef.current && Number.isFinite(y)) {
        const guessed = pageFromScrollPosition(
          scrollMetricsRef.current.y,
          y,
          scrollMetricsRef.current.height,
          scrollMetricsRef.current.viewH,
          scrollMetricsRef.current.viewW,
          totalPagesRef.current
        );
        if (guessed) fillPageField(guessed, undefined, true, false);
      }
      const safeY = Number.isFinite(y) ? y : 0;
      const safeX = Number.isFinite(x) ? x : 0;
      webViewRef.current?.injectJavaScript(
        `try{window.__jevahReportPdfPage&&window.__jevahReportPdfPage(${safeY},${safeX});}catch(e){}true;`
      );
    },
    [fillPageField]
  );

  const onPdfScroll = useCallback(
    (event: any) => {
      const ne = event?.nativeEvent || {};
      scrollMetricsRef.current = {
        y: Number(ne.contentOffset?.y) || 0,
        height: Number(ne.contentSize?.height) || 0,
        viewH: Number(ne.layoutMeasurement?.height) || 0,
        viewW: Number(ne.layoutMeasurement?.width) || Number(ne.contentSize?.width) || 0,
      };
      if (webPageReportsRef.current) return;
      const guessed = pageFromScrollPosition(
        scrollMetricsRef.current.y,
        scrollMetricsRef.current.viewH / 2,
        scrollMetricsRef.current.height,
        scrollMetricsRef.current.viewH,
        scrollMetricsRef.current.viewW,
        totalPagesRef.current
      );
      if (guessed) fillPageField(guessed, undefined, false, false);
    },
    [fillPageField]
  );

  const handlePdfWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data || "{}");
        if (data.source !== "jevah-tap") return;
        if (data.type === "pageClick") {
          webPageReportsRef.current = true;
          fillPageField(data.page || 1, data.totalPages, true, true);
          return;
        }
        if (data.type === "pageChange" || data.type === "pageUpdate") {
          webPageReportsRef.current = true;
          fillPageField(data.page || 1, data.totalPages, false, true);
          return;
        }
        if (data.type === "tapPoint") {
          const guessed = pageFromScrollPosition(
            scrollMetricsRef.current.y,
            Number(data.y) || 0,
            scrollMetricsRef.current.height,
            scrollMetricsRef.current.viewH,
            scrollMetricsRef.current.viewW,
            totalPagesRef.current
          );
          if (guessed) fillPageField(guessed, undefined, true, false);
          return;
        }
        if (data.type === "pdfMetrics") {
          if (webPageReportsRef.current) return;
          const height = Number(data.height) || 0;
          const view = Number(data.view) || 0;
          if (!(height > view * 1.15)) return;
          scrollMetricsRef.current = {
            y: Number(data.top) || 0,
            height,
            viewH: view,
            viewW: Number(data.width) || scrollMetricsRef.current.viewW,
          };
          const guessed = pageFromScrollPosition(
            scrollMetricsRef.current.y,
            view / 2,
            height,
            view,
            scrollMetricsRef.current.viewW,
            totalPagesRef.current
          );
          if (guessed) fillPageField(guessed, undefined, false, false);
        }
      } catch {
        // ignore malformed WebView messages
      }
    },
    [fillPageField]
  );

  useEffect(() => {
    if (!localUri) return;
    let cancelled = false;
    const readCount = async () => {
      try {
        const info = await FileSystem.getInfoAsync(localUri);
        const size = info.exists && "size" in info ? Number(info.size) || 0 : 0;
        if (!(size > 0)) return;
        const chunk = 256 * 1024;
        const readChunk = async (position: number, length: number) => {
          const b64 = await FileSystem.readAsStringAsync(localUri, {
            encoding: FileSystem.EncodingType.Base64,
            position,
            length,
          });
          if (typeof atob !== "function") return "";
          return atob(b64);
        };
        const head = await readChunk(0, Math.min(chunk, size));
        const tail =
          size > chunk ? await readChunk(Math.max(0, size - chunk), Math.min(chunk, size)) : "";
        if (cancelled) return;
        const count = pdfPageCountFromSnippet(`${head}\n${tail}`);
        if (count && count > 1) {
          setTotalPages((current) => (current > 1 ? current : count));
        }
      } catch {
        // page count is only a hint for tap math
      }
    };
    readCount();
    return () => {
      cancelled = true;
    };
  }, [localUri]);

  const onHeadsetPress = useCallback(() => {
    if (listenMode) {
      setListenMode(false);
      return;
    }
    Keyboard.dismiss();
    const typed = parseTypedPage();
    const start = typed ?? audioStartPage;
    if (!start) {
      setShowDoubleTapHint(true);
      return;
    }
    markAudioStartPage(start);
    setListenStartPage(start);
    setListenMode(true);
  }, [listenMode, parseTypedPage, audioStartPage, markAudioStartPage]);

  useEffect(() => {
    setMiniPlayerSuppression("ebook-listen", listenMode);
    if (listenMode) {
      void pausePlaybackSession();
    }
    return () => setMiniPlayerSuppression("ebook-listen", false);
  }, [listenMode]);

  useEffect(() => {
    if (listenMode) return;
    dismissReadingNarration();
  }, [listenMode]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        dismissReadingNarration();
      };
    }, [])
  );

  useEffect(() => {
    if (extractedTotalPages > 0 && extractedTotalPages > totalPages) {
      setTotalPages(extractedTotalPages);
    }
  }, [extractedTotalPages, totalPages]);

  // Debug page changes
  useEffect(() => {
    console.log(`📄 Page viewing changed to: ${currentViewingPage}/${totalPages}`);
  }, [currentViewingPage, totalPages]);

  const cachePath = useMemo(() => getPdfCachePath(String(url || "")), [url]);

  useEffect(() => {
    // On Android, set up Google Docs viewer IMMEDIATELY (synchronous, no async operations)
    if (Platform.OS === "android" && url) {
      const trimmedUrl = String(url).trim();
      const isValidUrl = /^(https?|file):\/\//.test(trimmedUrl);

      // Only use online viewer for remote URLs, not local files
      if (isValidUrl && !trimmedUrl.startsWith("file://") && !trimmedUrl.startsWith(FileSystem.documentDirectory || "")) {
        const docsUri = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(trimmedUrl)}`;
        console.log("🤖 Android: Setting Google Docs viewer as default (immediate)");
        setFallbackUri(docsUri);
        setLoading(false);
        setErrorText(null);
        // Still warm disk cache in background for offline / listen mode.
        void cachePdfUrl(trimmedUrl);
        return; // Exit early, don't run download logic
      }
    }

    let cancelled = false;
    const ensureDir = async () => {
      try {
        await ensurePdfCacheDir();
      } catch { }
    };

    const download = async () => {
      if (!url) {
        console.error("❌ No PDF URL provided");
        setErrorText("No PDF URL provided");
        setLoading(false);
        return;
      }

      // Validate URL format
      const trimmedUrl = String(url).trim();
      const isValidUrl = /^(https?|file):\/\//.test(trimmedUrl);

      if (!isValidUrl) {
        console.error("❌ Invalid URL format:", trimmedUrl);
        setErrorText(`Invalid URL format: ${trimmedUrl.substring(0, 50)}...`);
        setLoading(false);
        return;
      }

      // If this is already a local file (e.g. coming from offline downloads),
      // skip remote downloading/caching and render directly.
      const isLocalFile =
        typeof trimmedUrl === "string" &&
        (trimmedUrl.startsWith("file://") || trimmedUrl.startsWith(FileSystem.documentDirectory || ""));
      if (isLocalFile) {
        console.log("📁 Using local file:", trimmedUrl);
        setFallbackUri(null);
        setLocalUri(trimmedUrl);
        setLoading(false);
        return;
      }

      // Prepare Google Docs viewer URL (for iOS fallback)
      const docsUri = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
        trimmedUrl
      )}`;
      console.log("🌐 Prepared Google Docs viewer URL:", docsUri.substring(0, 100) + "...");

      // iOS: Try to download and cache, with fallback to Google Docs viewer
      // (Android already handled above with early return)

      // iOS: Try to download and cache, with fallback to Google Docs viewer
      setFallbackUri(docsUri); // Set as backup
      setLoading(true);
      setErrorText(null);

      // Set a timeout to automatically use fallback if download takes too long (15 seconds)
      const timeoutId = setTimeout(() => {
        if (!cancelled && !localUri) {
          console.warn("⏱️ Download timeout - switching to Google Docs viewer");
          setLoading(false);
          // Fallback URI already set above
        }
      }, 15000);

      try {
        await ensureDir();

        // Use cached file if available
        const info = await FileSystem.getInfoAsync(cachePath, { size: true });
        if (info.exists && (info.size || 0) > 1000) {
          console.log("✅ Using cached PDF:", cachePath);
          clearTimeout(timeoutId);
          if (!cancelled) {
            setLocalUri(cachePath);
            setLoading(false);
          }
          return;
        }

        console.log("⬇️ Downloading PDF from:", trimmedUrl);
        const dl = FileSystem.createDownloadResumable(
          trimmedUrl,
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
        clearTimeout(timeoutId);

        if (!cancelled && res?.uri) {
          console.log("✅ PDF downloaded successfully:", res.uri);
          setLocalUri(res.uri);
          setLoading(false);
          void evictOldPdfCache();
        } else if (!cancelled) {
          console.warn("⚠️ Download completed but no URI returned, using fallback");
          setLoading(false);
          // Fallback URI already set above
        }
      } catch (e: any) {
        clearTimeout(timeoutId);
        console.error("❌ PDF download failed:", e);
        console.error("❌ Error details:", {
          message: e?.message,
          code: e?.code,
          stack: e?.stack?.substring(0, 200),
        });

        // Fallback to Google Docs viewer for broad compatibility
        if (!cancelled) {
          console.log("🔄 Falling back to Google Docs viewer");
          setFallbackUri(docsUri);
          setErrorText(null); // Clear error text, fallback should work
          setLoading(false);
        }
      }
    };
    download();
    return () => {
      cancelled = true;
    };
  }, [url, cachePath]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* White header with back button, title and page indicator */}
      <SafeAreaView style={{ backgroundColor: "#fff" }} edges={["top"]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingTop: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#E5E7EB",
            backgroundColor: "#fff",
          }}
        >
          <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
            <TouchableOpacity
              onPress={handleReaderBack}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                backgroundColor: "#F3F4F6",
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#3B3B3B" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 17,
                fontFamily: "PlusJakartaSans-SemiBold",
                color: "#3B3B3B",
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {title || "PDF"}
            </Text>
            {(totalPages > 0 || currentViewingPage > 0 || listenMode) && (
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "PlusJakartaSans",
                  color: "#667085",
                  textAlign: "center",
                  marginTop: 2,
                }}
              >
                {listenMode
                  ? totalPages > 0
                    ? `Chapter ${currentViewingPage} of ${totalPages}`
                    : "Audio reading"
                  : audioStartPage
                  ? `Audio starts at page ${audioStartPage}`
                  : totalPages > 0
                  ? `Page ${currentViewingPage} of ${totalPages}`
                  : `Page ${currentViewingPage}`}
              </Text>
            )}
          </View>

          <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
            <TouchableOpacity
              onPress={onHeadsetPress}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 20,
                backgroundColor: listenMode
                  ? "#256E63"
                  : audioStartPage
                  ? "#256E63"
                  : "#F3F4F6",
              }}
              activeOpacity={0.7}
              accessibilityLabel={listenMode ? "Show PDF" : "Listen to ebook"}
            >
              <Ionicons
                name={listenMode ? "book-outline" : "headset-outline"}
                size={20}
                color={listenMode || audioStartPage ? "#FFFFFF" : "#3B3B3B"}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
      {/* Render PDF Viewer */}
      {listenMode ? (
        <Suspense
          fallback={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator size="large" color="#256E63" />
            </View>
          }
        >
          <EbookReadAloud
            title={title ? decodeText(title) : undefined}
            chapters={chapters}
            totalPages={extractedTotalPages || totalPages}
            extractedPages={extractedPages}
            status={extractionStatus}
            error={extractionError}
            onRetry={retryExtraction}
            onChapterChange={setCurrentViewingPage}
            startChapterNumber={listenStartPage}
          />
        </Suspense>
      ) : (
        <View style={{ flex: 1 }}>
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: audioStartPage
                  ? "rgba(37, 110, 99, 0.12)"
                  : showDoubleTapHint
                  ? "rgba(223, 147, 14, 0.14)"
                  : "#F8FAFC",
                borderBottomWidth: 1,
                borderBottomColor: "#E5E7EB",
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "PlusJakartaSans-Medium",
                  color: audioStartPage ? "#256E63" : "#667085",
                  marginBottom: 8,
                }}
              >
                {audioStartPage
                  ? `Audio will start from page ${audioStartPage}. Tap the headset to play.`
                  : showDoubleTapHint
                  ? "The page number follows where you scroll. Tap the headset to play."
                  : "Tap or scroll to a page — the number fills in — then tap the headset."}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: "PlusJakartaSans-SemiBold",
                    color: "#256E63",
                  }}
                >
                  Page
                </Text>
                <TextInput
                  value={pageInput}
                  onChangeText={(text) => {
                    const digits = text.replace(/[^\d]/g, "");
                    setPageInput(digits);
                    setShowDoubleTapHint(false);
                  }}
                  onFocus={() => {
                    pageInputFocusedRef.current = true;
                  }}
                  onSubmitEditing={() => {
                    const n = parseTypedPage();
                    if (n != null) markAudioStartPage(n);
                    Keyboard.dismiss();
                  }}
                  onBlur={() => {
                    pageInputFocusedRef.current = false;
                    if (Date.now() - lastTapFillAtRef.current < 700) return;
                    const n = parseTypedPage();
                    if (n != null) markAudioStartPage(n);
                  }}
                  placeholder={totalPages > 0 ? `1–${totalPages}` : "e.g. 12"}
                  placeholderTextColor="#98A2B3"
                  keyboardType="number-pad"
                  returnKeyType="done"
                  maxLength={4}
                  selectTextOnFocus
                  style={{
                    minWidth: 72,
                    height: 36,
                    borderWidth: 1,
                    borderColor: "#256E63",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    textAlign: "center",
                    fontSize: 16,
                    fontFamily: "PlusJakartaSans-SemiBold",
                    color: "#1F2937",
                    backgroundColor: "#FFFFFF",
                  }}
                />
                {totalPages > 0 ? (
                  <Text
                    style={{
                      fontSize: 12,
                      fontFamily: "PlusJakartaSans-Regular",
                      color: "#667085",
                    }}
                  >
                    of {totalPages}
                  </Text>
                ) : null}
                <TouchableOpacity
                  onPress={() =>
                    markAudioStartPage(Math.max(1, (parseTypedPage() || audioStartPage || 1) - 1))
                  }
                  style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                >
                  <Text style={{ color: "#256E63", fontSize: 18 }}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    markAudioStartPage((parseTypedPage() || audioStartPage || 0) + 1)
                  }
                  style={{ paddingHorizontal: 6, paddingVertical: 4 }}
                >
                  <Text style={{ color: "#256E63", fontSize: 18 }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
        <TapGestureHandler
          ref={doubleTapRef}
          numberOfTaps={2}
          maxDelayMs={400}
          maxDeltaX={24}
          maxDeltaY={24}
          simultaneousHandlers={nativeScrollRef}
          onActivated={onNativeDoubleTap}
        >
        <TapGestureHandler
          numberOfTaps={1}
          simultaneousHandlers={[doubleTapRef, nativeScrollRef]}
          maxDeltaX={28}
          maxDeltaY={28}
          maxDurationMs={350}
          onActivated={onNativePageTap}
        >
          <NativeViewGestureHandler ref={nativeScrollRef}>
          <View style={{ flex: 1 }} collapsable={false}>
      {Platform.OS === "android" && url ? (
        // Android: Always use Google Docs viewer directly
        <View style={{ flex: 1 }}>
          <WebView
            style={{ flex: 1, backgroundColor: "#fff" }}
            source={{
              uri: fallbackUri || `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(String(url).trim())}`
            }}
            originWhitelist={["*"]}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scalesPageToFit={true}
            startInLoadingState={true}
            mixedContentMode="always"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            androidHardwareAccelerationDisabled={false}
            androidLayerType="hardware"
            cacheEnabled={true}
            cacheMode="LOAD_DEFAULT"
            ref={webViewRef}
            injectedJavaScriptBeforeContentLoaded={PDF_PAGE_TAP_SCRIPT}
            injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
            injectedJavaScriptForMainFrameOnly={false}
            onScroll={onPdfScroll}
            onMessage={handlePdfWebViewMessage}
            onLoadStart={() => {
              console.log("🌐 Android: Google Docs viewer started loading");
              setLoading(true);
            }}
            onLoadEnd={() => {
              console.log("✅ Android: Google Docs viewer loaded successfully");
              setLoading(false);
              setErrorText(null);
              markEbookFirstPage();
              reinjectPageTapScript();
            }}
            onError={(error) => {
              console.error("❌ Android WebView error:", error);
              setLoading(false);
              setErrorText("Unable to load PDF. Please check your internet connection.");
            }}
            onHttpError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.error("❌ Android WebView HTTP error:", nativeEvent);
              setLoading(false);
              if (nativeEvent.statusCode >= 400) {
                setErrorText(`Unable to load PDF (Error ${nativeEvent.statusCode})`);
              }
            }}
            injectedJavaScript={`
              (function() {
                let currentPage = 1;
                let totalPages = 100;
                
                function detectTotalPages() {
                  const pageIndicators = document.querySelectorAll('*');
                  for (const element of pageIndicators) {
                    const text = element.textContent || '';
                    if (text.includes('of ') && /\\d+\\s*of\\s*(\\d+)/.test(text)) {
                      const match = text.match(/\\d+\\s*of\\s*(\\d+)/);
                      if (match) {
                        const detectedTotal = parseInt(match[1]);
                        if (detectedTotal > 0 && detectedTotal < 10000) {
                          return detectedTotal;
                        }
                      }
                    }
                  }
                  const docHeight = document.documentElement.scrollHeight;
                  const windowHeight = window.innerHeight;
                  if (docHeight > windowHeight) {
                    const estimated = Math.ceil(docHeight / (windowHeight * 0.8));
                    return Math.min(1000, Math.max(1, estimated));
                  }
                  return 100;
                }
                
                function detectCurrentPage() {
                  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                  const documentHeight = document.documentElement.scrollHeight;
                  const windowHeight = window.innerHeight;
                  const scrollPercent = documentHeight > windowHeight ? scrollTop / (documentHeight - windowHeight) : 0;
                  return Math.max(1, Math.min(totalPages, Math.ceil(scrollPercent * totalPages)));
                }
                
                function updatePage() {
                  const newPage = detectCurrentPage();
                  if (newPage !== currentPage) {
                    currentPage = newPage;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'pageChange',
                      page: currentPage,
                      totalPages: totalPages
                    }));
                  }
                }
                
                function initializePages() {
                  const detected = detectTotalPages();
                  if (detected > 0 && detected !== totalPages) {
                    totalPages = detected;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'pageChange',
                      page: currentPage,
                      totalPages: totalPages
                    }));
                  }
                }
                
                setTimeout(initializePages, 1000);
                setTimeout(initializePages, 2500);
                setTimeout(initializePages, 5000);
                
                let scrollTimeout;
                window.addEventListener('scroll', function() {
                  clearTimeout(scrollTimeout);
                  scrollTimeout = setTimeout(updatePage, 100);
                });
                
                window.addEventListener('resize', updatePage);
                window.addEventListener('orientationchange', updatePage);
                
                setTimeout(updatePage, 1000);
                setTimeout(updatePage, 2500);
                setInterval(updatePage, 3000);

                let lastAudioTap = 0;
                document.addEventListener('click', function() {
                  const now = Date.now();
                  const page = detectCurrentPage();
                  currentPage = page;
                  if (now - lastAudioTap < 400) {
                    lastAudioTap = 0;
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'audioStartPage',
                      page: page,
                      totalPages: totalPages
                    }));
                    return;
                  }
                  lastAudioTap = now;
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'pageClick',
                    page: page,
                    totalPages: totalPages
                  }));
                }, true);
              })();
              true;
            `}
          />
        </View>
      ) : loading && !fallbackUri && !localUri ? (
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
      ) : fallbackUri || localUri ? (
        <View style={{ flex: 1 }}>
          {/* PDF Viewer - iOS or fallback */}
          {Platform.OS === "ios" && localUri ? (
            <WebView
              ref={webViewRef}
              style={{ flex: 1, backgroundColor: "#fff" }}
              source={{ uri: localUri }}
              originWhitelist={["*"]}
              allowFileAccess
              allowingReadAccessToURL={localUri}
              startInLoadingState
              javaScriptEnabled
              scalesPageToFit
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              injectedJavaScriptBeforeContentLoaded={PDF_PAGE_TAP_SCRIPT}
              injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
              injectedJavaScriptForMainFrameOnly={false}
              onScroll={onPdfScroll}
              onMessage={handlePdfWebViewMessage}
              injectedJavaScript={`
            (function() {
              let lastTap = 0;
              let currentPage = 1;
              let totalPages = 100; // Fallback, will try to detect actual count
                  let pageTextCache = {}; // Cache extracted text per page
                  
                  // Extract text from visible PDF content - comprehensive extraction
                  function extractVisibleText() {
                    try {
                      let extractedText = '';
                      
                      // Method 1: Try to get text from PDF.js text layer (most reliable)
                      const textLayers = document.querySelectorAll('.textLayer, .textLayer > span, .textLayer div');
                      if (textLayers.length > 0) {
                        const textArray = Array.from(textLayers).map(el => {
                          const text = el.textContent || el.innerText || '';
                          return text.trim();
                        }).filter(text => text.length > 0 && text.length < 1000);
                        
                        if (textArray.length > 0) {
                          extractedText = textArray.join(' ').trim();
                          console.log('📄 Extracted from PDF.js text layer:', extractedText.length, 'chars');
                          if (extractedText.length > 50) return extractedText;
                        }
                      }
                      
                      // Method 2: Try to get all text content from the page
                      const allTextElements = document.querySelectorAll('body, .page, canvas, iframe');
                      for (const el of allTextElements) {
                        try {
                          const text = el.textContent || el.innerText || el.innerHTML || '';
                          const cleaned = text.replace(/<[^>]*>/g, ' ').trim();
                          if (cleaned.length > 100) {
                            extractedText = cleaned;
                            console.log('📄 Extracted from body/page element:', extractedText.length, 'chars');
                            break;
                          }
                        } catch (e) {}
                      }
                      
                      // Method 3: Try document body text
                      if (!extractedText || extractedText.length < 50) {
                        const bodyText = document.body.textContent || document.body.innerText || '';
                        const cleaned = bodyText.trim();
                        if (cleaned.length > 100) {
                          extractedText = cleaned;
                          console.log('📄 Extracted from body:', extractedText.length, 'chars');
                        }
                      }
                      
                      // Method 4: Try iframe content (for Google Docs viewer)
                      if (!extractedText || extractedText.length < 50) {
                        const iframes = document.querySelectorAll('iframe');
                        for (const iframe of iframes) {
                          try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            if (iframeDoc) {
                              const iframeText = iframeDoc.body.textContent || iframeDoc.body.innerText || '';
                              if (iframeText.trim().length > 100) {
                                extractedText = iframeText.trim();
                                console.log('📄 Extracted from iframe:', extractedText.length, 'chars');
                                break;
                              }
                            }
                          } catch (e) {
                            // Cross-origin iframe, skip
                          }
                        }
                      }
                      
                      return extractedText.length > 0 ? extractedText : null;
                    } catch (e) {
                      console.error('Text extraction error:', e);
                      return null;
                    }
                  }
              
              // Try to detect total pages from PDF
              function detectTotalPages() {
                // Look for page indicators or navigation elements
                const pageIndicators = document.querySelectorAll('[aria-label*="page"], [title*="page"], .page-indicator, .page-count');
                for (const indicator of pageIndicators) {
                  const text = indicator.textContent || indicator.getAttribute('aria-label') || indicator.getAttribute('title') || '';
                  const match = text.match(/of\\s+(\\d+)|\\/(\\d+)|total\\s+(\\d+)/i);
                  if (match) {
                    const detectedTotal = parseInt(match[1] || match[2] || match[3]);
                    if (detectedTotal > 0 && detectedTotal < 10000) {
                      return detectedTotal;
                    }
                  }
                }
                
                // Fallback: estimate based on document height and viewport
                const docHeight = document.documentElement.scrollHeight;
                const windowHeight = window.innerHeight;
                if (docHeight > windowHeight) {
                  const estimated = Math.ceil(docHeight / windowHeight);
                  return Math.min(1000, Math.max(1, estimated)); // Cap between 1-1000
                }
                
                return 100; // Final fallback
              }
              
              // Initialize total pages
              setTimeout(() => {
                totalPages = detectTotalPages();
                console.log('📄 Detected total pages:', totalPages);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'pageChange',
                  page: currentPage,
                  totalPages: totalPages
                }));
              }, 1500);
              
              // Better page detection for PDF viewers
              function detectCurrentPage() {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const documentHeight = document.documentElement.scrollHeight;
                const windowHeight = window.innerHeight;
                
                console.log('📄 iOS Detection - scrollTop:', scrollTop, 'docHeight:', documentHeight, 'windowHeight:', windowHeight);
                
                // Calculate page based on scroll percentage
                if (documentHeight <= windowHeight) {
                  return 1; // Single page or no scrolling
                }
                
                const scrollPercent = scrollTop / (documentHeight - windowHeight);
                const calculatedPage = Math.max(1, Math.min(totalPages, Math.ceil(scrollPercent * totalPages)));
                
                console.log('📄 iOS calculated page:', calculatedPage, 'from scroll %:', scrollPercent);
                
                return calculatedPage;
              }
              
              // Update page on scroll
              function updatePage() {
                const newPage = detectCurrentPage();
                if (newPage !== currentPage) {
                  currentPage = newPage;
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'pageChange',
                    page: currentPage,
                    totalPages: totalPages
                  }));
                }
              }
              
              // Listen for scroll events with more aggressive detection
              let scrollTimeout;
              window.addEventListener('scroll', function() {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                console.log('📄 iOS scroll event detected - scrollTop:', scrollTop);
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(updatePage, 50); // Faster response
              });
              
              // Also listen for other events that might indicate page changes
              window.addEventListener('resize', updatePage);
              window.addEventListener('orientationchange', updatePage);
              
              // More frequent initial checks
              setTimeout(updatePage, 500);
              setTimeout(updatePage, 1500);
              setTimeout(updatePage, 3000);
              
              // Periodic updates every 2 seconds
              setInterval(updatePage, 2000);
              
                  // Enhanced click handling with text extraction - ONLY on explicit tap
                  let touchStartTime = 0;
                  let touchStartY = 0;
                  
                  function handlePageClick(e) {
                    const now = Date.now();
                    const pointY = e.changedTouches && e.changedTouches[0]
                      ? e.changedTouches[0].clientY
                      : e.clientY;
                    const moved = touchStartY && pointY != null && Math.abs(pointY - touchStartY) > 18;
                    if (moved) {
                      console.log('🚫 Ignoring scroll gesture, not a tap');
                      return;
                    }

                    const clickPage = detectCurrentPage();
                    if (now - lastTap < 400) {
                      lastTap = 0;
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'audioStartPage',
                        page: clickPage,
                        totalPages: totalPages
                      }));
                      return;
                    }
                    lastTap = now;
                    console.log('👆 TAP detected - page:', clickPage, 'clickY:', e.clientY);
                    
                    // Extract text from visible content
                    const extractedText = extractVisibleText();
                    console.log('📝 Extracted text length:', extractedText ? extractedText.length : 0);
                    
                    // Cache the text for this page
                    if (extractedText) {
                      pageTextCache[clickPage] = extractedText;
                      console.log('💾 Cached text for page', clickPage);
                    }
                    
                    // Send click message with extracted text
                    try {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'pageClick',
                        page: clickPage,
                        totalPages: totalPages,
                        clickX: e.clientX,
                        clickY: e.clientY,
                        scrollTop: window.pageYOffset || document.documentElement.scrollTop,
                        timestamp: now,
                        extractedText: extractedText || null
                      }));
                    } catch (error) {
                      console.error('Error sending click message:', error);
                    }
                  }
                  
                  // Track touch start to detect scrolls vs taps
                  document.addEventListener('touchstart', function(e) {
                    touchStartTime = Date.now();
                    touchStartY = e.touches[0].clientY;
                  }, true);
                  
                  // Only trigger on explicit tap/click, not scroll
                  document.addEventListener('click', handlePageClick, true);
                  document.addEventListener('touchend', function(e) {
                    const touchDuration = Date.now() - touchStartTime;
                    const touchEndY = e.changedTouches[0].clientY;
                    const movement = Math.abs(touchEndY - touchStartY);
                    
                    // Only treat as tap if quick (< 200ms) and minimal movement
                    if (touchDuration < 200 && movement < 10) {
                      setTimeout(() => handlePageClick(e), 50);
                    }
                  }, true);
            })();
            true;
          `}
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
              onLoadEnd={() => {
                console.log("✅ PDF WebView loaded successfully");
                setLoading(false);
                markEbookFirstPage();
                reinjectPageTapScript();
              }}
              onError={(error) => {
                console.error("❌ PDF WebView error on iOS:", error);
                // If local file fails to load, switch to Google Docs viewer
                if (url) {
                  const docsUri = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
                    String(url)
                  )}`;
                  console.log("🔄 Switching to Google Docs viewer due to WebView error");
                  setLocalUri(null);
                  setFallbackUri(docsUri);
                } else {
                  setErrorText("Unable to load PDF");
                }
              }}
            />
          ) : fallbackUri ? (
            <WebView
              ref={webViewRef}
              style={{ flex: 1, backgroundColor: "#fff" }}
              source={{ uri: fallbackUri }}
              injectedJavaScriptBeforeContentLoaded={PDF_PAGE_TAP_SCRIPT}
              injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
              injectedJavaScriptForMainFrameOnly={false}
              onScroll={onPdfScroll}
              originWhitelist={["*"]}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              scalesPageToFit={true}
              startInLoadingState={true}
              mixedContentMode="always"
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              androidHardwareAccelerationDisabled={false}
              androidLayerType="hardware"
              cacheEnabled={true}
              cacheMode="LOAD_DEFAULT"
              onMessage={handlePdfWebViewMessage}
              injectedJavaScript={`
            (function() {
              let lastTap = 0;
              let currentPage = 1;
              let totalPages = 100; // Fallback, will try to detect actual count
              
              // Try to detect total pages from Google Docs viewer
              function detectTotalPages() {
                // Google Docs viewer often shows page count
                const pageIndicators = document.querySelectorAll('*');
                for (const element of pageIndicators) {
                  const text = element.textContent || '';
                  if (text.includes('of ') && /\\d+\\s*of\\s*(\\d+)/.test(text)) {
                    const match = text.match(/\\d+\\s*of\\s*(\\d+)/);
                    if (match) {
                      const detectedTotal = parseInt(match[1]);
                      if (detectedTotal > 0 && detectedTotal < 10000) {
                        return detectedTotal;
                      }
                    }
                  }
                }
                
                // Fallback: estimate based on document height
                const docHeight = document.documentElement.scrollHeight;
                const windowHeight = window.innerHeight;
                if (docHeight > windowHeight) {
                  const estimated = Math.ceil(docHeight / (windowHeight * 0.8)); // Assume each page is ~80% of viewport
                  return Math.min(1000, Math.max(1, estimated));
                }
                
                return 100; // Final fallback
              }
              
              // Initialize total pages - try multiple times as Google Docs viewer loads
              function initializePages() {
                const detected = detectTotalPages();
                if (detected > 0 && detected !== totalPages) {
                  totalPages = detected;
                console.log('📄 Detected total pages (fallback viewer):', totalPages);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'pageChange',
                  page: currentPage,
                  totalPages: totalPages
                }));
                }
              }
              
              // Try multiple times as the viewer loads
              setTimeout(initializePages, 1000);
              setTimeout(initializePages, 2500);
              setTimeout(initializePages, 5000);
              setTimeout(initializePages, 8000);
              
              // Better page detection for Google Docs viewer
              function detectCurrentPage() {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const documentHeight = document.documentElement.scrollHeight;
                const windowHeight = window.innerHeight;
                
                // More accurate calculation for Google Docs viewer
                const scrollPercent = documentHeight > windowHeight ? scrollTop / (documentHeight - windowHeight) : 0;
                const calculatedPage = Math.max(1, Math.min(totalPages, Math.ceil(scrollPercent * totalPages)));
                
                return calculatedPage;
              }
              
              // Update page on scroll
              function updatePage() {
                const newPage = detectCurrentPage();
                if (newPage !== currentPage) {
                  currentPage = newPage;
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'pageChange',
                    page: currentPage,
                    totalPages: totalPages
                  }));
                }
              }
              
              // Listen for scroll events with more aggressive detection
              let scrollTimeout;
              window.addEventListener('scroll', function() {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                console.log('📄 Fallback scroll event detected - scrollTop:', scrollTop);
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(updatePage, 100); // Faster response
              });
              
              // Also listen for other events
              window.addEventListener('resize', updatePage);
              window.addEventListener('orientationchange', updatePage);
              
              // More frequent initial checks for Google Docs viewer
              setTimeout(updatePage, 1000);
              setTimeout(updatePage, 2500);
              setTimeout(updatePage, 4000);
              
              // Periodic updates every 3 seconds for fallback viewer
              setInterval(updatePage, 3000);
              
                  // Enhanced click handling for fallback viewer - ONLY on explicit tap
                  let touchStartTime = 0;
                  let touchStartY = 0;
                  
                  function handlePageClick(e) {
                    const now = Date.now();
                    const pointY = e.changedTouches && e.changedTouches[0]
                      ? e.changedTouches[0].clientY
                      : e.clientY;
                    const moved = touchStartY && pointY != null && Math.abs(pointY - touchStartY) > 18;
                    if (moved) {
                      console.log('🚫 Ignoring scroll gesture (fallback), not a tap');
                      return;
                    }

                    const clickPage = detectCurrentPage();
                    if (now - lastTap < 400) {
                      lastTap = 0;
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'audioStartPage',
                        page: clickPage,
                        totalPages: totalPages
                      }));
                      return;
                    }
                    lastTap = now;
                    console.log('👆 TAP detected (fallback) - page:', clickPage, 'clickY:', e.clientY);
                    
                    // Send click message immediately
                    try {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'pageClick', 
                        page: clickPage,
                        totalPages: totalPages,
                        clickX: e.clientX,
                        clickY: e.clientY,
                        scrollTop: window.pageYOffset || document.documentElement.scrollTop,
                        timestamp: now
                      }));
                    } catch (error) {
                      console.error('Error sending fallback click message:', error);
                    }
                  }
                  
                  // Track touch start to detect scrolls vs taps
                  document.addEventListener('touchstart', function(e) {
                    touchStartTime = Date.now();
                    touchStartY = e.touches[0].clientY;
                  }, true);
                  
                  // Only trigger on explicit tap/click, not scroll
                  document.addEventListener('click', handlePageClick, true);
                  document.addEventListener('touchend', function(e) {
                    const touchDuration = Date.now() - touchStartTime;
                    const touchEndY = e.changedTouches[0].clientY;
                    const movement = Math.abs(touchEndY - touchStartY);
                    
                    // Only treat as tap if quick (< 200ms) and minimal movement
                    if (touchDuration < 200 && movement < 10) {
                      setTimeout(() => handlePageClick(e), 50);
                    }
                  }, true);
            })();
            true;
          `}
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
              onLoadStart={() => {
                console.log("🌐 Google Docs viewer started loading");
                setLoading(true);
              }}
              onLoadEnd={() => {
                console.log("✅ Google Docs viewer loaded successfully");
                setLoading(false);
                setErrorText(null);
                markEbookFirstPage();
                reinjectPageTapScript();
              }}
              onError={(error) => {
                console.error("❌ Fallback WebView error:", error);
                setLoading(false);
                setErrorText("Unable to load PDF. Please check your internet connection.");
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error("❌ Fallback WebView HTTP error:", nativeEvent);
                setLoading(false);
                if (nativeEvent.statusCode >= 400) {
                  setErrorText(`Unable to load PDF (Error ${nativeEvent.statusCode})`);
                } else {
                  setErrorText("Unable to load PDF. Please check your internet connection.");
                }
              }}
              onShouldStartLoadWithRequest={(request) => {
                // Allow navigation within Google Docs viewer
                console.log("🔗 WebView navigation request:", request.url.substring(0, 100));
                return true;
              }}
            />
          ) : null}
        </View>
      ) : (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: "#666", textAlign: "center", paddingHorizontal: 20 }}>
            {errorText || "Unable to open document"}
          </Text>
          {url && (
            <TouchableOpacity
              onPress={() => {
                // Retry with Google Docs viewer
                const docsUri = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
                  String(url)
                )}`;
                console.log("🔄 Retrying with Google Docs viewer");
                setFallbackUri(docsUri);
                setErrorText(null);
              }}
              style={{
                marginTop: 16,
                paddingHorizontal: 20,
                paddingVertical: 10,
                backgroundColor: "#090E24",
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontFamily: "PlusJakartaSans-SemiBold" }}>
                Retry with Online Viewer
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
          </View>
          </NativeViewGestureHandler>
        </TapGestureHandler>
        </TapGestureHandler>
        </View>
      )}

      {listenMode ? (
        <Suspense fallback={null}>
          <PdfJsExtractorWebView
            enabled
            pdfBase64={pdfBase64}
            onMessage={handleExtractorMessage}
          />
        </Suspense>
      ) : null}
    </View>
  );
}
