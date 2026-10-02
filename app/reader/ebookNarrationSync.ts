export type BlockMark = {
  blockIndex: number;
  startMs: number;
};

/** Map spoken-word start times onto paragraph blocks. */
export function blockMarks(
  blocks: string[],
  words: { startMs: number }[]
): BlockMark[] {
  const counts = blocks.map(
    (block) => block.split(/\s+/).filter(Boolean).length
  );
  const marks: BlockMark[] = [];
  let cursor = 0;
  for (let index = 0; index < counts.length; index += 1) {
    const word = words[cursor] || words[words.length - 1];
    marks.push({ blockIndex: index, startMs: word?.startMs ?? 0 });
    cursor += counts[index];
  }
  return marks;
}

export function blockIndexAtTime(
  marks: BlockMark[],
  positionMs: number
): number | null {
  if (marks.length === 0) return null;
  let index = marks[0].blockIndex;
  for (const mark of marks) {
    if (mark.startMs <= positionMs) index = mark.blockIndex;
    else break;
  }
  return index;
}

export function blockStartMs(marks: BlockMark[], blockIndex: number): number {
  return marks.find((mark) => mark.blockIndex === blockIndex)?.startMs ?? 0;
}

export type PageChunk = {
  blocks: string[];
  blockOffset: number;
};

/**
 * First piece is one narrator request, so playback can start quickly.
 * Later pieces are recorded while that first piece is already playing.
 */
export const PLAYBACK_CHUNK_CHARS = 1000;

export function pageChunks(
  blocks: string[],
  maxChars = PLAYBACK_CHUNK_CHARS
): PageChunk[] {
  const chunks: PageChunk[] = [];
  let current: string[] = [];
  let length = 0;
  let start = 0;
  blocks.forEach((block, index) => {
    const size = block.length + 1;
    if (length + size > maxChars && current.length > 0) {
      chunks.push({ blocks: current, blockOffset: start });
      start = index;
      current = [];
      length = 0;
    }
    current.push(block);
    length += size;
  });
  if (current.length > 0) chunks.push({ blocks: current, blockOffset: start });
  return chunks;
}
