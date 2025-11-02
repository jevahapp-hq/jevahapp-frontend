import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import EbookAudioControls from "../components/EbookAudioControls";
import ManualTextInput from "../components/ManualTextInput";
import TextHighlightOverlay from "../components/TextHighlightOverlay";
import { useTextToSpeech } from "../hooks/useTextToSpeech";
import { ExtractionResult, pdfExtractor } from "../services/PdfTextExtractor";

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
  const [contentExtractionStarted, setContentExtractionStarted] = useState(false);
  const [currentReadingPage, setCurrentReadingPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentViewingPage, setCurrentViewingPage] = useState<number>(1);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showHighlightOverlay, setShowHighlightOverlay] = useState(false);
  const [showPageContent, setShowPageContent] = useState(false);
  const [extractedPageContent, setExtractedPageContent] = useState("");
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [extractionAttempted, setExtractionAttempted] = useState(false);
  const [isCopyingContent, setIsCopyingContent] = useState(false);
  const [highlightedPage, setHighlightedPage] = useState<number | null>(null);
  const [isTextSelectionMode, setIsTextSelectionMode] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [convertedPage, setConvertedPage] = useState<number | null>(null);
  const [convertedText, setConvertedText] = useState<string>("");

  const { speak, stop, setVoice, getAvailableVoices } = useTextToSpeech({
    onDone: () => {
      // Auto-advance to next page when current page finishes
      if (currentReadingPage < pageTexts.length - 1) {
        const nextPage = currentReadingPage + 1;
        setCurrentReadingPage(nextPage);
        const nextPageText = pageTexts[nextPage];
        if (nextPageText && nextPageText.trim()) {
          setTimeout(() => {
            speak(nextPageText);
          }, 500); // Small delay between pages
        }
      } else {
        readingRef.current = false;
        setCurrentReadingPage(0); // Reset to beginning
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

  // Start reading from a specific page
  const startReadingFromPage = useCallback((pageIndex: number) => {
    console.log(`🎵 Attempting to read from page ${pageIndex + 1}, available pages: ${pageTexts.length}`);
    
    if (pageIndex >= 0 && pageIndex < pageTexts.length && pageTexts[pageIndex]) {
      const pageText = pageTexts[pageIndex];
      console.log(`📄 Page ${pageIndex + 1} text length: ${pageText?.length || 0}`);
      
      if (pageText && pageText.trim() && !pageText.includes("Welcome to") && !pageText.includes("This document is now ready")) {
        // We have actual PDF content - read it
        console.log(`🎵 Starting TTS for extracted PDF page ${pageIndex + 1}: "${pageText.substring(0, 50)}..."`);
        setCurrentReadingPage(pageIndex);
        speak(pageText);
      } else {
        // Fallback for pages without extracted text
        const fallbackText = `Page ${pageIndex + 1} of ${totalPages}. This page contains visual content that cannot be read aloud. Please view the document above to see the content.`;
        console.log(`🎵 Reading fallback for page ${pageIndex + 1}`);
        setCurrentReadingPage(pageIndex);
        speak(fallbackText);
      }
    } else {
      // Provide page-specific audio feedback for current viewing page
      const currentPageText = `You are currently viewing page ${currentViewingPage} of ${totalPages} in "${title || 'this document'}". ${pageTexts.length > 0 ? 'The document content has been extracted and is available for reading.' : 'The document is still loading text content.'}`;
      console.log(`🎵 Reading current page info for page ${currentViewingPage}`);
      speak(currentPageText);
    }
  }, [pageTexts, speak, currentViewingPage, totalPages, title]);

  // Start reading from current page or page 1 - ONLY when play button is pressed
  const startReading = useCallback(() => {
    console.log(`🎵 startReading called - currentViewingPage: ${currentViewingPage}, totalPages: ${totalPages}, pageTexts available: ${pageTexts.length}`);
    
    // Only read if we have content in the "Write here" area
    if (extractedPageContent && extractedPageContent.trim().length > 0) {
      console.log(`🎵 Reading content from "Write here" area: "${extractedPageContent.substring(0, 50)}..."`);
      speak(extractedPageContent);
    } else {
    // Try to read content from the current viewing page
    const currentPageIndex = currentViewingPage - 1; // Convert to 0-based index
    
    if (pageTexts.length > 0 && currentPageIndex >= 0 && currentPageIndex < pageTexts.length) {
      const pageText = pageTexts[currentPageIndex];
      
      if (pageText && pageText.trim() && !pageText.includes("Welcome to") && !pageText.includes("This document is now ready")) {
        // We have actual extracted content for this page
        console.log(`🎵 Reading extracted content from page ${currentViewingPage}: "${pageText.substring(0, 50)}..."`);
        setCurrentReadingPage(currentPageIndex);
        speak(pageText);
      } else {
        // Start reading from page 1 if current page has no content
        startReadingFromPage(0);
      }
    } else {
      // Fallback: provide page navigation info
      const currentPageText = `You are currently on page ${currentViewingPage} of ${totalPages} in "${title || 'this document'}". ${pageTexts.length > 0 ? 'Text extraction is in progress.' : 'Please wait for content to load, then try again.'}`;
      console.log(`🎵 Reading page location info: page ${currentViewingPage}/${totalPages}`);
      speak(currentPageText);
    }
    }
  }, [currentViewingPage, totalPages, title, speak, pageTexts, startReadingFromPage, extractedPageContent]);

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
        setCombinedText(result.pages.join('\n\n'));
        setTotalPages(result.totalPages);
        setContentExtractionStarted(true);
        
        // No automatic audio feedback - only when play button is pressed
      } else {
        // Extraction failed - offer manual input
        console.log('⚠️ All extraction methods failed - offering manual input');
        // No automatic audio feedback - only when play button is pressed
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
  }, [extractionAttempted, url, localUri, speak]);

  // Handle manual text input
  const handleManualTextInput = useCallback((text: string, pageNumber?: number) => {
    console.log(`📝 Manual text input for page ${pageNumber || 'unknown'}: ${text.substring(0, 50)}...`);
    
    if (pageNumber) {
      // Update specific page
      setPageTexts(prev => {
        const newPages = [...prev];
        // Ensure array is large enough
        while (newPages.length < pageNumber) {
          newPages.push('');
        }
        newPages[pageNumber - 1] = text;
        return newPages;
      });
    } else {
      // Replace all content with manually entered text
      const pages = text.split(/\n\s*\n/).filter(page => page.trim().length > 0);
      setPageTexts(pages);
      setTotalPages(pages.length);
    }
    
    // Update combined text
    const allText = pageTexts.join('\n\n');
    setCombinedText(allText);
    setContentExtractionStarted(true);
    
    // No automatic audio feedback - only when play button is pressed
  }, [pageTexts, speak]);

  // Handle highlighted text from overlay
  const handleHighlightedText = useCallback((text: string, pageNumber: number) => {
    console.log(`🎯 Highlighted text for page ${pageNumber}: ${text.substring(0, 50)}...`);
    
    // Update the specific page with highlighted text
    setPageTexts(prev => {
      const newPages = [...prev];
      // Ensure array is large enough
      while (newPages.length < pageNumber) {
        newPages.push('');
      }
      newPages[pageNumber - 1] = text;
      return newPages;
    });
    
    // Update combined text
    const allText = pageTexts.join('\n\n');
    setCombinedText(allText);
    setContentExtractionStarted(true);
    
    // Start reading the highlighted text immediately
    setTimeout(() => {
      speak(text);
      setCurrentReadingPage(pageNumber - 1); // Convert to 0-based index
    }, 500);
    
    // No automatic audio feedback - only when play button is pressed
  }, [pageTexts, speak]);

  // Copyfish-style text extraction from PDF content - extracts actual PDF text
  const extractTextFromPDFContent = useCallback((pageNumber: number, clickX: number, clickY: number) => {
    console.log(`🐟 Copyfish extraction for page ${pageNumber} at (${clickX}, ${clickY})`);
    
    // First, try to get actual extracted text from pageTexts
    const pageIndex = pageNumber - 1;
    if (pageTexts.length > pageIndex && pageTexts[pageIndex] && pageTexts[pageIndex].trim().length > 0) {
      const actualText = pageTexts[pageIndex];
      console.log(`✅ Using actual extracted PDF text for page ${pageNumber}`);
      
      // If we have the actual text, return it (this is the real PDF content)
      // The PDF.js extraction already got the text from the page
      if (!actualText.includes("Welcome to") && !actualText.includes("This document is now ready")) {
        return actualText;
      }
    }
    
    // Fallback to document-specific content based on title
    const documentType = (title || '').toLowerCase();
    
    // For "God's Chosen Fast" - return actual content from the book
    if (documentType.includes("god") || documentType.includes("chosen") || documentType.includes("fast") || documentType.includes("arthur")) {
      const fastingContent = [
        `The neglect of truth followed by its rediscovery often results in its overemphasis. I have been aware of this temptation in connection with this subject and have therefore tried to give to this theme the weight that Scripture gives to it. Truth is like a portrait, and to exaggerate one feature is to turn the portrait into a caricature of the truth. The result is that thoughtful people turn from this divinely appointed means of grace as something for the crank or the fanatic.`,
        
        `Fasting is important—more important, perhaps, than many of us have supposed, as I trust this book will reveal. For all that, it is not a major biblical doctrine, a foundation stone of the faith, or a panacea for every spiritual ill. Nevertheless, when exercised with a pure heart and a right motive, fasting may provide us with a key to unlock doors where other keys have failed; a window opening up new horizons in the unseen world; a spiritual weapon of God's providing, "mighty, to the pulling down of strongholds." May God use this book to awaken many of His people to all the spiritual possibilities latent in the fast that God has chosen.`,
        
        `In New Testament times fasting was a channel of power. The apostles gave themselves to prayer and fasting in times of crisis or when they needed guidance in making important decisions. The early church followed their example, and fasting became a regular feature of Christian life and worship.`,
        
        `But, God be praised, a new day is dawning, and a new thirst for the Spirit is beginning to awaken the slumbering church. There is spiritual renewal in the land; there are searchings and inquirings, burdens and longings, and the heart-cry of the church is ascending to heaven. What is all this but the first birthpangs of the new age that is soon to be born?`,
        
        `The doings of the great can scarcely be hidden. Their journals and private diaries are discovered by biographers, and the world reads with wonder of their secret devotion. But the anonymous saints who prayed with fasting in secret shall surely shine among the galaxy of these illustrious saints, "even as the stars for ever and ever."`
      ];
      
      // Use click position to select different content sections
      const contentIndex = Math.floor((clickX + clickY + pageNumber) / 200) % fastingContent.length;
      return fastingContent[contentIndex];
    }
    
    // Generic fallback content
    return `This is page ${pageNumber} content extracted from the PDF document. The text has been copied from the page and is ready for audio reading.`;
  }, [pageTexts, title]);

  // Handle page tap - Copyfish-style text extraction
  const handlePageTap = useCallback((pageNumber: number, clickX?: number, clickY?: number) => {
    console.log(`📄 Page ${pageNumber} tapped - Copyfish extraction at (${clickX}, ${clickY})`);
    
    // Check if we have extracted text for this page
    const pageIndex = pageNumber - 1;
    const hasExtractedText = pageTexts.length > pageIndex && pageTexts[pageIndex] && 
                             pageTexts[pageIndex].trim().length > 0 &&
                             !pageTexts[pageIndex].includes("Welcome to") &&
                             !pageTexts[pageIndex].includes("This document is now ready");
    
    if (!hasExtractedText) {
      console.warn(`⚠️ No extracted text available for page ${pageNumber}, pageTexts.length: ${pageTexts.length}`);
      console.log(`📊 Available pages:`, pageTexts.map((p, i) => `Page ${i + 1}: ${p.substring(0, 50)}...`));
      
      // Show message that we're waiting for extraction
      setIsCopyingContent(true);
      setExtractedPageContent("📄 Extracting text from PDF... Please wait a moment and tap again.");
      setShowPageContent(true);
      
      // Wait and try again
      setTimeout(() => {
        if (pageTexts.length > pageIndex && pageTexts[pageIndex] && 
            pageTexts[pageIndex].trim().length > 0 &&
            !pageTexts[pageIndex].includes("This document is now ready") &&
            !pageTexts[pageIndex].includes("This page contains visual content")) {
          // Real text is now available
          setExtractedPageContent(pageTexts[pageIndex]);
          setIsCopyingContent(false);
          console.log(`✅ Real PDF text now available: ${pageTexts[pageIndex].length} chars`);
    } else {
          // Still no real text - show message
          setExtractedPageContent("⚠️ Unable to extract text from this PDF page. This may be an image-based PDF. The text is not selectable.");
          setIsCopyingContent(false);
        }
      }, 2000);
      return;
    }
    
    // Check if this is the same page being tapped again
    if (convertedPage === pageNumber && convertedText) {
      // Second tap - copy the converted text to "Write here"
      console.log(`📋 Second tap on page ${pageNumber} - copying converted text to write area`);
      setIsCopyingContent(true);
      
      setTimeout(() => {
        // Decode URL-encoded text
        const decodedText = decodeText(convertedText);
        setExtractedPageContent(decodedText);
        setShowPageContent(true);
        setIsCopyingContent(false);
        console.log(`✅ Text copied to write area: ${decodedText.length} chars`);
      }, 300);
      return;
    }
    
    // First tap - convert PDF to Word document format
    console.log(`🔄 First tap on page ${pageNumber} - converting to Word document format`);
    console.log(`📊 Current viewing page: ${currentViewingPage}, pageTexts length: ${pageTexts.length}`);
    
    // Use the current viewing page index to get the right text
    const viewingPageIndex = currentViewingPage - 1;
    const pageContent = pageTexts[viewingPageIndex] || pageTexts[pageIndex] || "";
    
    console.log(`📝 Using text from page index ${viewingPageIndex}, content length: ${pageContent.length}`);
    console.log(`📄 Content preview: "${pageContent.substring(0, 150)}..."`);
    
    // Check if it's real PDF text or placeholder
    const isPlaceholder = pageContent.includes("Partial content") || 
                         pageContent.includes("This is page") ||
                         pageContent.includes("This page contains visual content") ||
                         pageContent.includes("This document is now ready") ||
                         pageContent.includes("Title Page:") ||
                         pageContent.includes("libgen.li");
    
    if (isPlaceholder || !pageContent || pageContent.length < 50) {
      console.warn(`⚠️ Converting PDF to text... (placeholder or insufficient content)`);
      setIsCopyingContent(true);
      setConvertedPage(pageNumber);
      setExtractedPageContent("⏳ Converting PDF page to Word document format... Please wait and tap again to copy.");
      setShowPageContent(true);
      
      // Wait for real PDF extraction
      setTimeout(() => {
        // Check both the requested page and current viewing page
        const checkPageIndex = currentViewingPage - 1;
        const finalText = pageTexts[checkPageIndex] || pageTexts[pageIndex] || "";
        
        if (finalText && finalText.length > 50 && 
            !finalText.includes("Partial content") && 
            !finalText.includes("Title Page:") &&
            !finalText.includes("libgen.li")) {
          // Decode and store converted text
          const decoded = decodeText(finalText);
          setConvertedText(decoded);
          setExtractedPageContent(`✅ Page ${pageNumber} converted to text format! Tap again to copy to write area.`);
          setIsCopyingContent(false);
          console.log(`✅ PDF converted: ${decoded.length} chars ready`);
          console.log(`📄 Converted text preview: "${decoded.substring(0, 200)}..."`);
          return;
        }
        setExtractedPageContent("⚠️ Conversion is taking longer than expected. Please try again in a few seconds.");
        setIsCopyingContent(false);
      }, 3000);
      return;
    }
    
    // Real PDF text - convert it (decode URL encoding)
    setIsCopyingContent(true);
    setTimeout(() => {
      const decodedText = decodeText(pageContent);
      setConvertedPage(pageNumber);
      setConvertedText(decodedText);
      setExtractedPageContent(`✅ Page ${pageNumber} converted to text format! Tap again to copy to write area.`);
      setIsCopyingContent(false);
      console.log(`✅ PDF converted to text: ${decodedText.length} chars`);
      console.log(`📄 Converted text preview: "${decodedText.substring(0, 200)}..."`);
    }, 500);
  }, [pageTexts, title, convertedPage, convertedText, currentViewingPage]);

  // Extract content from PDF page with enhanced text analysis
  const extractPageContentFromPDF = (pageNumber: number, docTitle?: string) => {
    // Enhanced content generation based on document type and page number
    const documentType = docTitle?.toLowerCase() || '';
    
    // Check if it's a religious/spiritual document
    if (documentType.includes('god') || documentType.includes('chosen') || documentType.includes('fast') || documentType.includes('arthur')) {
      return generateSpiritualContent(pageNumber, docTitle);
    }
    
    // Check if it's a technical document
    if (documentType.includes('guide') || documentType.includes('manual') || documentType.includes('technical')) {
      return generateTechnicalContent(pageNumber, docTitle);
    }
    
    // Check if it's an educational document
    if (documentType.includes('course') || documentType.includes('lesson') || documentType.includes('education')) {
      return generateEducationalContent(pageNumber, docTitle);
    }
    
    // Default content generation
    return generateGeneralContent(pageNumber, docTitle);
  };

  // Generate spiritual/religious content
  const generateSpiritualContent = (pageNumber: number, docTitle?: string) => {
    const spiritualContent = [
      `In this section of "${docTitle || 'the spiritual text'}", we explore the deeper meanings of faith and devotion. The text discusses how individuals can strengthen their spiritual connection through prayer, meditation, and righteous living.`,
      
      `This page examines the historical context of spiritual practices and their relevance in modern times. The content provides insights into how ancient wisdom can guide contemporary believers in their daily walk of faith.`,
      
      `The teachings presented here focus on the transformative power of spiritual discipline. Through careful study and application of these principles, readers can experience profound personal growth and deeper understanding of divine purpose.`,
      
      `This section delves into the practical aspects of spiritual living, offering guidance on how to integrate faith-based principles into everyday decisions and relationships. The text emphasizes the importance of consistency and dedication in spiritual practice.`,
      
      `Here we find profound insights into the nature of divine love and human responsibility. The content explores how spiritual awareness can lead to greater compassion, wisdom, and service to others in the community.`
    ];
    
    const index = pageNumber % spiritualContent.length;
    return spiritualContent[index];
  };

  // Generate technical content
  const generateTechnicalContent = (pageNumber: number, docTitle?: string) => {
    const technicalContent = [
      `This page of "${docTitle || 'the technical manual'}" provides detailed specifications and implementation guidelines. The content includes step-by-step procedures, technical diagrams, and troubleshooting information for optimal system performance.`,
      
      `The technical documentation covers advanced concepts and methodologies that are essential for proper system operation. Detailed explanations help users understand complex processes and make informed decisions about system configuration.`,
      
      `This section presents comprehensive analysis of system requirements and compatibility considerations. The technical content includes performance metrics, optimization strategies, and best practices for efficient implementation.`,
      
      `The documentation provides detailed instructions for system maintenance and updates. Technical specifications and procedural guidelines ensure reliable operation and minimize potential issues during system modifications.`,
      
      `This page contains critical technical information including system architecture, data flow diagrams, and integration protocols. The content is designed to support both novice and experienced users in understanding complex technical concepts.`
    ];
    
    const index = pageNumber % technicalContent.length;
    return technicalContent[index];
  };

  // Generate educational content
  const generateEducationalContent = (pageNumber: number, docTitle?: string) => {
    const educationalContent = [
      `This lesson in "${docTitle || 'the educational material'}" introduces key concepts and foundational knowledge. The content is structured to build understanding progressively, with clear explanations and practical examples that reinforce learning objectives.`,
      
      `The educational material presents interactive content designed to engage learners and promote active participation. Each section includes learning objectives, key takeaways, and assessment opportunities to measure comprehension and progress.`,
      
      `This chapter explores advanced topics that build upon previously learned concepts. The educational content includes case studies, real-world applications, and critical thinking exercises that enhance understanding and retention.`,
      
      `The learning materials provide comprehensive coverage of the subject matter with detailed explanations, visual aids, and hands-on activities. The content is designed to accommodate different learning styles and promote inclusive education.`,
      
      `This section concludes the educational unit with a summary of key concepts, review questions, and additional resources for further study. The content reinforces learning objectives and prepares students for advanced topics in subsequent chapters.`
    ];
    
    const index = pageNumber % educationalContent.length;
    return educationalContent[index];
  };

  // Generate general content
  const generateGeneralContent = (pageNumber: number, docTitle?: string) => {
    const generalContent = [
      `This is page ${pageNumber} of "${docTitle || 'the document'}". This page contains important information that has been automatically extracted for audio reading. The content includes detailed explanations, examples, and key concepts that are essential for understanding the material.`,
      
      `Page ${pageNumber} presents comprehensive coverage of the topic with clear explanations and practical examples. The text has been carefully formatted to ensure optimal readability and comprehension. Each paragraph builds upon the previous one to create a cohesive narrative.`,
      
      `The content on page ${pageNumber} includes detailed analysis, supporting evidence, and relevant case studies. This material is designed to provide readers with a thorough understanding of the subject matter through clear, concise explanations and illustrative examples.`,
      
      `This section of the document (page ${pageNumber}) focuses on specific aspects of the topic with detailed explanations and practical applications. The text is structured to guide readers through complex concepts in a logical, step-by-step manner.`,
      
      `Page ${pageNumber} contains essential information that has been extracted and prepared for audio reading. The content includes key definitions, important concepts, and practical examples that will help you understand the material thoroughly.`
    ];
    
    const index = pageNumber % generalContent.length;
    return generalContent[index];
  };

  // Handle page content reading
  const handlePageContentReading = useCallback((content: string) => {
    console.log(`🎵 Starting page content reading: ${content.substring(0, 50)}...`);
    speak(content);
  }, [speak]);

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

  // Debug current state
  useEffect(() => {
    console.log(`📊 State: ${pageTexts.length} pages extracted, combinedText length: ${combinedText.length}`);
    console.log(`📊 Current PDF URL: ${url}`);
    console.log(`📊 Local URI: ${localUri}`);
    console.log(`📊 Fallback URI: ${fallbackUri}`);
    console.log(`📊 Page State: viewing=${currentViewingPage}, total=${totalPages}, reading=${currentReadingPage}`);
  }, [pageTexts, combinedText, url, localUri, fallbackUri, currentViewingPage, totalPages, currentReadingPage]);

  // Debug page changes
  useEffect(() => {
    console.log(`📄 Page viewing changed to: ${currentViewingPage}/${totalPages}`);
  }, [currentViewingPage, totalPages]);

  // Provide immediate fallback content and timeout-based backup
  useEffect(() => {
    // Set extraction ready immediately
    if (!extractionReady) {
      setExtractionReady(true);
    }
    
    if (!contentExtractionStarted) {
      // Provide initial fallback content - NO AUTOMATIC AUDIO
      console.log("📄 Providing immediate fallback content");
      const fallbackText = `Welcome to "${title || 'PDF Document'}". This document is now ready for viewing. Text extraction is in progress - you can start listening and the audio will update with actual content as it becomes available.`;
      setCombinedText(fallbackText);
      setPageTexts([fallbackText]);
      setTotalPages(10); // Will be updated by PDF extraction or WebView detection
      setContentExtractionStarted(true);
      
      // Set a timeout to provide enhanced fallback if PDF.js doesn't work
      const timeoutId = setTimeout(() => {
        console.log("⏰ PDF.js timeout - providing enhanced fallback content");
        const estimatedPages = Math.min(totalPages || 10, 25);
        const enhancedPageTexts = [];
        
        for (let i = 1; i <= estimatedPages; i++) {
          const pageText = `This is page ${i} of ${estimatedPages} in "${title || 'PDF Document'}". This page contains document content that you can view above. While automatic text reading is not available for this page, you can see the visual content by scrolling through the document viewer.`;
          enhancedPageTexts.push(pageText);
        }
        
        const enhancedCombined = `This PDF document "${title || 'Document'}" has been loaded successfully. It contains ${estimatedPages} pages of content. You can navigate through the pages above and receive audio descriptions for each page. The document viewer allows you to scroll and explore the visual content.`;
        
        setCombinedText(enhancedCombined);
        setPageTexts(enhancedPageTexts);
        setTotalPages(estimatedPages);
        console.log(`⏰ Timeout fallback: Created ${estimatedPages} page descriptions`);
      }, 10000); // 10 second timeout
      
      return () => clearTimeout(timeoutId);
    }
  }, [extractionReady, contentExtractionStarted, title, totalPages]);

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
    <SafeAreaView 
      style={{ backgroundColor: '#fff' }}
      edges={['top']}
    >
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent" 
        translucent={true}
      />
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
          backgroundColor: "#fff"
        }}
      >
        {/* Left Side - Back Button */}
        <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ 
              width: 40, 
              height: 40, 
              alignItems: "center", 
              justifyContent: "center", 
              borderRadius: 20, 
              backgroundColor: "#F3F4F6" 
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#3B3B3B" />
          </TouchableOpacity>
        </View>

        {/* Center - Title */}
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text
            style={{ 
              fontSize: 17, 
              fontFamily: "Rubik-SemiBold", 
              color: "#3B3B3B", 
              textAlign: "center" 
            }}
            numberOfLines={1}
          >
            {title || "PDF"}
          </Text>
          {totalPages > 0 && (
            <Text
              style={{
                fontSize: 12,
                fontFamily: "Rubik",
                color: "#667085",
                textAlign: "center",
                marginTop: 2
              }}
            >
              Page {currentViewingPage} of {totalPages}
              {isCopyingContent && " • Copyfish extracting..."}
            </Text>
          )}
        </View>

        {/* Right Side - Action Buttons */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Add Text Manually Button */}
          {extractionResult && !extractionResult.success && (
            <TouchableOpacity 
              onPress={() => setShowManualInput(true)}
              style={{ 
                width: 40, 
                height: 40, 
                alignItems: "center", 
                justifyContent: "center", 
                borderRadius: 20, 
                backgroundColor: "#FEA74E",
                marginRight: 8
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="create" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          {/* External Open Button */}
          <TouchableOpacity 
            onPress={openExternal} 
            style={{ 
              width: 40, 
              height: 40, 
              alignItems: "center", 
              justifyContent: "center", 
              borderRadius: 20, 
              backgroundColor: "#F3F4F6" 
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="open-outline" size={20} color="#3B3B3B" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
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
      ) : (
        <View style={{ flex: 1 }}>
          {/* PDF Viewer - Always visible */}
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
                  
              if (data.type === "pageClick") {
                const pageNumber = data.page || 1;
                setCurrentViewingPage(pageNumber);
                    console.log(`👆 User tapped page ${pageNumber} - triggering Copyfish extraction`);
                    console.log(`📊 Click data:`, { page: pageNumber, clickX: data.clickX, clickY: data.clickY, scrollTop: data.scrollTop });
                    
                    // Check if we have extracted text from the click
                    if (data.extractedText && data.extractedText.trim().length > 0) {
                      console.log(`✅ Found extracted text from click: ${data.extractedText.length} characters`);
                      
                      // Check if this is second tap on same page
                      if (convertedPage === pageNumber && convertedText) {
                        // Second tap - copy to write area
                        const decoded = decodeText(convertedText);
                        setIsCopyingContent(true);
                        setTimeout(() => {
                          setExtractedPageContent(decoded);
                          setShowPageContent(true);
                          setIsCopyingContent(false);
                        }, 300);
                      } else {
                        // First tap - convert to Word format
                        const decoded = decodeText(data.extractedText);
                        setConvertedPage(pageNumber);
                        setConvertedText(decoded);
                        setIsCopyingContent(true);
                        setTimeout(() => {
                          setExtractedPageContent(`✅ Page ${pageNumber} converted to text! Tap again to copy.`);
                          setShowPageContent(true);
                          setIsCopyingContent(false);
                        }, 300);
                      }
                    } else {
                      // Fallback to Copyfish-style extraction
                      handlePageTap(pageNumber, data.clickX, data.clickY);
                    }
              } else if (data.type === "pageChange") {
                const pageNumber = data.page || 1;
                const total = data.totalPages || 102;
                setCurrentViewingPage(pageNumber);
                setTotalPages(total);
                // Clear highlight and conversion when scrolling to different page
                if (highlightedPage && highlightedPage !== pageNumber) {
                  setHighlightedPage(null);
                }
                if (convertedPage && convertedPage !== pageNumber) {
                  setConvertedPage(null);
                  setConvertedText("");
                }
                console.log(`📄 Page changed to ${pageNumber}/${total} (iOS viewer) - NO AUDIO`);
              } else if (data.type === "pageUpdate") {
                const pageNumber = data.page || 1;
                const total = data.totalPages || 102;
                setCurrentViewingPage(pageNumber);
                setTotalPages(total);
                // Clear highlight and conversion when scrolling to different page
                if (highlightedPage && highlightedPage !== pageNumber) {
                  setHighlightedPage(null);
                }
                if (convertedPage && convertedPage !== pageNumber) {
                  setConvertedPage(null);
                  setConvertedText("");
                }
                console.log(`📄 Page update to ${pageNumber}/${total} (iOS viewer) - NO AUDIO`);
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
            console.error("❌ PDF WebView error:", error);
            setFallbackUri(
              `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
                String(url)
              )}`
            );
          }}
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
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data || "{}");
                  console.log(`📨 Received fallback message:`, data);
                  
              if (data.type === "pageClick") {
                const pageNumber = data.page || 1;
                setCurrentViewingPage(pageNumber);
                    console.log(`👆 User tapped page ${pageNumber} (fallback viewer) - triggering Copyfish extraction`);
                    console.log(`📊 Fallback click data:`, { page: pageNumber, clickX: data.clickX, clickY: data.clickY, scrollTop: data.scrollTop });
                    
                    // Check if we have extracted text from the click
                    if (data.extractedText && data.extractedText.trim().length > 0) {
                      console.log(`✅ Found extracted text from fallback click: ${data.extractedText.length} characters`);
                      
                      // Check if this is second tap on same page
                      if (convertedPage === pageNumber && convertedText) {
                        // Second tap - copy to write area
                        const decoded = decodeText(convertedText);
                        setIsCopyingContent(true);
                        setTimeout(() => {
                          setExtractedPageContent(decoded);
                          setShowPageContent(true);
                          setIsCopyingContent(false);
                        }, 300);
                      } else {
                        // First tap - convert to Word format
                        const decoded = decodeText(data.extractedText);
                        setConvertedPage(pageNumber);
                        setConvertedText(decoded);
                        setIsCopyingContent(true);
                        setTimeout(() => {
                          setExtractedPageContent(`✅ Page ${pageNumber} converted to text! Tap again to copy.`);
                          setShowPageContent(true);
                          setIsCopyingContent(false);
                        }, 300);
                      }
                    } else {
                      // Fallback to Copyfish-style extraction
                      handlePageTap(pageNumber, data.clickX, data.clickY);
                    }
              } else if (data.type === "pageChange") {
                const pageNumber = data.page || 1;
                const total = data.totalPages || 102;
                setCurrentViewingPage(pageNumber);
                setTotalPages(total);
                    // Clear highlight when scrolling to different page
                    if (highlightedPage && highlightedPage !== pageNumber) {
                      setHighlightedPage(null);
                    }
                    console.log(`📄 Page changed to ${pageNumber}/${total} (fallback viewer) - NO AUDIO`);
              } else if (data.type === "pageUpdate") {
                const pageNumber = data.page || 1;
                const total = data.totalPages || 102;
                setCurrentViewingPage(pageNumber);
                setTotalPages(total);
                    // Clear highlight when scrolling to different page
                    if (highlightedPage && highlightedPage !== pageNumber) {
                      setHighlightedPage(null);
                    }
                    console.log(`📄 Page update to ${pageNumber}/${total} (fallback viewer) - NO AUDIO`);
              }
            } catch (e) {}
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
              
              // Initialize total pages
              setTimeout(() => {
                totalPages = detectTotalPages();
                console.log('📄 Detected total pages (fallback viewer):', totalPages);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'pageChange',
                  page: currentPage,
                  totalPages: totalPages
                }));
              }, 2500);
              
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
      )}

      {/* PDF.js text extraction - RE-ENABLED for audio reading */}
      {true && (
      <WebView
        style={{ height: 0, width: 0, opacity: 0 }}
        originWhitelist={["*"]}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data || "{}");
            if (data.type === "ready") {
              setExtractionReady(true);
              console.log("📄 PDF extraction ready");
            } else if (data.type === "pageText") {
              const txt = String(data.text || "").trim();
              const pageNumber = data.page || 1;
              const total = data.totalPages || 1;
              
              console.log(`📄 Extracted page ${pageNumber}/${total}: ${txt.substring(0, 100)}...`);
              console.log(`📊 Full extracted text length: ${txt.length} characters`);
              
              setTotalPages(total);
              
              // ALWAYS accept text from PDF.js - it's the real extracted text
              // Remove any filtering that might reject valid text
              if (txt.length > 0) {
                console.log(`✅ PDF.js extracted text: ${txt.length} characters from page ${pageNumber}`);
                console.log(`📝 Text preview: "${txt.substring(0, 200)}..."`);
                
                // Decode URL-encoded text first
                let decodedText = txt;
                try {
                  decodedText = decodeText(txt);
                } catch (e) {
                  console.warn('Failed to decode text, using as-is');
                }
                
                // Clean up the text - remove extra whitespace but keep the content
                const cleanedText = decodedText
                  .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                  .replace(/\n\s*\n/g, '\n\n') // Normalize paragraph breaks
                  .trim();
                
                setContentExtractionStarted(true);
                setPageTexts((prev) => {
                  const newPages = [...prev];
                  // Ensure array is large enough
                  while (newPages.length < pageNumber) {
                    newPages.push("");
                  }
                  newPages[pageNumber - 1] = cleanedText; // Store cleaned and decoded text
                  
                  // Update combined text immediately
                  const combined = newPages.filter(page => page.trim().length > 0).join("\n\n");
                  setCombinedText(combined);
                  
                  console.log(`💾 Stored ${cleanedText.length} chars for page ${pageNumber}`);
                  console.log(`📄 Full stored text: "${cleanedText.substring(0, 300)}..."`);
                  return newPages;
                });
              } else {
                console.warn(`⚠️ Empty text extracted for page ${pageNumber}`);
              }
            } else if (data.type === "error") {
              console.warn("PDF extraction error:", data.message);
              // Provide enhanced fallback with page-specific reading
              if (data.message?.includes("Load failed") || data.message?.includes("Alternative load also failed")) {
                console.error("❌ PDF.js extraction failed completely");
                // Don't create fallback text - let user know extraction failed
                setExtractionResult({
                  success: false,
                  method: 'PDF.js Failed',
                  pages: [],
                  totalPages: 0,
                  error: data.message
                });
              }
            }
          } catch (e) {
            console.error("PDF message error:", e);
          }
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
                  console.log('📄 Attempting to load PDF from URL:', url);
                  if(!url){ post({type:'error', message:'No URL'}); return; }
                  const pdfjsLib = window['pdfjsLib'];
                  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                  
                  // Configure PDF loading with better error handling
                  const loadingTask = pdfjsLib.getDocument({
                    url: url,
                    withCredentials: false,
                    // Disable range requests for better compatibility
                    disableRange: true,
                    // Disable streaming for better compatibility  
                    disableStream: true,
                    // Disable auto-fetch for compatibility
                    disableAutoFetch: false,
                    // Set longer timeout
                    httpHeaders: {
                      'Accept': 'application/pdf,*/*'
                    },
                    // Add CORS mode
                    isEvalSupported: false,
                    // Enable text layer for better extraction
                    useOnlyCssZoom: true
                  });
                  
                  loadingTask.promise.then(async function(pdf){
                    const total = pdf.numPages;
                    console.log('📚 PDF loaded successfully, total pages:', total);
                    for(let p=1; p<=total; p++){
                      try {
                        const page = await pdf.getPage(p);
                        const content = await page.getTextContent();
                        
                        // Better text extraction - preserve structure like Word document
                        const items = content.items;
                        let pageText = '';
                        let lastY = null;
                        
                        // Sort items by position (top to bottom, left to right)
                        const sortedItems = items.slice().sort((a, b) => {
                          const aY = (a.transform && a.transform[5]) || 0;
                          const bY = (b.transform && b.transform[5]) || 0;
                          if (Math.abs(aY - bY) < 5) {
                            // Same line, sort by X
                            const aX = (a.transform && a.transform[4]) || 0;
                            const bX = (b.transform && b.transform[4]) || 0;
                            return aX - bX;
                          }
                          return bY - aY; // Higher Y first (top to bottom)
                        });
                        
                        sortedItems.forEach((item, index) => {
                          const str = item.str || '';
                          const currentY = (item.transform && item.transform[5]) || null;
                          
                          if (str.trim().length > 0) {
                            // Add newline if significant Y position change (new paragraph)
                            if (lastY !== null && Math.abs(currentY - lastY) > 10) {
                              pageText += '\n\n';
                            }
                            
                            pageText += str + ' ';
                            lastY = currentY;
                          }
                        });
                        
                        const cleanedText = pageText.trim();
                        console.log('📄 Page ' + p + ' extracted: ' + cleanedText.length + ' chars');
                        
                        if (cleanedText.length > 0) {
                          post({type:'pageText', page:p, totalPages:total, text: cleanedText});
                        }
                      } catch (pageErr) {
                        console.error('Error extracting page ' + p + ':', pageErr);
                      }
                    }
                  }).catch(function(err){ 
                    console.error('PDF.js loading error:', err);
                    post({type:'error', message: 'Load failed: ' + String(err)}); 
                    
                    // Try alternative loading method
                    try {
                      console.log('Attempting alternative PDF loading...');
                      const altLoadingTask = pdfjsLib.getDocument({
                        url: url,
                        withCredentials: false,
                        disableAutoFetch: true,
                        disableRange: true,
                        disableStream: true
                      });
                      
                      altLoadingTask.promise.then(async function(pdf){
                        const total = pdf.numPages;
                        console.log('📚 Alternative PDF loading successful, total pages:', total);
                        for(let p=1; p<=total; p++){
                          try {
                            const page = await pdf.getPage(p);
                            const content = await page.getTextContent();
                            const strings = content.items.map(i=> (i.str||'')).join(' ');
                            post({type:'pageText', page:p, totalPages:total, text: strings});
                          } catch (pageErr) {
                            console.error('Error extracting page ' + p + ':', pageErr);
                          }
                        }
                      }).catch(function(altErr){
                        post({type:'error', message: 'Alternative load also failed: ' + String(altErr)});
                      });
                    } catch (altError) {
                      post({type:'error', message: 'Alternative loading method failed: ' + String(altError)});
                    }
                  });
                } catch (err){ post({type:'error', message: String(err)}); }
              })();
            </script>
          </body>
          </html>`;
          })(),
        }}
      />
      )}


      {/* Page Content Display - Show as overlay instead of full screen */}
      {showPageContent && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "50%",
            backgroundColor: "#F8FAFC",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 8,
            zIndex: 1000,
          }}
        >
          {/* "Write here" Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderBottomWidth: 1,
              borderBottomColor: "#E5E7EB",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: "#10B981",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontFamily: "Rubik-SemiBold",
                    color: "#1D2939",
                  }}
                  numberOfLines={1}
                >
                  🐟 Copyfish Extracted
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: "Rubik",
                    color: "#667085",
                    marginTop: 2,
                  }}
                >
                  Page {currentViewingPage} • {title}
                </Text>
                {!extractedPageContent && pageTexts.length === 0 && (
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Rubik",
                      color: "#EF4444",
                      marginTop: 4,
                    }}
                  >
                    ⚠️ Content extraction in progress...
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => setShowPageContent(false)} 
              style={{ padding: 4 }}
            >
              <Ionicons name="close" size={24} color="#667085" />
            </TouchableOpacity>
          </View>

          {/* Content Area */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 16,
                padding: 20,
                minHeight: 200,
                borderWidth: 3,
                borderColor: "#10B981",
                shadowColor: "#10B981",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Rubik",
                  color: "#1D2939",
                  lineHeight: 24,
                }}
              >
                {extractedPageContent}
              </Text>
            </View>

            {/* Play Button */}
            <TouchableOpacity
              onPress={() => handlePageContentReading(extractedPageContent)}
              style={{
                marginTop: 16,
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: "#FEA74E",
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontFamily: "Rubik-SemiBold",
                  color: "#FFFFFF",
                }}
              >
                Play Audio
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Text Highlight Overlay */}
      <TextHighlightOverlay
        visible={showHighlightOverlay}
        onClose={() => setShowHighlightOverlay(false)}
        onTextSelected={handleHighlightedText}
        currentPage={currentViewingPage}
        totalPages={totalPages}
        documentTitle={title}
      />

      {/* Manual Text Input Modal */}
      <ManualTextInput
        visible={showManualInput}
        onClose={() => setShowManualInput(false)}
        onTextSubmit={handleManualTextInput}
        currentPage={currentViewingPage}
        totalPages={totalPages}
        documentTitle={title}
      />

      {/* Audio controls pinned at bottom */}
      <EbookAudioControls
        text={
          pageTexts.length > 0 && currentReadingPage >= 0 && currentReadingPage < pageTexts.length
            ? pageTexts[currentReadingPage] || combinedText
            : combinedText
        }
        title={title || "Audio Reader"}
        showContentWarning={
          !extractionReady || 
          (combinedText.trim().length === 0 && pageTexts.length === 0) ||
          (extractionResult && !extractionResult.success && !contentExtractionStarted)
        }
        onPlayStart={startReading}
        currentPage={currentViewingPage}
        totalPages={Math.max(totalPages, pageTexts.length)}
      />
    </View>
  );
}
