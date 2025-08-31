import { useEffect, useState } from 'react';
import { Environment, environmentManager } from '../utils/environmentManager';

export const useEnvironment = () => {
  const [currentEnvironment, setCurrentEnvironment] = useState<Environment>('production');

  useEffect(() => {
    // Set initial environment
    setCurrentEnvironment(environmentManager.getCurrentEnvironment());

    // Listen for environment changes
    const unsubscribe = environmentManager.addListener((env) => {
      setCurrentEnvironment(env);
    });

    return unsubscribe;
  }, []);

  const getCurrentUrl = () => environmentManager.getCurrentUrl();
  const getEnvironmentName = (env: Environment) => environmentManager.getEnvironmentName(env);

  return {
    currentEnvironment,
    getCurrentUrl,
    getEnvironmentName,
  };
};
