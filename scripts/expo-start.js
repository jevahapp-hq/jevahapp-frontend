#!/usr/bin/env node

/**
 * Starts Expo with a phone-reachable LAN hostname (never 127.0.0.1).
 * Priority: .env REACT_NATIVE_PACKAGER_HOSTNAME → Wi-Fi IPv4 → lan-network.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") {
      process.env[key] = value;
    }
  }
}

function isUsableLanIp(address) {
  if (!address || typeof address !== "string") return false;
  if (address === "127.0.0.1" || address.startsWith("127.")) return false;
  // Link-local / APIPA
  if (address.startsWith("169.254.")) return false;
  // Common VPN / tunnel ranges (HotspotShield, CGNAT tunnels, etc.)
  if (address.startsWith("100.")) return false;
  if (address.startsWith("10.255.")) return false;
  return true;
}

function isPreferredInterface(name) {
  const n = String(name || "").toLowerCase();
  if (!n) return false;
  if (/hotspotshield|wintun|vpn|virtual|vmware|vbox|hyper-v|loopback|docker|vethernet|tailscale|zerotier/.test(n)) {
    return false;
  }
  return /wi-?fi|wlan|wireless|ethernet|eth/.test(n);
}

function fromOsInterfaces() {
  const preferred = [];
  const other = [];
  const ifaces = os.networkInterfaces();
  for (const [name, entries] of Object.entries(ifaces)) {
    for (const entry of entries || []) {
      const family = entry.family;
      const isV4 = family === "IPv4" || family === 4;
      if (!isV4 || entry.internal) continue;
      if (!isUsableLanIp(entry.address)) continue;
      const row = { name, address: entry.address };
      if (isPreferredInterface(name)) preferred.push(row);
      else other.push(row);
    }
  }
  return preferred[0]?.address || other[0]?.address || null;
}

function fromLanNetworkPackage() {
  try {
    const { lanNetworkSync } = require("lan-network");
    const network = lanNetworkSync();
    if (network?.address && isUsableLanIp(network.address)) {
      return network.address;
    }
  } catch {
    // optional dependency / detection failure
  }
  return null;
}

function localIpv4Set() {
  const set = new Set();
  const ifaces = os.networkInterfaces();
  for (const entries of Object.values(ifaces)) {
    for (const entry of entries || []) {
      const isV4 = entry.family === "IPv4" || entry.family === 4;
      if (isV4 && !entry.internal) set.add(entry.address);
    }
  }
  return set;
}

function resolveLanHostname() {
  const live = fromOsInterfaces() || fromLanNetworkPackage();
  const fromEnv = (process.env.REACT_NATIVE_PACKAGER_HOSTNAME || "").trim();

  // Prefer a live Wi-Fi/Ethernet IP when .env is missing, unusable, or stale
  // (common after router/DHCP change — stale IP → "site can't be reached").
  if (live) {
    if (!isUsableLanIp(fromEnv)) return live;
    const local = localIpv4Set();
    if (!local.has(fromEnv)) {
      console.warn(
        `REACT_NATIVE_PACKAGER_HOSTNAME=${fromEnv} is not on this machine.\n` +
          `Using live LAN IP instead: ${live} (update .env to match).`
      );
      return live;
    }
    return fromEnv;
  }

  if (isUsableLanIp(fromEnv)) return fromEnv;
  return null;
}

loadEnvFile();

const hostname = resolveLanHostname();
if (!hostname) {
  console.warn(
    "Could not resolve a LAN IP. Phone/Expo Go will not reach Metro via 127.0.0.1.\n" +
      "Set REACT_NATIVE_PACKAGER_HOSTNAME in .env to your Wi-Fi IPv4 (ipconfig)."
  );
} else {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = hostname;
  // Ensure Metro/Expo advertise this host in the QR / deep link.
  process.env.EXPO_PACKAGER_PROXY_URL = `http://${hostname}:8081`;
  console.log(`Using LAN IP: ${hostname}`);
  console.log(`Metro will advertise: exp://${hostname}:8081`);
}

const forwarded = process.argv.slice(2).filter((arg) => {
  // Prevent accidental --localhost from winning
  if (arg === "--localhost" || arg === "--tunnel") return false;
  if (arg === "--lan" || arg === "--host" || arg.startsWith("--host=")) return false;
  return true;
});

const expoArgs = [
  "expo",
  "start",
  "--dev-client",
  "--host",
  "lan",
  ...forwarded,
];

const child = spawn("npx", expoArgs, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
