/** Shared like visual tokens — keep feed + Reels identical. */

export const LIKE_COLOR = "#FF2D55";
export const LIKE_IDLE_COLOR = "#98A2B3";

/** Deterministic particle offsets (no Math.random — stable across remounts). */
export type LikeParticleSpec = {
  dx: number;
  dy: number;
  s: number;
  r: number;
};

export const LIKE_PARTICLES_FULL: LikeParticleSpec[] = [
  { dx: -22, dy: -38, s: 0.72, r: -16 },
  { dx: 0, dy: -46, s: 0.95, r: 6 },
  { dx: 22, dy: -38, s: 0.72, r: 16 },
  { dx: -30, dy: -14, s: 0.55, r: -26 },
  { dx: 30, dy: -14, s: 0.55, r: 26 },
  { dx: -12, dy: 16, s: 0.42, r: -8 },
  { dx: 12, dy: 16, s: 0.42, r: 8 },
];

/** Lite: fewer particles, shorter travel — less JS/UI thread work on 2GB. */
export const LIKE_PARTICLES_LITE: LikeParticleSpec[] = [
  { dx: -16, dy: -32, s: 0.7, r: -12 },
  { dx: 0, dy: -38, s: 0.9, r: 0 },
  { dx: 16, dy: -32, s: 0.7, r: 12 },
];

export const LIKE_BURST_MS_FULL = 560;
export const LIKE_BURST_MS_LITE = 420;
