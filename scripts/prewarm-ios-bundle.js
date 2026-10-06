#!/usr/bin/env node

/**
 * Build the Hermes bundle on this Mac before the phone asks.
 * iPhone aborts in ~10–30s with "Could not connect to development server"
 * if Metro is still compiling. Prewarm the Android app shell. Screens
 * load when opened, so this file stays small. iOS is opt-in so it does
 * not take the 4 cores while an Android phone is waiting.
 */

const { spawn } = require("child_process");
const http = require("http");

function bundlePath(platform) {
  return (
  "/node_modules/expo-router/entry.bundle" +
    `?platform=${platform}&dev=true&hot=false&lazy=true` +
  "&transform.engine=hermes&transform.bytecode=1&transform.asyncRoutes=true" +
    "&transform.routerRoot=app&unstable_transformProfile=hermes-stable"
  );
}

function getStatus(timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = http.get("http://127.0.0.1:8081/status", { timeout: timeoutMs }, (res) => {
      res.resume();
      res.on("end", () => resolve(res.statusCode));
    });
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.on("error", reject);
  });
}

async function waitForMetro(ms = 180000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      await getStatus(2000);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error("Metro did not come up on :8081");
}

function curlBundle(platform) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "curl",
      [
        "-sS",
        "-o",
        `/tmp/jevah-${platform}.bundle`,
        "-w",
        "%{http_code} %{size_download} %{time_total}",
        "--max-time",
        "1200",
        `http://127.0.0.1:8081${bundlePath(platform)}`,
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(err.trim() || `curl exit ${code}`));
        return;
      }
      resolve(out.trim());
    });
  });
}

(async () => {
  try {
    await waitForMetro();
    const platforms = ["android"];
    if (process.env.EXPO_PREWARM_IOS === "1") platforms.push("ios");
    for (const platform of platforms) {
      const label = platform === "ios" ? "iOS" : "Android";
    console.log(
        `Metro is up. Pre-building the ${label} bundle (keep the app closed until this finishes)...`
      );
      const result = await curlBundle(platform);
      console.log(`${label} bundle ready (${result}).`);
    }
    console.log("Open the app on your phone now.");
  } catch (error) {
    console.warn(`Bundle prewarm skipped: ${error.message}`);
  }
})();
