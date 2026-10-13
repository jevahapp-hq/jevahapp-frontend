/**
 * Patch fs before Expo/Metro opens the project.
 * Windows + OneDrive hits EMFILE during HMR; graceful-fs queues those opens
 * instead of crashing the bundler (which leaves the app on a white screen).
 */
try {
  require("graceful-fs").gracefulify(require("fs"));
} catch {
  // optional
}
