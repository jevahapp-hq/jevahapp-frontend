const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * expo-audio's AudioModule references androidx.media3.exoplayer.ExoPlayer.
 * On Itel/Transsion 32-bit APKs that class can be missing from the app dex
 * if Media3 stays an implementation-only dep of the library module.
 * Pin it on the app so the class is always packaged.
 */
const MEDIA3 = "1.9.0";
const LINES = [
  `implementation "androidx.media3:media3-exoplayer:${MEDIA3}"`,
  `implementation "androidx.media3:media3-exoplayer-hls:${MEDIA3}"`,
  `implementation "androidx.media3:media3-exoplayer-dash:${MEDIA3}"`,
  `implementation "androidx.media3:media3-exoplayer-smoothstreaming:${MEDIA3}"`,
  `implementation "androidx.media3:media3-datasource-okhttp:${MEDIA3}"`,
  `implementation "androidx.media3:media3-session:${MEDIA3}"`,
  `implementation "androidx.media3:media3-ui:${MEDIA3}"`,
];

function withAndroidMedia3(config) {
  return withAppBuildGradle(config, (mod) => {
    if (mod.modResults.contents.includes("androidx.media3:media3-exoplayer")) {
      return mod;
    }
    const marker = "dependencies {";
    const idx = mod.modResults.contents.indexOf(marker);
    if (idx === -1) return mod;
    const insertAt = idx + marker.length;
    const block = `\n    ${LINES.join("\n    ")}\n`;
    mod.modResults.contents =
      mod.modResults.contents.slice(0, insertAt) +
      block +
      mod.modResults.contents.slice(insertAt);
    return mod;
  });
}

module.exports = withAndroidMedia3;
