import { useState, useEffect, useRef, useCallback } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';

const CALL_STATES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ENDING: 'ending',
  ENDED: 'ended',
  ERROR: 'error'
};

export function useRetellCall() {
  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const retellClientRef = useRef(null);
  const callIdRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Initialize Retell client
  useEffect(() => {
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
    });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start a call
  const startCall = useCallback(async (scenario) => {
    try {
      setCallState(CALL_STATES.CONNECTING);
      setError(null);
      setTranscript([]);
      setCallDuration(0);

      // Create training call via backend
      const response = await fetch('/api/calls/create-training-call', {
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

      // Start the web call
      await retellClientRef.current.startCall({
        accessToken: data.accessToken,
        sampleRate: data.sampleRate || 24000,
        captureDeviceId: 'default'
      });

    } catch (err) {
      console.error('Error starting call:', err);
      setError(err.message);
      setCallState(CALL_STATES.ERROR);
      throw err;
    }
  }, []);

  // End the call
  const endCall = useCallback(async () => {
    try {
      setCallState(CALL_STATES.ENDING);

      // Stop the client call
      retellClientRef.current.stopCall();

      // End call on backend and get transcript
      if (callIdRef.current) {
        const response = await fetch('/api/calls/end', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callId: callIdRef.current })
        });

        if (response.ok) {
          const data = await response.json();
          return {
            callId: callIdRef.current,
            transcript: data.transcript,
            duration: callDuration
          };
        }
      }

      return {
        callId: callIdRef.current,
        transcript: { formatted: transcript, raw: '' },
        duration: callDuration
      };
    } catch (err) {
      console.error('Error ending call:', err);
      setCallState(CALL_STATES.ENDED);
      return {
        callId: callIdRef.current,
        transcript: { formatted: transcript, raw: '' },
        duration: callDuration
      };
    }
  }, [callDuration, transcript]);

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
