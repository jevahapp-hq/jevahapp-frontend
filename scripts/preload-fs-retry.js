/**
 * Metro on Windows + OneDrive hits EMFILE (too many open files).
 * graceful-fs only retries callback-style fs, not fs.promises, which is
 * what Metro's cache uses. Retry those opens so a bundle can finish.
 */
const fs = require("fs");

if (!global.__jevahFsRetry) {
  global.__jevahFsRetry = true;
  installFsRetry(fs);
}

function installFsRetry(fs) {

try {
  require("graceful-fs").gracefulify(fs);
} catch {
  // transitive dep; promises retry below still applies
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function wrap(fn) {
  if (typeof fn !== "function" || fn.__emfileWrapped) return fn;
  const wrapped = async function (...args) {
    let delay = 25;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        if (!error || (error.code !== "EMFILE" && error.code !== "ENFILE") || attempt === 9) {
          throw error;
        }
        await sleep(delay);
        delay = Math.min(delay * 2, 400);
      }
    }
  };
  wrapped.__emfileWrapped = true;
  return wrapped;
}

const fsp = fs.promises;
for (const name of ["open", "readFile", "stat", "lstat", "readdir", "realpath"]) {
  if (typeof fsp[name] === "function") {
    fsp[name] = wrap(fsp[name]);
  }
}
}
