import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Hook for polling analysis status
 * @param {string} sessionId - The session ID to poll
 * @param {object} options - Polling options
 * @param {number} options.interval - Polling interval in ms (default: 3000)
 * @param {boolean} options.enabled - Whether polling is enabled (default: true)
 * @param {function} options.onComplete - Callback when analysis completes
 * @param {function} options.onError - Callback when analysis fails
 */
function useAnalysisPolling(sessionId, options = {}) {
  const {
    interval = 3000,
    enabled = true,
    onComplete,
    onError
  } = options;

  const { getAuthHeader } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const pollCountRef = useRef(0);
  const timeoutRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    if (!sessionId) return;

    try {
      const headers = await getAuthHeader();
      const response = await fetch(`${API_URL}/api/analysis/status/${sessionId}`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analysis status');
      }

      const data = await response.json();
      setStatus(data.status);

      if (data.status === 'completed') {
        setResults(data.results);
        if (onComplete) {
          onComplete(data.results);
        }
        return true; // Signal to stop polling
      }

      if (data.status === 'failed') {
        setError(data.error || 'Analysis failed');
        if (onError) {
          onError(data.error);
        }
        return true; // Signal to stop polling
      }

      return false; // Continue polling
    } catch (err) {
      console.error('Error polling analysis status:', err);
      setError(err.message);
      return true; // Stop on error
    } finally {
      setLoading(false);
    }
  }, [sessionId, getAuthHeader, onComplete, onError]);

  const retryAnalysis = useCallback(async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      setStatus('pending');

      const headers = await getAuthHeader();
      const response = await fetch(`${API_URL}/api/analysis/retry/${sessionId}`, {
        method: 'POST',
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to retry analysis');
      }

      // Reset poll count and start polling again
      pollCountRef.current = 0;
    } catch (err) {
      console.error('Error retrying analysis:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId, getAuthHeader]);

  useEffect(() => {
    if (!enabled || !sessionId) return;

    let isMounted = true;

    const poll = async () => {
      if (!isMounted) return;

      pollCountRef.current += 1;
      const shouldStop = await fetchStatus();

      // Stop polling after completion, failure, or max attempts (2 minutes)
      if (!shouldStop && isMounted && pollCountRef.current < 40) {
        timeoutRef.current = setTimeout(poll, interval);
      }
    };

    poll();

    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [sessionId, enabled, interval, fetchStatus]);

  return {
    status,
    loading,
    error,
    results,
    retry: retryAnalysis,
    isComplete: status === 'completed',
    isFailed: status === 'failed',
    isPending: status === 'pending' || status === 'processing'
  };
}

export default useAnalysisPolling;
