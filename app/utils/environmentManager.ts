
export type Environment = 'local' | 'production';

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
    url: process.env.EXPO_PUBLIC_API_URL || 'http://10.156.136.168:4000',
    name: 'Local Development'
  },
  production: {
    url: 'https://jevahapp-backend.onrender.com',
    name: 'Production'
  }
};

class EnvironmentManager {
  private currentEnvironment: Environment = 'production';
  private listeners: ((env: Environment) => void)[] = [];

  constructor() {
    this.detectEnvironment();
  }

  private detectEnvironment(): void {
    // Always prioritize the environment variable if it's set
    if (process.env.EXPO_PUBLIC_API_URL) {
      this.currentEnvironment = 'local';
      console.log('🌐 Using EXPO_PUBLIC_API_URL from environment:', process.env.EXPO_PUBLIC_API_URL);
    } else if (__DEV__) {
      // Only fall back to auto-detection if no environment variable is set
      this.currentEnvironment = 'local';
      console.log('🌐 No environment variable set, auto-detecting local environment');
    } else {
      // In production builds (APK, hosted), use production
      this.currentEnvironment = 'production';
    }
    
    console.log('🌐 Final environment:', this.currentEnvironment);
  }

  private async loadSavedEnvironment() {
    try {
      const saved = await AsyncStorage.getItem('selectedEnvironment');
      if (saved && (saved === 'local' || saved === 'production')) {
        this.currentEnvironment = saved;
      }
    } catch (error) {
      console.warn('Failed to load saved environment:', error);
    }
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
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentEnvironment));
  }
}

export const environmentManager = new EnvironmentManager();
