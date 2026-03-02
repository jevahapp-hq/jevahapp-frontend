/**
 * Gemini AI Service for Text-to-Speech Enhancement
 * Uses Gemini to preprocess and optimize text for better TTS experience
 */

// Note: Add your Gemini API key to .env
// EXPO_PUBLIC_GEMINI_API_KEY=your_key_here

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

export interface GeminiTTSOptions {
  // Text processing options
  simplifyLanguage?: boolean;    // Make text easier to understand
  addPauses?: boolean;            // Add natural pauses for TTS
  fixPronunciation?: boolean;     // Add pronunciation guides
  summarize?: boolean;            // Summarize long text
  maxLength?: number;             // Max characters (for summarization)
}

/**
 * Preprocess text using Gemini AI for better TTS experience
 */
export async function preprocessTextForTTS(
  text: string,
  options: GeminiTTSOptions = {}
): Promise<string> {
  const {
    simplifyLanguage = false,
    addPauses = true,
    fixPronunciation = false,
    summarize = false,
    maxLength = 5000,
  } = options;

  if (!GEMINI_API_KEY) {
    console.warn("⚠️ Gemini API key not found, returning original text");
    return text;
  }

  try {
    let prompt = `You are a text-to-speech optimization assistant. Process the following text to make it better for audio reading:\n\n`;

    if (simplifyLanguage) {
      prompt += `- Simplify complex sentences while keeping the meaning\n`;
    }

    if (addPauses) {
      prompt += `- Add natural pauses using punctuation (commas, periods)\n`;
    }

    if (fixPronunciation) {
      prompt += `- Spell out acronyms and abbreviations\n`;
      prompt += `- Add phonetic hints for difficult words\n`;
    }

    if (summarize && text.length > maxLength) {
      prompt += `- Summarize to approximately ${maxLength} characters while keeping key information\n`;
    }

    prompt += `\nText:\n${text}\n\nReturn ONLY the processed text, no explanations.`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for consistent output
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const processedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!processedText) {
      console.warn("⚠️ No processed text from Gemini, returning original");
      return text;
    }

    console.log("✅ Text preprocessed with Gemini AI");
    return processedText.trim();
  } catch (error) {
    console.error("❌ Error preprocessing text with Gemini:", error);
    return text; // Return original text on error
  }
}

/**
 * Extract chapter summary using Gemini AI
 */
export async function generateChapterSummary(
  chapterText: string,
  maxWords: number = 100
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "Summary not available";
  }

  try {
    const prompt = `Summarize the following chapter in ${maxWords} words or less. Make it engaging and suitable for audio introduction:\n\n${chapterText}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }],
        }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 256,
        },
      }),
    });

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || "Summary not available";

    console.log("✅ Chapter summary generated");
    return summary.trim();
  } catch (error) {
    console.error("❌ Error generating summary:", error);
    return "Summary not available";
  }
}

/**
 * Split long text into readable chunks for TTS
 */
export function splitTextIntoChunks(
  text: string,
  maxChunkSize: number = 2000
): string[] {
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the limit
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Enhance text with natural pauses for better TTS
 */
export function addNaturalPauses(text: string): string {
  let enhanced = text;

  // Add pause after sentences
  enhanced = enhanced.replace(/\. /g, ". ... ");

  // Add pause after colons
  enhanced = enhanced.replace(/: /g, ": ... ");

  // Add pause after semicolons
  enhanced = enhanced.replace(/; /g, "; ... ");

  // Add longer pause after paragraphs
  enhanced = enhanced.replace(/\n\n/g, " ...... ");

  return enhanced;
}

/**
 * Expand abbreviations for better TTS
 */
export function expandAbbreviations(text: string): string {
  const abbreviations: Record<string, string> = {
    "Dr.": "Doctor",
    "Mr.": "Mister",
    "Mrs.": "Missus",
    "Ms.": "Miss",
    "vs.": "versus",
    "etc.": "etcetera",
    "e.g.": "for example",
    "i.e.": "that is",
    "a.m.": "A M",
    "p.m.": "P M",
    "St.": "Saint",
    "Ave.": "Avenue",
    "Blvd.": "Boulevard",
    "dept.": "department",
    "govt.": "government",
  };

  let expanded = text;
  for (const [abbr, full] of Object.entries(abbreviations)) {
    const regex = new RegExp(abbr.replace(".", "\\."), "gi");
    expanded = expanded.replace(regex, full);
  }

  return expanded;
}

/**
 * Prepare ebook text for optimal TTS experience
 */
export async function prepareEbookTextForTTS(
  text: string,
  options: {
    useGemini?: boolean;
    addPauses?: boolean;
    expandAbbr?: boolean;
  } = {}
): Promise<string> {
  const {
    useGemini = true,
    addPauses = true,
    expandAbbr = true,
  } = options;

  let processedText = text;

  // Expand abbreviations
  if (expandAbbr) {
    processedText = expandAbbreviations(processedText);
  }

  // Use Gemini for advanced preprocessing
  if (useGemini && GEMINI_API_KEY) {
    processedText = await preprocessTextForTTS(processedText, {
      simplifyLanguage: false,
      addPauses: false, // We'll add pauses manually
      fixPronunciation: true,
    });
  }

  // Add natural pauses
  if (addPauses) {
    processedText = addNaturalPauses(processedText);
  }

  return processedText;
}

export default {
  preprocessTextForTTS,
  generateChapterSummary,
  splitTextIntoChunks,
  addNaturalPauses,
  expandAbbreviations,
  prepareEbookTextForTTS,
};

