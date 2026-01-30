import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {
  TUTORIAL_STEPS,
  TUTORIAL_STORAGE_KEY,
  getNextStep,
  getPreviousStep,
  getStepProgress
} from '../data/tutorialSteps';

const TutorialContext = createContext(null);

export function TutorialProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, authFetch } = useAuth();

  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load tutorial state from storage and API
  useEffect(() => {
    const loadTutorialState = async () => {
      try {
        // Check local storage first for fast load
        const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setCompletedSteps(parsed.completedSteps || []);

          // If tutorial was active, restore it
          if (parsed.isActive && parsed.currentStepId) {
            const step = TUTORIAL_STEPS.find(s => s.id === parsed.currentStepId);
            if (step) {
              setCurrentStep(step);
              setIsActive(true);
            }
          }
        }

        // Check if user has completed onboarding
        if (profile) {
          if (profile.onboarding_completed) {
            // Don't auto-start for users who completed
            if (!stored?.isActive) {
              setIsActive(false);
            }
          } else if (!profile.onboarding_skipped) {
            // New user who hasn't started or completed onboarding
            const progress = profile.onboarding_progress || {};
            if (progress.steps_completed) {
              setCompletedSteps(progress.steps_completed);
            }
            // Auto-start for new users
            if (!progress.started_at && !stored) {
              setIsActive(true);
              setCurrentStep(TUTORIAL_STEPS[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading tutorial state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTutorialState();
  }, [profile]);

  // Save state to local storage
  const saveState = useCallback((steps, step, active) => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify({
      completedSteps: steps,
      currentStepId: step?.id,
      isActive: active
    }));
  }, []);

  // Start the tutorial
  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStep(TUTORIAL_STEPS[0]);
    setCompletedSteps([]);
    saveState([], TUTORIAL_STEPS[0], true);

    // Navigate to dashboard if not already there
    if (location.pathname !== '/dashboard' && location.pathname !== '/') {
      navigate('/dashboard');
    }

    // Update backend
    authFetch('/api/onboarding/start', {
      method: 'POST'
    }).catch(console.error);
  }, [authFetch, saveState, navigate, location.pathname]);

  // Go to next step
  const nextStep = useCallback(async () => {
    if (!currentStep) return;

    const next = getNextStep(currentStep.id);

    // Mark current step as completed
    const newCompleted = [...new Set([...completedSteps, currentStep.id])];
    setCompletedSteps(newCompleted);

    if (next) {
      setCurrentStep(next);
      saveState(newCompleted, next, true);

      // Handle navigation actions
      if (next.action?.type === 'navigate') {
        navigate(next.action.path);
      } else if (next.action?.type === 'navigate-to-scenario') {
        // Fetch first available scenario and navigate to it
        try {
          const response = await authFetch('/api/scenarios');
          if (response.ok) {
            const data = await response.json();
            const scenarios = data.scenarios || [];
            if (scenarios.length > 0) {
              navigate(`/scenario/${scenarios[0].id}`);
            }
          }
        } catch (error) {
          console.error('Error fetching scenarios for tutorial:', error);
        }
      }

      // Update backend
      authFetch('/api/onboarding/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_id: currentStep.id,
          completed: true
        })
      }).catch(console.error);
    } else {
      // Tutorial complete
      completeTutorial();
    }
  }, [currentStep, completedSteps, navigate, authFetch, saveState]);

  // Go to previous step
  const previousStep = useCallback(() => {
    if (!currentStep) return;

    const prev = getPreviousStep(currentStep.id);
    if (prev) {
      setCurrentStep(prev);
      saveState(completedSteps, prev, true);
    }
  }, [currentStep, completedSteps, saveState]);

  // Skip to a specific step
  const goToStep = useCallback((stepId) => {
    const step = TUTORIAL_STEPS.find(s => s.id === stepId);
    if (step) {
      setCurrentStep(step);
      saveState(completedSteps, step, true);
    }
  }, [completedSteps, saveState]);

  // Complete the tutorial
  const completeTutorial = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(null);

    const allStepIds = TUTORIAL_STEPS.map(s => s.id);
    setCompletedSteps(allStepIds);
    saveState(allStepIds, null, false);

    // Update backend
    try {
      await authFetch('/api/onboarding/complete', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error completing tutorial:', error);
    }
  }, [authFetch, saveState]);

  // Skip the tutorial
  const skipTutorial = useCallback(async () => {
    setIsActive(false);
    setCurrentStep(null);
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);

    // Update backend
    try {
      await authFetch('/api/onboarding/skip', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Error skipping tutorial:', error);
    }
  }, [authFetch]);

  // Resume tutorial from where user left off
  const resumeTutorial = useCallback(() => {
    const lastCompletedIndex = TUTORIAL_STEPS.findIndex(
      step => !completedSteps.includes(step.id)
    );

    if (lastCompletedIndex >= 0) {
      setCurrentStep(TUTORIAL_STEPS[lastCompletedIndex]);
      setIsActive(true);
      saveState(completedSteps, TUTORIAL_STEPS[lastCompletedIndex], true);
    } else {
      // All steps completed, start from beginning
      setCurrentStep(TUTORIAL_STEPS[0]);
      setCompletedSteps([]);
      setIsActive(true);
      saveState([], TUTORIAL_STEPS[0], true);
    }
  }, [completedSteps, saveState]);

  // Get progress info
  const progress = currentStep ? getStepProgress(currentStep.id) : null;

  const value = {
    isActive,
    isLoading,
    currentStep,
    completedSteps,
    progress,
    startTutorial,
    nextStep,
    previousStep,
    goToStep,
    completeTutorial,
    skipTutorial,
    resumeTutorial,
    totalSteps: TUTORIAL_STEPS.length
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

export default TutorialContext;
