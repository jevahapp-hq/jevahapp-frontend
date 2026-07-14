// Perf: avoid console overhead in production (73+ logs per session)
export const devLog = __DEV__ ? (...a: any[]) => console.log(...a) : () => {};
export const devWarn = __DEV__ ? (...a: any[]) => console.warn(...a) : () => {};
