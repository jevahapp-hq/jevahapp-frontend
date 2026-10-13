/**
 * Treat each PDF page as a chapter (page 1 = chapter 1) and split the
 * extracted text into paragraph-sized blocks so the listen UI can highlight
 * words the same way the Bible reader does.
 */

export type EbookChapter = {
  chapterNumber: number;
  blocks: string[];
  rawText: string;
  isEmpty: boolean;
};

export type EbookWordPosition = {
  blockIndex: number;
  wordIndex: number;
  word: string;
};

const EMPTY_PAGE_MAX_CHARS = 8;

export function cleanPdfPageText(text: string): string {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00ad/g, "") // soft hyphen
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isMostlyPageNumber(text: string): boolean {
  const compact = text.replace(/\s+/g, " ").trim();
  if (!compact) return true;
  if (compact.length <= EMPTY_PAGE_MAX_CHARS && /^\d+$/.test(compact)) {
    return true;
  }
  return compact.length < EMPTY_PAGE_MAX_CHARS;
}

/**
 * Split a page into Bible-verse-sized blocks: prefer blank-line paragraphs,
 * otherwise group sentences so highlighting/scroll have anchors.
 */
export function splitPageIntoBlocks(text: string): string[] {
  const cleaned = cleanPdfPageText(text);
  if (!cleaned || isMostlyPageNumber(cleaned)) return [];

  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length >= 2) return paragraphs;

  const blob = (paragraphs[0] || cleaned).replace(/\s+/g, " ").trim();
  const sentences = blob.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  if (!sentences || sentences.length < 2) {
    return blob ? [blob] : [];
  }

  const blocks: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    const piece = sentence.trim();
    if (!piece) continue;
    const next = buffer ? `${buffer} ${piece}` : piece;
    if (buffer && next.split(/\s+/).length > 40) {
      blocks.push(buffer);
      buffer = piece;
    } else {
      buffer = next;
    }
  }
  if (buffer) blocks.push(buffer);
  return blocks;
}

export function buildChapterFromPage(
  chapterNumber: number,
  pageText: string
): EbookChapter {
  const rawText = cleanPdfPageText(pageText);
  const blocks = splitPageIntoBlocks(rawText);
  return {
    chapterNumber,
    blocks,
    rawText,
    isEmpty: blocks.length === 0,
  };
}

export function upsertChapter(
  chapters: EbookChapter[],
  chapterNumber: number,
  pageText: string
): EbookChapter[] {
  const chapter = buildChapterFromPage(chapterNumber, pageText);
  const next = chapters.slice();
  while (next.length < chapterNumber) {
    next.push(buildChapterFromPage(next.length + 1, ""));
  }
  next[chapterNumber - 1] = chapter;
  return next;
}

export function buildWordPositions(
  blocks: string[]
): EbookWordPosition[] {
  const words: EbookWordPosition[] = [];
  blocks.forEach((block, blockIndex) => {
    splitWords(block).forEach((word, wordIndex) => {
      words.push({ blockIndex, wordIndex, word });
    });
  });
  return words;
}

export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

export function joinWords(words: EbookWordPosition[]): string {
  return words.map((w) => w.word).join(" ");
}

export function firstReadableChapter(
  chapters: EbookChapter[]
): EbookChapter | undefined {
  return chapters.find((c) => !c.isEmpty && c.blocks.length > 0);
}

/** First chapter with text at or after this page (page N = chapter N). */
export function readableChapterAtOrAfter(
  chapters: EbookChapter[],
  fromChapterNumber: number
): EbookChapter | undefined {
  return chapters.find(
    (c) => c.chapterNumber >= fromChapterNumber && !c.isEmpty
  );
}

export function nextReadableChapter(
  chapters: EbookChapter[],
  fromChapterNumber: number
): EbookChapter | undefined {
  return chapters.find(
    (c) => c.chapterNumber > fromChapterNumber && !c.isEmpty
  );
}

export function prevReadableChapter(
  chapters: EbookChapter[],
  fromChapterNumber: number
): EbookChapter | undefined {
  for (let i = chapters.length - 1; i >= 0; i--) {
    const c = chapters[i];
    if (c.chapterNumber < fromChapterNumber && !c.isEmpty) return c;
  }
  return undefined;
}
