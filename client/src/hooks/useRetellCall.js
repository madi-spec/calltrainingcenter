import { useState, useEffect, useRef, useCallback } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';
import { useAuth } from '../context/AuthContext';

const CALL_STATES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDING: 'ending',
  ENDED: 'ended',
  ERROR: 'error'
};

export function useRetellCall() {
  const { authFetch } = useAuth();
  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const retellClientRef = useRef(null);
  const callIdRef = useRef(null);
  const sessionIdRef = useRef(null);  // Database session ID
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const initializedRef = useRef(false);
  const startingCallRef = useRef(false);  // Prevent concurrent startCall calls

  // Initialize Retell client - only once
  useEffect(() => {
    // Prevent double initialization in React 18 Strict Mode
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    retellClientRef.current = new RetellWebClient();

    const client = retellClientRef.current;

    client.on('call_started', () => {
      console.log('Call started');
      setCallState(CALL_STATES.CONNECTED);
      startTimeRef.current = Date.now();

      // Start duration timer
      timerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    });

    client.on('call_ended', () => {
      console.log('Call ended');
      setCallState(CALL_STATES.ENDED);
      startingCallRef.current = false;  // Reset for next call
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    });

    client.on('agent_start_talking', () => {
      console.log('Agent started talking');
    });

    client.on('agent_stop_talking', () => {
      console.log('Agent stopped talking');
    });

    client.on('update', (update) => {
      if (update.transcript) {
        setTranscript(update.transcript);
      }
    });

    client.on('error', (error) => {
      console.error('Retell error:', error);
      setError(error.message || 'An error occurred during the call');
      setCallState(CALL_STATES.ERROR);
      startingCallRef.current = false;  // Reset on error
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Clean up client on unmount
      if (retellClientRef.current) {
        try {
          retellClientRef.current.stopCall();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  // Start a call
  const startCall = useCallback(async (scenario) => {
    // Prevent concurrent call starts
    if (startingCallRef.current) {
      console.log('startCall already in progress, ignoring duplicate call');
      return;
    }
    startingCallRef.current = true;

    try {
      console.log('Starting call for scenario:', scenario.name);
      setCallState(CALL_STATES.CONNECTING);
      setError(null);
      setTranscript([]);
      setCallDuration(0);

      // Create training call via backend
      const response = await authFetch('/api/calls/create-training-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: scenario.id,
          scenario
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create call');
      }

      const data = await response.json();
      callIdRef.current = data.callId;
      sessionIdRef.current = data.sessionId;  // Store database session ID

      // Start the web call
      console.log('Starting Retell web call with access token');
      await retellClientRef.current.startCall({
        accessToken: data.accessToken,
        sampleRate: data.sampleRate || 24000,
        captureDeviceId: 'default',
        playbackDeviceId: 'default',
        emitRawAudioSamples: false
      });
      console.log('Retell startCall completed successfully');

    } catch (err) {
      console.error('Error starting call:', err);
      setError(err.message);
      setCallState(CALL_STATES.ERROR);
      startingCallRef.current = false;  // Reset on error
      throw err;
    }
  }, [authFetch]);

  // End the call
  const endCall = useCallback(async () => {
    try {
      setCallState(CALL_STATES.ENDING);

      // Stop the client call
      retellClientRef.current.stopCall();

      // End call on backend and get transcript
      if (callIdRef.current) {
        const response = await authFetch('/api/calls/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: callIdRef.current })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            callId: callIdRef.current,
            sessionId: sessionIdRef.current,
            transcript: data.transcript,
            duration: callDuration
          };
        }
      }

      return {
        callId: callIdRef.current,
        sessionId: sessionIdRef.current,
        transcript: { formatted: transcript, raw: '' },
        duration: callDuration
      };
    } catch (err) {
      console.error('Error ending call:', err);
      setCallState(CALL_STATES.ENDED);
      return {
        callId: callIdRef.current,
        sessionId: sessionIdRef.current,
        transcript: { formatted: transcript, raw: '' },
        duration: callDuration
      };
    }
  }, [authFetch, callDuration, transcript]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (retellClientRef.current) {
      if (isMuted) {
        retellClientRef.current.unmute();
      } else {
        retellClientRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Reset state
  const reset = useCallback(() => {
    setCallState(CALL_STATES.IDLE);
    setTranscript([]);
    setError(null);
    setCallDuration(0);
    setIsMuted(false);
    callIdRef.current = null;
    sessionIdRef.current = null;
    startingCallRef.current = false;  // Reset for retry
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  }, []);

  return {
    callState,
    transcript,
    error,
    callDuration,
    isMuted,
    isConnecting: callState === CALL_STATES.CONNECTING,
    isConnected: callState === CALL_STATES.CONNECTED,
    isEnding: callState === CALL_STATES.ENDING,
    isEnded: callState === CALL_STATES.ENDED,
    hasError: callState === CALL_STATES.ERROR,
    startCall,
    endCall,
    toggleMute,
    reset,
    CALL_STATES
  };
}

export default useRetellCall;
