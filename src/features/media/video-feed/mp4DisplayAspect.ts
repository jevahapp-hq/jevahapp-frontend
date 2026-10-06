/**
 * Display size of an MP4/MOV, after the track matrix.
 * Phone portrait clips are often 1920×1080 pixels with a 90° matrix.
 * The track width/height ignore that turn, so the picture is read as 16:9
 * and a 9:16 reel is cropped into a short band.
 */

export type DisplaySize = { width: number; height: number };

function u32(view: DataView, offset: number): number {
  return view.getUint32(offset);
}

function fixed16(view: DataView, offset: number): number {
  return view.getInt32(offset) / 65536;
}

function parseTkhd(view: DataView, boxStart: number): DisplaySize | null {
  if (boxStart + 92 > view.byteLength) return null;
  if (u32(view, boxStart + 4) !== 0x746b6864) return null;
  const version = view.getUint8(boxStart + 8);
  const widthAt = version === 1 ? boxStart + 96 : boxStart + 84;
  const matrixAt = widthAt - 36;
  if (widthAt + 8 > view.byteLength) return null;

  const a = fixed16(view, matrixAt);
  const b = fixed16(view, matrixAt + 4);
  const c = fixed16(view, matrixAt + 12);
  const d = fixed16(view, matrixAt + 16);
  let width = u32(view, widthAt) / 65536;
  let height = u32(view, widthAt + 4) / 65536;
  if (!(width > 1) || !(height > 1) || width > 8000 || height > 8000) return null;

  const turned =
    Math.abs(a) < 0.2 &&
    Math.abs(d) < 0.2 &&
    Math.abs(b) > 0.8 &&
    Math.abs(c) > 0.8;
  if (turned && width > height) {
    const swap = width;
    width = height;
    height = swap;
  }
  return { width, height };
}

/** First video track header in this slice of the file. */
export function displaySizeFromMp4(bytes: Uint8Array): DisplaySize | null {
  if (bytes.length < 92) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 4; i + 4 <= bytes.length; i++) {
    if (
      bytes[i] === 0x74 &&
      bytes[i + 1] === 0x6b &&
      bytes[i + 2] === 0x68 &&
      bytes[i + 3] === 0x64
    ) {
      const size = parseTkhd(view, i - 4);
      if (size) return size;
    }
  }
  return null;
}

function looksLikeContainer(url: string): boolean {
  const path = url.split("#")[0].split("?")[0].toLowerCase();
  if (path.endsWith(".m3u8")) return false;
  return true;
}

/**
 * Every byte read here is copied into JS on Android. Big slices stalled the
 * JS thread long enough to freeze the feed and Reels for seconds.
 */
const SLICE_BYTES = 16384;
const MAX_HOPS = 4;

type TopLevelWalk = { size: DisplaySize | null; nextOffset: number | null };

/** Walk top-level boxes in a slice that starts on a box boundary. */
export function walkTopLevelBoxes(bytes: Uint8Array, baseOffset: number): TopLevelWalk {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let i = 0;
  while (i + 8 <= bytes.length) {
    let size = u32(view, i);
    let header = 8;
    if (size === 1) {
      if (i + 16 > bytes.length) return { size: null, nextOffset: baseOffset + i };
      size = u32(view, i + 8) * 4294967296 + u32(view, i + 12);
      header = 16;
    } else if (size === 0) {
      return { size: null, nextOffset: null };
    }
    if (size < header) return { size: null, nextOffset: null };
    const isMoov = u32(view, i + 4) === 0x6d6f6f76;
    if (isMoov) {
      const end = Math.min(bytes.length, i + size);
      const found = displaySizeFromMp4(bytes.subarray(i, end));
      if (found) return { size: found, nextOffset: null };
      if (i + size <= bytes.length || i === 0) return { size: null, nextOffset: null };
      return { size: null, nextOffset: baseOffset + i };
    }
    i += size;
  }
  return { size: null, nextOffset: baseOffset + i };
}

async function fetchSlice(url: string, start: number): Promise<Uint8Array | null> {
  const response = await fetch(url, {
    headers: { Range: `bytes=${start}-${start + SLICE_BYTES - 1}` },
  });
  if (response.status !== 206) return null;
  return new Uint8Array(await response.arrayBuffer());
}

async function remoteDisplaySize(url: string): Promise<DisplaySize | null> {
  let offset = 0;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    const bytes = await fetchSlice(url, offset);
    if (!bytes || bytes.length < 8) return null;
    if (hop === 0) {
      const direct = displaySizeFromMp4(bytes);
      if (direct) return direct;
    }
    const walk = walkTopLevelBoxes(bytes, offset);
    if (walk.size) return walk.size;
    if (walk.nextOffset == null || walk.nextOffset <= offset) return null;
    offset = walk.nextOffset;
  }
  return null;
}

async function localSlice(uri: string): Promise<Uint8Array | null> {
  const { File } = await import("expo-file-system");
  const file = new File(uri);
  const size = Number(file.size || 0);
  if (!(size > 0)) return null;
  const headEnd = Math.min(size, 262144);
  const head = new Uint8Array(await file.slice(0, headEnd).arrayBuffer());
  if (displaySizeFromMp4(head) || size <= headEnd) return head;
  const tailStart = Math.max(0, size - 524288);
  return new Uint8Array(await file.slice(tailStart, size).arrayBuffer());
}

/** Displayed width / height, or null when this URL is not a readable MP4/MOV. */
export async function loadMp4DisplayAspect(uri: string): Promise<number | null> {
  if (!uri || !looksLikeContainer(uri)) return null;
  try {
    let size: DisplaySize | null;
    if (uri.startsWith("http://") || uri.startsWith("https://")) {
      size = await remoteDisplaySize(uri);
    } else {
      const bytes = await localSlice(uri);
      size = bytes ? displaySizeFromMp4(bytes) : null;
    }
    if (!size) return null;
    return size.width / size.height;
  } catch {
    return null;
  }
}
