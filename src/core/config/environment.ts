import { Platform } from "react-native";

/**
 * API environment switch.
 *
 * Set in `.env`:
 *   EXPO_PUBLIC_API_ENV=production   # live: https://api.jevahapp.com
 *   EXPO_PUBLIC_API_ENV=local        # local backend
 *
 * Optional URL overrides:
 *   EXPO_PUBLIC_API_URL_LOCAL=http://192.168.x.x:4000   # physical device
 *   EXPO_PUBLIC_API_URL_PRODUCTION=https://api.jevahapp.com
 *
 * Legacy: EXPO_PUBLIC_API_URL is treated as the production URL when env=production.
 */

export type Environment = "local" | "production";

export const PRODUCTION_API_URL = "https://api.jevahapp.com";

/** Android emulator → host machine. iOS simulator → localhost. */
function defaultLocalApiUrl(): string {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000";
  }
  return "http://localhost:4000";
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function parseApiEnv(raw: string | undefined): Environment {
  const value = (raw || "").trim().toLowerCase();
  if (
    value === "local" ||
    value === "dev" ||
    value === "development" ||
    value === "localhost"
  ) {
    return "local";
  }
  return "production";
}

export function resolveApiEnvironment(): Environment {
  return parseApiEnv(process.env.EXPO_PUBLIC_API_ENV);
}

export function resolveApiBaseUrl(
  environment: Environment = resolveApiEnvironment()
): string {
  if (environment === "local") {
    const local =
      process.env.EXPO_PUBLIC_API_URL_LOCAL?.trim() || defaultLocalApiUrl();
    return stripTrailingSlash(local);
  }

  const production =
    process.env.EXPO_PUBLIC_API_URL_PRODUCTION?.trim() ||
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    PRODUCTION_API_URL;

  return stripTrailingSlash(production);
}

const ENVIRONMENT_NAMES: Record<Environment, string> = {
  local: "Local Development",
  production: "Production",
};

class EnvironmentManager {
  private currentEnvironment: Environment;
  private listeners: Array<(env: Environment) => void> = [];

  constructor() {
    this.currentEnvironment = resolveApiEnvironment();
  }

  getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  getCurrentUrl(): string {
    return resolveApiBaseUrl(this.currentEnvironment);
  }

  getEnvironmentName(environment: Environment): string {
    return ENVIRONMENT_NAMES[environment];
  }

  /** Dev-only helper — restart Metro after changing .env for a full switch. */
  setEnvironment(environment: Environment): void {
    if (this.currentEnvironment === environment) return;
    this.currentEnvironment = environment;
    this.notifyListeners();
  }

  addListener(listener: (env: Environment) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentEnvironment));
  }
}

export const environmentManager = new EnvironmentManager();

/** Canonical API origin used across the app (no trailing slash). */
export const API_BASE_URL = environmentManager.getCurrentUrl();

export function getApiBaseUrl(): string {
  return environmentManager.getCurrentUrl();
}

if (__DEV__) {
  console.log(
    `🌐 API env=${environmentManager.getCurrentEnvironment()} url=${API_BASE_URL}`
  );
}
