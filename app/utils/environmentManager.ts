export type Environment = "local" | "production";

interface EnvironmentConfig {
  local: {
    url: string;
    name: string;
  };
  production: {
    url: string;
    name: string;
  };
}

const ENVIRONMENT_CONFIG: EnvironmentConfig = {
  local: {
    url: process.env.EXPO_PUBLIC_API_URL || "http://10.156.136.168:4000",
    name: "Local Development",
  },
  production: {
    url: "https://api.jevahapp.com",
    name: "Production",
  },
};

class EnvironmentManager {
  private currentEnvironment: Environment = "production";
  private listeners: ((env: Environment) => void)[] = [];

  constructor() {
    this.detectEnvironment();
  }

  private detectEnvironment(): void {
    // Always use production environment — EXPO_PUBLIC_API_URL in .env already points
    // to the production server, so we never want to fall back to a local IP.
    this.currentEnvironment = "production";
  }

  getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  getCurrentUrl(): string {
    return ENVIRONMENT_CONFIG[this.currentEnvironment].url;
  }

  getEnvironmentName(environment: Environment): string {
    return ENVIRONMENT_CONFIG[environment].name;
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
