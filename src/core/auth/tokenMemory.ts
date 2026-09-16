/**
 * In-memory JWT so taps and API calls do not wait on SecureStore.
 * `undefined` = not hydrated yet. `null` = known logged-out.
 */
let memoryToken: string | null | undefined;

export function peekAuthToken(): string | null | undefined {
  return memoryToken;
}

export function cacheAuthToken(token: string | null): void {
  memoryToken = token;
}

export function resetAuthTokenMemory(): void {
  memoryToken = undefined;
}
