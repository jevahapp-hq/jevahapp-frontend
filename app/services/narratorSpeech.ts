import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import type { BibleNarratorId } from "./bibleNarrationApi";

const TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const CLIENT_VERSION = "1-143.0.3650.75";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0";

/** Neural voices. These are recorded-style narrators, not the device speech engine. */
const NARRATOR_VOICE: Record<BibleNarratorId, string> = {
  david: "en-US-AndrewNeural",
  hays: "en-US-BrianNeural",
  souer: "en-US-EmmaNeural",
};

export type SpokenWord = { text: string; startMs: number };

export type NarrationAudio = {
  id: string;
  uri: string;
  words: SpokenWord[];
};

const inflight = new Map<string, Promise<NarrationAudio>>();

function connectionId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

async function secMsGec(): Promise<string> {
  let ticks = Date.now() / 1000 + 11644473600;
  ticks -= ticks % 300;
  ticks = Math.round(ticks * 1e7);
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${ticks}${TOKEN}`
  );
  return digest.toUpperCase();
}

function escapeSsml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textChunks(text: string, max = 1400): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current: string[] = [];
  let length = 0;
  for (const word of words) {
    if (length + word.length + 1 > max && current.length > 0) {
      chunks.push(current.join(" "));
      current = [];
      length = 0;
    }
    current.push(word);
    length += word.length + 1;
  }
  if (current.length > 0) chunks.push(current.join(" "));
  return chunks;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return globalThis.btoa(binary);
}

function audioBytes(data: ArrayBuffer): Uint8Array | null {
  if (data.byteLength < 2) return null;
  const headerLength = new DataView(data).getUint16(0);
  const start = 2 + headerLength;
  if (start >= data.byteLength) return null;
  return new Uint8Array(data.slice(start));
}

function bytesFromBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    out[index] = binary.charCodeAt(index);
  }
  return out;
}

/** iOS delivers socket audio as an ArrayBuffer or a base64 string. */
function audioFromSocket(data: unknown): Uint8Array | null {
  if (data instanceof ArrayBuffer) return audioBytes(data);
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    return audioBytes(
      view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
    );
  }
  if (typeof data !== "string" || data.includes("Path:")) return null;
  try {
    const decoded = bytesFromBase64(data);
    return audioBytes(decoded.buffer);
  } catch {
    const raw = new Uint8Array(data.length);
    for (let index = 0; index < data.length; index += 1) {
      raw[index] = data.charCodeAt(index) & 0xff;
    }
    return audioBytes(raw.buffer);
  }
}

function readWords(message: string, offsetMs: number): SpokenWord[] {
  const splitAt = message.indexOf("\r\n\r\n");
  if (splitAt < 0) return [];
  let body: { Metadata?: { Type?: string; Data?: { Offset?: number; text?: { Text?: string } } }[] };
  try {
    body = JSON.parse(message.slice(splitAt + 4));
  } catch {
    return [];
  }
  const words: SpokenWord[] = [];
  for (const item of body.Metadata || []) {
    if (item.Type !== "WordBoundary") continue;
    words.push({
      text: item.Data?.text?.Text || "",
      startMs: offsetMs + Math.round((item.Data?.Offset || 0) / 10000),
    });
  }
  return words;
}

function synthesizeChunk(
  voice: string,
  text: string,
  offsetMs: number
): Promise<{ bytes: Uint8Array; words: SpokenWord[] }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const succeed = (bytes: Uint8Array, words: SpokenWord[]) => {
      if (settled) return;
      settled = true;
      resolve({ bytes, words });
    };
    void (async () => {
      const gec = await secMsGec();
      const id = connectionId();
      const url =
        "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1" +
        `?TrustedClientToken=${TOKEN}&Sec-MS-GEC=${gec}` +
        `&Sec-MS-GEC-Version=${CLIENT_VERSION}&ConnectionId=${id}`;
      const Socket = WebSocket as unknown as new (
        address: string,
        protocols?: string | string[],
        options?: { headers?: Record<string, string> }
      ) => WebSocket;
      const socket = new Socket(url, [], {
        headers: {
          "User-Agent": USER_AGENT,
          Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      socket.binaryType = "arraybuffer";
      const pieces: Uint8Array[] = [];
      const words: SpokenWord[] = [];
      const timer = setTimeout(() => {
        socket.close();
        fail(new Error("Narrator timed out"));
      }, 45000);
      socket.onopen = () => {
        const date = new Date().toUTCString();
        socket.send(
          `X-Timestamp:${date}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
            '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}'
        );
        const ssml =
          "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
          `<voice name='${voice}'><prosody pitch='+0Hz' rate='+0%'>${escapeSsml(text)}</prosody></voice></speak>`;
        socket.send(
          `X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${date}\r\nPath:ssml\r\n\r\n${ssml}`
        );
      };
      socket.onmessage = (event) => {
        const data = event.data;
        if (typeof data === "string" && data.includes("Path:")) {
          if (data.includes("WordBoundary")) words.push(...readWords(data, offsetMs));
          if (data.includes("Path:turn.end")) {
            clearTimeout(timer);
            socket.close();
            const bytes = concatBytes(pieces);
            if (bytes.length === 0) fail(new Error("Narrator returned no audio"));
            else succeed(bytes, words);
          }
          return;
        }
        const bytes = audioFromSocket(data);
        if (bytes && bytes.length > 0) pieces.push(bytes);
      };
      socket.onerror = () => {
        clearTimeout(timer);
        fail(new Error("Narrator connection failed"));
      };
      socket.onclose = () => {
        clearTimeout(timer);
        if (settled) return;
        const bytes = concatBytes(pieces);
        if (bytes.length > 0) succeed(bytes, words);
        else fail(new Error("Narrator connection closed"));
      };
    })().catch((error) => fail(error instanceof Error ? error : new Error("Narrator failed")));
  });
}

