import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook to manage onboarding tour state
 * @returns {Object} Onboarding state and controls
 */
export const useOnboarding = () => {
  const { profile, authFetch, refreshProfile } = useAuth();
  const [shouldShowTour, setShouldShowTour] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user has completed onboarding
  useEffect(() => {
    if (profile) {
      const hasCompletedOnboarding = profile.onboarding_completed === true;

      // Show tour if:
      // 1. User hasn't completed onboarding
      // 2. User is a trainee (primary users of the platform)
      // 3. Not already shown in this session
      const sessionKey = `onboarding_shown_${profile.id}`;
      const shownInSession = sessionStorage.getItem(sessionKey);

      if (!hasCompletedOnboarding && !shownInSession) {
        // Add a small delay to ensure dashboard is fully rendered
        const timer = setTimeout(() => {
          setShouldShowTour(true);
          sessionStorage.setItem(sessionKey, 'true');
        }, 1000);

        setIsLoading(false);
        return () => clearTimeout(timer);
      }

      setIsLoading(false);
    }
  }, [profile]);

  // Mark onboarding as complete
  const completeOnboarding = useCallback(async () => {
    if (!profile?.id) {
      console.error('No profile found');
      return false;
    }

    try {
      const response = await authFetch('/api/users/onboarding-complete', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Refresh profile to get updated onboarding_completed status
        await refreshProfile();
        setShouldShowTour(false);
        return true;
      } else {
        const error = await response.json();
        console.error('Failed to complete onboarding:', error);
        return false;
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return false;
    }
  }, [profile, authFetch, refreshProfile]);

  // Reset onboarding (for testing purposes)
  const resetOnboarding = useCallback(async () => {
    if (!profile?.id) return false;

    try {
      const response = await authFetch(`/api/users/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences: {
            ...profile.preferences,
            onboarding_completed: false
          }
        }),
      });

      if (response.ok) {
        await refreshProfile();
        sessionStorage.removeItem(`onboarding_shown_${profile.id}`);
        setShouldShowTour(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      return false;
    }
  }, [profile, authFetch, refreshProfile]);

  // Skip tour without marking as complete (user can see it again next time)
  const skipTour = useCallback(() => {
    setShouldShowTour(false);
  }, []);

  return {
    shouldShowTour,
    isLoading,
    completeOnboarding,
    resetOnboarding,
    skipTour,
    hasCompletedOnboarding: profile?.onboarding_completed === true,
  };
};

export default useOnboarding;
