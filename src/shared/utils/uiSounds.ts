/**
 * Soft UI sounds for chrome (bottom nav, etc.).
 * Preloads once; plays without blocking navigation.
 */
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { Platform } from "react-native";
import { triggerHapticFeedback } from "./haptics";

// Soft dual-tone plink (~110ms) — replace assets/sounds/nav-tap.wav anytime
const NAV_TAP = require("../../../assets/sounds/nav-tap.wav");

let navSound: Audio.Sound | null = null;
let loading: Promise<void> | null = null;
let audioModeReady = false;

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady || Platform.OS === "web") return;
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    audioModeReady = true;
  } catch {
    // keep trying next play
  }
}

async function ensureNavSound(): Promise<Audio.Sound | null> {
  if (Platform.OS === "web") return null;
  if (navSound) return navSound;
  if (loading) {
    await loading;
    return navSound;
  }
  loading = (async () => {
    await ensureAudioMode();
    try {
      const { sound } = await Audio.Sound.createAsync(NAV_TAP, {
        volume: 0.38,
        shouldPlay: false,
        isLooping: false,
      });
      navSound = sound;
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
  const play = (sound: Audio.Sound) => {
    void sound
      .setPositionAsync(0)
      .then(() => sound.playAsync())
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
