import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AccessibilityContext = createContext(null);

const DEFAULT_SETTINGS = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  screenReaderMode: false,
  keyboardOnly: false
};

export function AccessibilityProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    }

    // Check system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: more)').matches;

    return {
      ...DEFAULT_SETTINGS,
      reduceMotion: prefersReducedMotion,
      highContrast: prefersHighContrast
    };
  });

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  // Apply settings to document
  useEffect(() => {
    const html = document.documentElement;

    // Reduced motion
    if (settings.reduceMotion) {
      html.classList.add('reduce-motion');
    } else {
      html.classList.remove('reduce-motion');
    }

    // High contrast
    if (settings.highContrast) {
      html.classList.add('high-contrast');
    } else {
      html.classList.remove('high-contrast');
    }

    // Large text
    if (settings.largeText) {
      html.classList.add('large-text');
    } else {
      html.classList.remove('large-text');
    }

    // Keyboard only mode (show focus indicators)
    if (settings.keyboardOnly) {
      html.classList.add('keyboard-user');
    } else {
      html.classList.remove('keyboard-user');
    }
  }, [settings]);

  // Listen for system preference changes
  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');

    const handleMotionChange = (e) => {
      setSettings((prev) => ({ ...prev, reduceMotion: e.matches }));
    };

    const handleContrastChange = (e) => {
      setSettings((prev) => ({ ...prev, highContrast: e.matches }));
    };

    motionQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  // Detect keyboard navigation
  useEffect(() => {
    let isKeyboardUser = false;

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        isKeyboardUser = true;
        document.documentElement.classList.add('keyboard-user');
      }
    };

    const handleMouseDown = () => {
      if (isKeyboardUser) {
        isKeyboardUser = false;
        if (!settings.keyboardOnly) {
          document.documentElement.classList.remove('keyboard-user');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [settings.keyboardOnly]);

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Announce to screen readers
  const announce = useCallback((message, priority = 'polite') => {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', priority);
    el.setAttribute('aria-atomic', 'true');
    el.className = 'sr-only';
    el.textContent = message;
    document.body.appendChild(el);

    setTimeout(() => {
      document.body.removeChild(el);
    }, 1000);
  }, []);

  const value = {
    ...settings,
    updateSetting,
    resetSettings,
    announce
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

export default AccessibilityContext;
