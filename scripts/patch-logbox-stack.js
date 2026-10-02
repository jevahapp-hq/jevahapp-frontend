/**
 * LogBox crashes with "undefined is not a function" when a warning's stack
 * is a string or missing, because the inspector calls `.some` on it.
 * Re-applied on start so a fresh install of react-native keeps the guard.
 */
const fs = require("fs");
const path = require("path");

function patchLogBoxStack() {
  const filePath = path.join(
    __dirname,
    "../node_modules/react-native/Libraries/LogBox/Data/LogBoxLog.js"
  );
  if (!fs.existsSync(filePath)) return;

  const text = fs.readFileSync(filePath, "utf8");
  if (text.includes("function stackOrEmpty")) return;

  const next = text
    .replace(
      `  getAvailableStack(): Stack {
    return this.symbolicated.status === 'COMPLETE'
      ? this.symbolicated.stack
      : this.stack;
  }

  getAvailableComponentStack(): Stack {
    return this.symbolicatedComponentStack.status === 'COMPLETE'
      ? this.symbolicatedComponentStack.stack
      : this.componentStack;
  }`,
      `  getAvailableStack(): Stack {
    return stackOrEmpty(
      this.symbolicated.status === 'COMPLETE'
        ? this.symbolicated.stack
        : this.stack,
    );
  }

  getAvailableComponentStack(): Stack {
    return stackOrEmpty(
      this.symbolicatedComponentStack.status === 'COMPLETE'
        ? this.symbolicatedComponentStack.stack
        : this.componentStack,
    );
  }`
    )
    .replace(
      "export default LogBoxLog;\n",
      `function stackOrEmpty(stack: mixed): Stack {
  if (Array.isArray(stack)) {
    return stack;
  }
  if (typeof stack === 'string') {
    try {
      const parseErrorStack =
        require('../../Core/Devtools/parseErrorStack').default;
      const parsed = parseErrorStack(stack);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (error) {
      // A bad stack should not take down the LogBox UI.
    }
  }
  return [];
}

export default LogBoxLog;
`
    );

  if (next === text) {
    console.warn("patch-logbox-stack: LogBoxLog.js did not match; left unchanged");
    return;
  }

  fs.writeFileSync(filePath, next);
}

patchLogBoxStack();
