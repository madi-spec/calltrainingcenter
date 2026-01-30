import { useEffect, useCallback, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Global keyboard shortcuts configuration
 */
const SHORTCUTS = {
  // Navigation shortcuts (g + key)
  navigation: {
    'g h': { path: '/', description: 'Go to Home/Scenarios' },
    'g d': { path: '/dashboard', description: 'Go to Dashboard' },
    'g l': { path: '/leaderboard', description: 'Go to Leaderboard' },
    'g c': { path: '/courses', description: 'Go to Courses' },
    'g a': { path: '/my-assignments', description: 'Go to Assignments' },
    'g s': { path: '/settings', description: 'Go to Settings' },
    'g f': { path: '/favorites', description: 'Go to Favorites' }
  },
  // Global shortcuts
  global: {
    '?': { action: 'showHelp', description: 'Show keyboard shortcuts' },
    'Escape': { action: 'closeModal', description: 'Close modal/dialog' }
  },
  // Training-specific shortcuts (only active during training)
  training: {
    ' ': { action: 'toggleMute', description: 'Toggle mute' },
    'Escape': { action: 'endCall', description: 'End call (with confirmation)' }
  },
  // Pre-call shortcuts
  preCall: {
    'Enter': { action: 'startTraining', description: 'Start training (Ctrl+Enter)', requireCtrl: true }
  }
};

/**
 * Hook for global keyboard shortcuts
 */
export function useKeyboardShortcuts(options = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [pendingKey, setPendingKey] = useState(null);
  const [pendingTimeout, setPendingTimeout] = useState(null);

  const {
    onToggleMute,
    onEndCall,
    onStartTraining,
    onCloseModal,
    enabled = true,
    context = 'global' // 'global', 'training', 'preCall'
  } = options;

  // Check if an input element is focused
  const isInputFocused = useCallback(() => {
    const activeElement = document.activeElement;
    const tagName = activeElement?.tagName?.toLowerCase();
    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      activeElement?.isContentEditable
    );
  }, []);

  // Handle key press
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in inputs (except for specific keys)
    if (isInputFocused() && !['Escape'].includes(event.key)) {
      return;
    }

    const key = event.key;
    const withCtrl = event.ctrlKey || event.metaKey;
    const withShift = event.shiftKey;

    // Handle ? for help (shift+/)
    if (key === '?' || (key === '/' && withShift)) {
      event.preventDefault();
      setShowHelpModal(true);
      return;
    }

    // Handle Escape
    if (key === 'Escape') {
      event.preventDefault();
      if (showHelpModal) {
        setShowHelpModal(false);
        return;
      }
      if (context === 'training' && onEndCall) {
        onEndCall();
        return;
      }
      if (onCloseModal) {
        onCloseModal();
        return;
      }
      return;
    }

    // Handle Space for mute toggle (only in training context)
    if (key === ' ' && context === 'training' && onToggleMute) {
      event.preventDefault();
      onToggleMute();
      return;
    }

    // Handle Ctrl+Enter for start training
    if (key === 'Enter' && withCtrl && context === 'preCall' && onStartTraining) {
      event.preventDefault();
      onStartTraining();
      return;
    }

    // Handle 'g' prefix for navigation
    if (key === 'g' && !withCtrl && !withShift) {
      // Clear any existing timeout
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
      }

      setPendingKey('g');

      // Set timeout to clear pending key
      const timeout = setTimeout(() => {
        setPendingKey(null);
      }, 1000);
      setPendingTimeout(timeout);
      return;
    }

    // Handle second key after 'g'
    if (pendingKey === 'g') {
      const combo = `g ${key}`;
      const navShortcut = SHORTCUTS.navigation[combo];

      if (navShortcut) {
        event.preventDefault();
        navigate(navShortcut.path);
      }

      // Clear pending key
      setPendingKey(null);
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
        setPendingTimeout(null);
      }
    }
  }, [
    enabled,
    isInputFocused,
    showHelpModal,
    context,
    onToggleMute,
    onEndCall,
    onCloseModal,
    onStartTraining,
    pendingKey,
    pendingTimeout,
    navigate
  ]);

  // Set up event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (pendingTimeout) {
        clearTimeout(pendingTimeout);
      }
    };
  }, [handleKeyDown, pendingTimeout]);

  return {
    showHelpModal,
    setShowHelpModal,
    pendingKey,
    shortcuts: SHORTCUTS
  };
}

/**
 * Hook for training-specific shortcuts
 */
export function useTrainingShortcuts({ onToggleMute, onEndCall, enabled = true }) {
  return useKeyboardShortcuts({
    onToggleMute,
    onEndCall,
    enabled,
    context: 'training'
  });
}

/**
 * Hook for pre-call shortcuts
 */
export function usePreCallShortcuts({ onStartTraining, enabled = true }) {
  return useKeyboardShortcuts({
    onStartTraining,
    enabled,
    context: 'preCall'
  });
}

export default useKeyboardShortcuts;
