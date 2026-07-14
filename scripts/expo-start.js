#!/usr/bin/env node

const { spawn } = require("child_process");
const { lanNetworkSync } = require("lan-network");

function resolveLanHostname() {
  try {
    const network = lanNetworkSync();
    if (network?.address) {
      return network.address;
    }
  } catch (error) {
    console.warn(
      "Could not auto-detect LAN IP, falling back to Expo defaults:",
      error.message
    );
  }

  return null;
}

const hostname = resolveLanHostname();
if (hostname) {
  process.env.REACT_NATIVE_PACKAGER_HOSTNAME = hostname;
  console.log(`Using LAN IP: ${hostname}`);
}

const expoArgs = ["expo", "start", "--dev-client", "--lan", ...process.argv.slice(2)];
const child = spawn("npx", expoArgs, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
