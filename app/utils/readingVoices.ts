/** Named reading voices. Each one maps to a different natural voice on the device. */
export type ReadingVoiceId = "maple" | "cove" | "breeze";

export type ReadingVoice = {
  id: ReadingVoiceId;
  name: string;
  description: string;
  /** Left at 1. A shifted pitch is what makes these engines sound robotic. */
  pitch: number;
  gender: "female" | "male";
  matchTokens: string[];
};

export type DeviceVoice = {
  identifier: string;
  name: string;
  quality?: string;
  language?: string;
};

export type ResolvedReadingVoice = {
  identifier?: string;
  language?: string;
};

export const READING_VOICE_STORAGE_KEY = "reading-voice-id";

export const READING_VOICE_SAMPLE =
  "The Lord is my shepherd; I shall not want.";

export const READING_VOICES: readonly ReadingVoice[] = [
  {
    id: "maple",
    name: "Maple",
    description: "Warm",
    pitch: 1,
    gender: "female",
    matchTokens: ["ava", "allison", "samantha", "victoria", "serena", "sfg", "iog"],
  },
  {
    id: "cove",
    name: "Cove",
    description: "Calm",
    pitch: 1,
    gender: "male",
    matchTokens: ["daniel", "alex", "evan", "nathan", "aaron", "iom", "tpd"],
  },
  {
    id: "breeze",
    name: "Breeze",
    description: "Bright",
    pitch: 1,
    gender: "female",
    matchTokens: ["zoe", "karen", "moira", "nicky", "kate", "tpc", "tpf"],
  },
];

const FEMALE_TOKENS = [
  "ava",
  "allison",
  "samantha",
  "nicky",
  "karen",
  "moira",
  "serena",
  "zoe",
  "susan",
  "kate",
  "kathy",
  "fiona",
  "tessa",
  "victoria",
  "sfg",
  "tpc",
  "tpf",
  "iog",
];

const MALE_TOKENS = [
  "evan",
  "nathan",
  "daniel",
  "alex",
  "aaron",
  "tom",
  "arthur",
  "gordon",
  "rishi",
  "oliver",
  "reed",
  "iom",
  "tpd",
  "iol",
];

/** iOS novelty voices and tiny embedded engines. They read like a toy. */
const NOVELTY_VOICE =
  /bad news|bahh|boing|bubbles|fred|albert|hysterical|junior|trinoids|zarvox|bells|cellos|good news|pipe organ|ralph|espeak|pico/;

function isNoveltyVoice(voice: DeviceVoice): boolean {
  return NOVELTY_VOICE.test(`${voice.name} ${voice.identifier}`.toLowerCase());
}

export function isReadingVoiceId(value: unknown): value is ReadingVoiceId {
  return value === "maple" || value === "cove" || value === "breeze";
}

export function getReadingVoice(id: ReadingVoiceId): ReadingVoice {
  return READING_VOICES.find((voice) => voice.id === id) ?? READING_VOICES[0];
}

