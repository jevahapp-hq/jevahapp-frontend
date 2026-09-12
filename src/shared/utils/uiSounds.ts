/**
 * Soft UI sounds for chrome (bottom nav, etc.).
 * Preloads once; plays without blocking navigation.
 */
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { Platform } from "react-native";
import { releaseAudioPlayer } from "../audio/releaseAudioPlayer";
import { triggerHapticFeedback } from "./haptics";

// Soft dual-tone plink (~110ms) — replace assets/sounds/nav-tap.wav anytime
const NAV_TAP = require("../../../assets/sounds/nav-tap.wav");

let navSound: AudioPlayer | null = null;
let loading: Promise<void> | null = null;
let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady || Platform.OS === "web") return;
  try {
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: false,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
      shouldRouteThroughEarpiece: false,
    });
    audioModeReady = true;
  } catch {
    // keep trying next play
  }
}

async function ensureNavSound(): Promise<AudioPlayer | null> {
  if (Platform.OS === "web") return null;
  if (navSound) return navSound;
  if (loading) {
    await loading;
    return navSound;
  }
  loading = (async () => {
    await ensureAudioMode();
    try {
      const player = createAudioPlayer(NAV_TAP, {
        updateInterval: 250,
        keepAudioSessionActive: true,
      });
      player.volume = 0.38;
      player.loop = false;
      navSound = player;
    } catch (e) {
      if (__DEV__) console.warn("[uiSounds] failed to load nav tap", e);
      navSound = null;
    } finally {
      loading = null;
    }
  })();
  await loading;
  return navSound;
}

/** Warm the asset after first interactions (optional). */
export function preloadNavTapSound(): void {
  void ensureNavSound();
}

/**
 * Soft sleek tap for bottom-nav / tab chrome.
 * Never blocks tab switch — haptic sync, sound fire-and-forget.
 */
export function playNavTapSound(options?: { haptic?: boolean }): void {
  if (Platform.OS === "web") return;
  if (options?.haptic !== false) {
    triggerHapticFeedback("light");
  }
  const play = (sound: AudioPlayer) => {
    void sound
      .seekTo(0)
      .then(() => sound.play())
      .catch(() => {});
  };
  if (navSound) {
    play(navSound);
    return;
  }
  void ensureNavSound().then((sound) => {
    if (sound) play(sound);
  });
}

export function releaseNavTapSound(): void {
  releaseAudioPlayer(navSound);
  navSound = null;
}
