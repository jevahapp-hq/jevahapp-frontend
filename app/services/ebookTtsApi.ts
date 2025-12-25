import TokenUtils from "../utils/tokenUtils";
import { getApiBaseUrl } from "../utils/api";

export type EbookTtsVoicePreset = "male" | "female" | "custom";

export interface EbookTtsAudioResponse {
  success: boolean;
  message?: string;
  data?: {
    audioUrl?: string;
    voice?: string;
    languageCode?: string;
    duration?: number;
    durationMs?: number;
    generatedAt?: string;
    cached?: boolean;
    canGenerate?: boolean;
    textHash?: string;
    ttsConfig?: any;
    timings?: any;
  };
  code?: string;
}

function qs(params: Record<string, string | number | boolean | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function getAuthHeadersOptional(): Promise<HeadersInit> {
  const token = await TokenUtils.getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getEbookTts(
  ebookId: string,
  options: { includeTimings?: boolean } = {}
): Promise<EbookTtsAudioResponse> {
  const headers = await getAuthHeadersOptional();
  const query = qs({
    includeTimings: options.includeTimings ? true : undefined,
  });
  const res = await fetch(`${getApiBaseUrl()}/api/ebooks/${ebookId}/tts${query}`, {
    method: "GET",
    headers,
  });

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => "");

  // Backend may use 404 to indicate "not generated yet" for this ebook.
  // Treat it as a non-fatal state so the caller can trigger generation.
  if (res.status === 404) {
    if (typeof body === "object" && body) {
      return body as EbookTtsAudioResponse;
    }
    return {
      success: false,
      message: typeof body === "string" && body ? body : "TTS audio not generated for this ebook",
      data: { canGenerate: true },
    };
  }

  if (!res.ok) {
    const msg = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }

  return body as EbookTtsAudioResponse;
}

export async function generateEbookTts(
  ebookId: string,
  options: {
    voice?: EbookTtsVoicePreset;
    voiceName?: string;
    languageCode?: string;
    speed?: number;
    pitch?: number;
  } = {}
): Promise<EbookTtsAudioResponse> {
  const headers = await getAuthHeadersOptional();
  const query = qs({
    voice: options.voice,
    voiceName: options.voiceName,
    languageCode: options.languageCode,
    speed: options.speed,
    pitch: options.pitch,
  });

  const res = await fetch(
    `${getApiBaseUrl()}/api/ebooks/${ebookId}/tts/generate${query}`,
    {
      method: "POST",
      headers,
    }
  );

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await res.json().catch(() => ({}))
    : await res.text().catch(() => "");

  // Backend may return 200/201 for immediate result, or 202 if async.
  if (!res.ok && res.status !== 202) {
    const msg = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }

  return body as EbookTtsAudioResponse;
}


