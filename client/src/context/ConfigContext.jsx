import { createContext, useContext, useState, useCallback } from 'react';

const ConfigContext = createContext(null);

const defaultConfig = {
  settings: {
    defaultVoiceId: '11labs-Adrian',
    callTimeout: 600000,
    enableAnalytics: true
  },
  currentScenario: null,
  currentCall: null,
  lastResults: null
};

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(defaultConfig);

  // Set current scenario for training
  const setCurrentScenario = useCallback((scenario) => {
    setConfig(prev => ({ ...prev, currentScenario: scenario }));
  }, []);

  // Set current call info
  const setCurrentCall = useCallback((callInfo) => {
    setConfig(prev => ({ ...prev, currentCall: callInfo }));
  }, []);

  // Set last coaching results (supports function updaters like setState)
  const setLastResults = useCallback((resultsOrUpdater) => {
    setConfig(prev => ({
      ...prev,
      lastResults: typeof resultsOrUpdater === 'function'
        ? resultsOrUpdater(prev.lastResults)
        : resultsOrUpdater
    }));
  }, []);

  // Clear current session
  const clearSession = useCallback(() => {
    setConfig(prev => ({
      ...prev,
      currentScenario: null,
      currentCall: null
    }));
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings) => {
    setConfig(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  const value = {
    config,
    settings: config.settings,
    currentScenario: config.currentScenario,
    currentCall: config.currentCall,
    lastResults: config.lastResults,
    setCurrentScenario,
    setCurrentCall,
    setLastResults,
    clearSession,
    updateSettings
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
}

export default ConfigContext;
