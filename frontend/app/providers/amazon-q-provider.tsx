import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { AmazonQService } from '../services/amazon-q-service';
import { AIServiceConfig } from '../services/ai-service';
import { AmazonQConfig } from '../config/amazon-q-config';

interface AmazonQContextType {
  service: AmazonQService | null;
  config: AIServiceConfig;
  updateConfig: (newConfig: Partial<AIServiceConfig>) => void;
  isConfigured: boolean;
}

const AmazonQContext = createContext<AmazonQContextType | undefined>(undefined);

const STORAGE_KEY = 'amazonQConfig';
const defaultConfig: AIServiceConfig = {
  apiKey: '',
  apiUrl: AmazonQConfig.API_ENDPOINT,
  model: AmazonQConfig.DEFAULT_MODEL,
  temperature: AmazonQConfig.DEFAULT_TEMPERATURE,
  maxTokens: AmazonQConfig.DEFAULT_MAX_TOKENS,
};

export const AmazonQProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [service, setService] = useState<AmazonQService | null>(null);
  const [config, setConfig] = useState<AIServiceConfig>(defaultConfig);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const loadConfig = () => {
      if (typeof window === 'undefined') return;

      try {
        const savedConfig = window.localStorage.getItem(STORAGE_KEY);
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig({ ...defaultConfig, ...parsedConfig });
        } else {
          setConfig(defaultConfig);
        }
      } catch (error) {
        console.error('Error loading Amazon Q config:', error);
        setConfig(defaultConfig);
      } finally {
        setIsHydrated(true);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    const validConfig = Boolean(config.apiKey && config.apiUrl);
    setIsConfigured(validConfig);
    if (validConfig) {
      setService(new AmazonQService(config));
    } else {
      setService(null);
    }
  }, [config]);

  const persistConfig = (updatedConfig: AIServiceConfig) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfig));
  };

  // Update config and save to localStorage
  const updateConfig = (newConfig: Partial<AIServiceConfig>) => {
    setConfig(prevConfig => {
      const updatedConfig = { ...prevConfig, ...newConfig };
      persistConfig(updatedConfig);
      return updatedConfig;
    });
  };

  if (!isHydrated) {
    return null;
  }

  return (
    <AmazonQContext.Provider value={{ service, config, updateConfig, isConfigured }}>
      {children}
    </AmazonQContext.Provider>
  );
};

export const useAmazonQ = () => {
  const context = useContext(AmazonQContext);
  if (context === undefined) {
    throw new Error('useAmazonQ must be used within an AmazonQProvider');
  }
  return context;
};