function voiceParts(voice: DeviceVoice): string[] {
  return `${voice.name} ${voice.identifier}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function matchesToken(voice: DeviceVoice, token: string): boolean {
  const parts = voiceParts(voice);
  return parts.includes(token);
}

function genderOf(voice: DeviceVoice): "female" | "male" | "unknown" {
  const female = FEMALE_TOKENS.some((token) => matchesToken(voice, token));
  const male = MALE_TOKENS.some((token) => matchesToken(voice, token));
  if (female && !male) return "female";
  if (male && !female) return "male";
  return "unknown";
}

function qualityScore(voice: DeviceVoice): number {
  const blob = `${voice.identifier} ${voice.name} ${voice.quality ?? ""}`.toLowerCase();
  let score = 0;
  if (isNoveltyVoice(voice)) score -= 500;
  if (voice.quality === "Enhanced") score += 160;
  if (
    blob.includes("premium") ||
    blob.includes("neural") ||
    blob.includes("wavenet") ||
    blob.includes("siri")
  ) {
    score += 80;
  }
  if (
    blob.includes("compact") ||
    blob.includes("pico") ||
    blob.includes("espeak")
  ) {
    score -= 90;
  }
  // Network neural voices are the least mechanical on Android.
  if (blob.includes("network") && (voice.quality === "Enhanced" || blob.includes("neural"))) {
    score += 30;
  }
  const lang = (voice.language || "").toLowerCase();
  if (lang.startsWith("en-us") || lang.startsWith("en_us")) score += 10;
  else if (lang.startsWith("en")) score += 4;
  return score;
}

export function isSiriVoice(voice: {
  identifier?: string;
  name?: string;
}): boolean {
  return `${voice.name || ""} ${voice.identifier || ""}`
    .toLowerCase()
    .includes("siri");
}

function siriGender(voice: DeviceVoice): "female" | "male" | "unknown" {
  const blob = `${voice.name} ${voice.identifier}`.toLowerCase();
  if (blob.includes("female")) return "female";
  if (blob.includes("male")) return "male";
  return genderOf(voice);
}

function siriRank(voice: DeviceVoice): number {
  const blob = `${voice.name} ${voice.identifier}`.toLowerCase();
  let score = 0;
  if (blob.includes("premium")) score += 300;
  else if (voice.quality === "Enhanced" || blob.includes("enhanced")) score += 200;
  if (blob.includes("en-us") || blob.includes("en_us")) score += 20;
  else if (blob.includes("en-gb") || blob.includes("en_gb")) score += 8;
  return score;
}

function toResolved(voice: DeviceVoice): ResolvedReadingVoice {
  return {
    identifier: voice.identifier,
    language: voice.language || undefined,
  };
}

/** On iPhone, Siri's own voice is the one that sounds like Siri. Reuse it when the phone has only one. */
function assignSiriVoices(
  voices: DeviceVoice[]
): Record<ReadingVoiceId, ResolvedReadingVoice> | null {
  const siriVoices = voices.filter((voice) => voice.identifier && isSiriVoice(voice));
  if (siriVoices.length === 0) return null;
  const ranked = [...siriVoices].sort((a, b) => siriRank(b) - siriRank(a));
  const female = ranked.filter((voice) => siriGender(voice) === "female");
  const male = ranked.filter((voice) => siriGender(voice) === "male");
  const femaleVoice = female[0] || ranked[0];
  const maleVoice = male[0] || femaleVoice;
  const secondFemale = female[1] || femaleVoice;
  return {
    maple: toResolved(femaleVoice),
    cove: toResolved(maleVoice),
    breeze: toResolved(secondFemale),
  };
}

function isEnglish(voice: DeviceVoice): boolean {
  const lang = (voice.language || "").toLowerCase();
  if (lang.startsWith("en")) return true;
  const id = voice.identifier.toLowerCase();
  return (
    id.includes("en-us") ||
    id.includes("en_us") ||
    id.includes("en-gb") ||
    id.includes("en_gb")
  );
}

/**
 * Pick a distinct, higher-quality device voice for each reading preset.
 * Enhanced and premium English voices win. Gender and known voice names
 * keep Maple, Cove, and Breeze from collapsing onto the same speaker.
 */
export function assignReadingVoices(
  voices: DeviceVoice[]
): Record<ReadingVoiceId, ResolvedReadingVoice> {
  const english = voices.filter((voice) => voice.identifier && isEnglish(voice));
  const pool = english.length > 0 ? english : voices.filter((voice) => voice.identifier);
  const siriAssignment = assignSiriVoices(pool);
  if (siriAssignment) return siriAssignment;
  const used = new Set<string>();
  const assigned: Record<ReadingVoiceId, ResolvedReadingVoice> = {
    maple: {},
    cove: {},
    breeze: {},
  };

  for (const preset of READING_VOICES) {
    let best: DeviceVoice | undefined;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const voice of pool) {
      if (used.has(voice.identifier)) continue;
      const gender = genderOf(voice);
      let score = qualityScore(voice);
      if (gender === preset.gender) score += 180;
      else if (gender === "unknown") score += 30;
      else score -= 40;
      if (preset.matchTokens.some((token) => matchesToken(voice, token))) {
        score += 90;
      }
      if (score > bestScore) {
        bestScore = score;
        best = voice;
      }
    }
    if (best) {
      used.add(best.identifier);
      assigned[preset.id] = {
        identifier: best.identifier,
        language: best.language || undefined,
      };
    }
  }

  return assigned;
}

export type NarratorVoiceId = "david" | "hays" | "souer";

function voiceGender(voice: DeviceVoice): "female" | "male" | "unknown" {
  if (isSiriVoice(voice)) return siriGender(voice);
  return genderOf(voice);
}

/** Device voice for a Bible narrator when the page has no recorded chapter. */
export function pickNarratorDeviceVoice(
  voices: DeviceVoice[],
  narrator: NarratorVoiceId
): ResolvedReadingVoice {
  const english = voices.filter((voice) => voice.identifier && isEnglish(voice));
  const pool = (english.length > 0 ? english : voices).filter(
    (voice) => voice.identifier && !isNoveltyVoice(voice)
  );
  const ranked = [...pool].sort((a, b) => qualityScore(b) - qualityScore(a));
  const males = ranked.filter((voice) => voiceGender(voice) === "male");
  const females = ranked.filter((voice) => voiceGender(voice) === "female");
  const chosen =
    narrator === "souer"
      ? females[0] || ranked[0]
      : narrator === "hays"
        ? males[1] || males[0] || ranked[0]
        : males[0] || ranked[0];
  return chosen ? toResolved(chosen) : {};
}
