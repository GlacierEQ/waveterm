import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { AmazonQService } from '../services/amazon-q-service';
import { AIServiceConfig } from '../services/ai-service';
import { AmazonQConfig } from '../config/amazon-q-config';

interface AmazonQContextType {
  service: AmazonQService | null;
  config: AIServiceConfig | null;
  updateConfig: (newConfig: Partial<AIServiceConfig>) => void;
  isConfigured: boolean;
}

const AmazonQContext = createContext<AmazonQContextType | undefined>(undefined);

export const AmazonQProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [service, setService] = useState<AmazonQService | null>(null);
  const [config, setConfig] = useState<AIServiceConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Load config from localStorage on mount
  useEffect(() => {
    const loadConfig = () => {
      try {
        const savedConfig = localStorage.getItem('amazonQConfig');
        if (savedConfig) {
          const parsedConfig = JSON.parse(savedConfig);
          setConfig(parsedConfig);
          setService(new AmazonQService(parsedConfig));
          setIsConfigured(true);
        } else {
          // Initialize with default config if none exists
          const defaultConfig: AIServiceConfig = {
            apiKey: '',
            model: AmazonQConfig.DEFAULT_MODEL,
            temperature: AmazonQConfig.DEFAULT_TEMPERATURE,
            maxTokens: AmazonQConfig.DEFAULT_MAX_TOKENS,
          };
          setConfig(defaultConfig);
          setService(new AmazonQService(defaultConfig));
          setIsConfigured(false);
        }
      } catch (error) {
        console.error('Error loading Amazon Q config:', error);
      }
    };

    loadConfig();
  }, []);

  // Update config and save to localStorage
  const updateConfig = (newConfig: Partial<AIServiceConfig>) => {
    setConfig(prevConfig => {
      if (!prevConfig) return null;
      
      const updatedConfig = { ...prevConfig, ...newConfig };
      
      // Save to localStorage
      localStorage.setItem('amazonQConfig', JSON.stringify(updatedConfig));
      
      // Update service with new config
      if (service) {
        service.updateConfig(updatedConfig);
      } else {
        setService(new AmazonQService(updatedConfig));
      }
      
      // Update configured state based on API key presence
      setIsConfigured(!!updatedConfig.apiKey);
      
      return updatedConfig;
    });
  };

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