async function cacheDir(): Promise<string> {
  const dir = `${FileSystem.cacheDirectory}ebook-narration/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  return dir;
}

/** Record the rest of a chapter while the opening is already playing. */
export function warmNarrationQueue(
  narrator: BibleNarratorId,
  groups: string[][],
  stillCurrent: () => boolean
): void {
  void (async () => {
    for (const blocks of groups) {
      if (!stillCurrent()) return;
      if (blocks.length === 0) continue;
      try {
        await synthesizeNarration(narrator, blocks);
      } catch {
        return;
      }
    }
  })();
}

/** Build one narrator recording for this page and remember it on disk. */
export async function synthesizeNarration(
  narrator: BibleNarratorId,
  blocks: string[]
): Promise<NarrationAudio> {
  const voice = NARRATOR_VOICE[narrator] || NARRATOR_VOICE.david;
  const text = blocks.join(" ").replace(/\s+/g, " ").trim();
  if (!text) throw new Error("This page has no text to read");
  const id = (
    await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${voice}\n${text}`
    )
  ).slice(0, 24);
  const pending = inflight.get(id);
  if (pending) return pending;
  const job = (async () => {
    const dir = await cacheDir();
    const uri = `${dir}${id}.mp3`;
    const timingUri = `${dir}${id}.json`;
    const existing = await FileSystem.getInfoAsync(uri);
    if (existing.exists) {
      try {
        const saved = await FileSystem.readAsStringAsync(timingUri);
        const words = JSON.parse(saved) as SpokenWord[];
        if (Array.isArray(words) && words.length > 0) return { id, uri, words };
      } catch {
        // record it again
      }
    }
    const pieces: Uint8Array[] = [];
    const words: SpokenWord[] = [];
    let offsetMs = 0;
    for (const chunk of textChunks(text)) {
      const part = await synthesizeChunk(voice, chunk, offsetMs);
      pieces.push(part.bytes);
      words.push(...part.words);
      offsetMs += Math.round(part.bytes.length / 6);
    }
    const audio = concatBytes(pieces);
    if (audio.length === 0) throw new Error("Narrator returned no audio");
    await FileSystem.writeAsStringAsync(uri, toBase64(audio), {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(timingUri, JSON.stringify(words));
    return { id, uri, words };
  })();
  inflight.set(id, job);
  try {
    return await job;
  } finally {
    inflight.delete(id);
  }
}
