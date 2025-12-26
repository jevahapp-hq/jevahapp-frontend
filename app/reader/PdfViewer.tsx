import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    StatusBar,
    Text,
    View,
    TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { ExtractionResult, pdfExtractor } from "../services/PdfTextExtractor";
import EbookTtsPlayer from "../components/EbookTtsPlayer";

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
  } = useLocalSearchParams<{
    url?: string;
    ebookId?: string;
    title?: string;
    desc?: string;
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
    });
  }, [rawUrl, decodedUrl, url, ebookId, title]);

  // On Android, start with loading false and prepare fallback immediately
  const [loading, setLoading] = useState(Platform.OS !== "android");
  const [progress, setProgress] = useState(0);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [fallbackUri, setFallbackUri] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [extractionReady, setExtractionReady] = useState(false);
  const [pageTexts, setPageTexts] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentViewingPage, setCurrentViewingPage] = useState<number>(1);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [extractionAttempted, setExtractionAttempted] = useState(false);


  // Comprehensive text extraction with multiple methods
  const attemptComprehensiveExtraction = useCallback(async () => {
    if (extractionAttempted || !url) return;
    
    console.log('🔄 Starting comprehensive PDF text extraction...');
    setExtractionAttempted(true);
    
    try {
      const result = await pdfExtractor.extractText({
        url: url,
        localPath: localUri || undefined,
        enableServerFallback: true,
        enableOCR: true,
        timeoutMs: 15000, // 15 second timeout
      });
      
      console.log(`✅ Extraction completed using: ${result.method}`);
      console.log(`📄 Extracted ${result.pages.length} pages of content`);
      
      setExtractionResult(result);
      
      if (result.success && result.pages.length > 0) {
        setPageTexts(result.pages);
        if (result.totalPages > 0) {
          setTotalPages(result.totalPages);
          console.log(`📚 Set total pages from extraction: ${result.totalPages}`);
        }
      } else {
        console.log('⚠️ All extraction methods failed');
      }
    } catch (error) {
      console.error('❌ Comprehensive extraction failed:', error);
      setExtractionResult({
        success: false,
        method: 'Failed',
        pages: [],
        totalPages: 0,
        error: String(error)
      });
    }
  }, [extractionAttempted, url, localUri]);



  // Trigger comprehensive extraction when document is loaded
  useEffect(() => {
    if ((localUri || fallbackUri) && !extractionAttempted && !loading) {
      console.log('📚 Document loaded - starting comprehensive extraction...');
      // Small delay to ensure document is fully loaded
      setTimeout(() => {
        attemptComprehensiveExtraction();
      }, 2000);
    }
  }, [localUri, fallbackUri, extractionAttempted, loading, attemptComprehensiveExtraction]);

  // Debug page changes
  useEffect(() => {
    console.log(`📄 Page viewing changed to: ${currentViewingPage}/${totalPages}`);
  }, [currentViewingPage, totalPages]);

  const cachePath = useMemo(() => {
    const safe = encodeURIComponent(String(url || ""));
    return `${FileSystem.cacheDirectory}pdf-cache/${safe}.pdf`;
  }, [url]);

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
        return; // Exit early, don't run download logic
      }
    }
    
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
              onPress={() => {
                const isLocalFile =
                  typeof url === "string" &&
                  (url.startsWith("file://") ||
                    url.startsWith(FileSystem.documentDirectory || ""));
                if (isLocalFile) {
                  router.replace("/downloads/DownloadsScreen");
                } else {
                  router.back();
                }
              }}
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
                fontFamily: "Rubik-SemiBold",
                color: "#3B3B3B",
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {title || "PDF"}
            </Text>
            {(totalPages > 0 || currentViewingPage > 0) && (
              <Text
                style={{
                  fontSize: 12,
                  fontFamily: "Rubik",
                  color: "#667085",
                  textAlign: "center",
                  marginTop: 2,
                }}
              >
                {totalPages > 0 
                  ? `Page ${currentViewingPage} of ${totalPages}`
                  : `Page ${currentViewingPage}`}
              </Text>
            )}
          </View>

          <View style={{ width: 40, height: 40 }} />
        </View>
      </SafeAreaView>
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
      ) : fallbackUri || localUri ? (
        <View style={{ flex: 1 }}>
          {/* PDF Viewer - Always visible */}
          {/* On iOS, try localUri first, but fall back to Google Docs viewer if download failed */}
          {/* On Android, always use fallbackUri (Google Docs viewer) */}
          {Platform.OS === "ios" && localUri ? (
            <WebView
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
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data || "{}");
                  console.log(`📨 Received message:`, data);
                  
              if (data.type === "pageChange") {
                const pageNumber = data.page || 1;
                const total = data.totalPages || 102;
                setCurrentViewingPage(pageNumber);
                setTotalPages(total);
                console.log(`📄 Page changed to ${pageNumber}/${total}`);
              } else if (data.type === "pageUpdate") {
                const pageNumber = data.page || 1;
                const total = data.totalPages || 102;
                setCurrentViewingPage(pageNumber);
                setTotalPages(total);
                console.log(`📄 Page update to ${pageNumber}/${total}`);
              }
            } catch (e) {}
          }}
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
                    // Only process explicit taps, not scrolls
                    const now = Date.now();
                    if (now - lastTap < 300) return; // Prevent double-tap
                    
                    // Check if this was a scroll gesture (movement > 10px)
                    const isScroll = Math.abs(e.clientY - touchStartY) > 10;
                    if (isScroll) {
                      console.log('🚫 Ignoring scroll gesture, not a tap');
                      return;
                    }
                    
                    lastTap = now;
                    
                    const clickPage = detectCurrentPage();
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
          style={{ flex: 1, backgroundColor: "#fff" }}
          source={{ uri: fallbackUri }}
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
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data || "{}");
              console.log(`📨 Received fallback message:`, data);
              
              if (data.type === "pageChange") {
                const pageNumber = data.page || 1;
                const total = data.totalPages || 0;
                console.log(`📄 Page changed to ${pageNumber}/${total}`);
                setCurrentViewingPage(pageNumber);
                if (total > 0) {
                  setTotalPages(total);
                }
              } else if (data.type === "pageUpdate") {
                const pageNumber = data.page || 1;
                const total = data.totalPages || 0;
                console.log(`📄 Page update to ${pageNumber}/${total}`);
                setCurrentViewingPage(pageNumber);
                if (total > 0) {
                  setTotalPages(total);
                }
              }
            } catch (e) {
              console.error("❌ Error parsing WebView message:", e);
            }
          }}
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
                    // Only process explicit taps, not scrolls
                    const now = Date.now();
                    if (now - lastTap < 300) return; // Prevent double-tap
                    
                    // Check if this was a scroll gesture (movement > 10px)
                    const isScroll = Math.abs(e.clientY - touchStartY) > 10;
                    if (isScroll) {
                      console.log('🚫 Ignoring scroll gesture (fallback), not a tap');
                      return;
                    }
                    
                    lastTap = now;
                    
                    const clickPage = detectCurrentPage();
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
              <Text style={{ color: "#fff", fontFamily: "Rubik-SemiBold" }}>
                Retry with Online Viewer
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Ebook backend narration (TTS audio) */}
      {ebookId ? (
        <EbookTtsPlayer
          ebookId={ebookId}
          title={title ? `Listen • ${title}` : "Listen"}
          autoGenerate={true}
        />
      ) : null}

      {/* Removed hidden extraction WebView to avoid any overlay */}
    </View>
  );
}
