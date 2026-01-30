import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  User,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import { useRetellCall } from '../hooks/useRetellCall';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

function Training() {
  const navigate = useNavigate();
  const { currentScenario, setCurrentCall, setLastResults } = useConfig();
  const { organization: company } = useOrganization();
  const { authFetch } = useAuth();
  const {
    callState,
    transcript,
    error,
    callDuration,
    isMuted,
    isConnecting,
    isConnected,
    isEnding,
    startCall,
    endCall,
    toggleMute,
    reset
  } = useRetellCall();

  const [callStarted, setCallStarted] = useState(false);

  // Redirect if no scenario selected
  useEffect(() => {
    if (!currentScenario) {
      navigate('/');
    }
  }, [currentScenario, navigate]);

  // Start call when component mounts - only once
  useEffect(() => {
    if (currentScenario && callState === 'idle' && !callStarted) {
      setCallStarted(true);
      startCall(currentScenario);
    }
  }, [currentScenario, callState, callStarted, startCall]);

  const handleEndCall = async () => {
    let callData = null;

    try {
      callData = await endCall();
    } catch (err) {
      console.error('Error ending call:', err);
      // Create fallback call data from current state
      callData = {
        callId: null,
        transcript: { formatted: transcript, raw: '' },
        duration: callDuration
      };
    }

    // Ensure we have valid call data
    if (!callData) {
      callData = {
        callId: null,
        transcript: { formatted: transcript, raw: '' },
        duration: callDuration
      };
    }

    setCurrentCall(callData);

    // Start async analysis - don't wait for it to complete
    const analysisId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store pending results with analysis ID for Results page to poll
    const pendingResults = {
      analysisId,
      sessionId: callData.sessionId,  // Database session ID
      analysisStatus: 'processing',
      transcript: callData.transcript,
      scenario: currentScenario,
      duration: callData.duration
    };

    // Set results in context
    setLastResults(pendingResults);

    // Also persist to sessionStorage as backup in case of page refresh
    try {
      sessionStorage.setItem('lastTrainingResults', JSON.stringify(pendingResults));
    } catch (e) {
      console.error('Error saving to sessionStorage:', e);
    }

    // Fire off the analysis request (don't await the full response)
    try {
      authFetch('/api/analysis/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: formatTranscriptForAnalysis(callData.transcript),
          scenario: currentScenario,
          callDuration: callData.duration,
          sessionId: analysisId
        })
      }).catch(err => console.error('Error starting analysis:', err));
    } catch (err) {
      console.error('Error starting analysis:', err);
    }

    // Navigate immediately - Results page will handle polling
    navigate('/results');
  };

  const formatTranscriptForAnalysis = (transcriptData) => {
    if (!transcriptData) return '';
    if (transcriptData.raw) return transcriptData.raw;
    if (transcriptData.formatted) {
      return transcriptData.formatted
        .map(entry => `${entry.role === 'customer' ? 'Customer' : 'CSR'}: ${entry.content}`)
        .join('\n');
    }
    if (Array.isArray(transcriptData)) {
      return transcriptData
        .map(entry => `${entry.role === 'agent' ? 'Customer' : 'CSR'}: ${entry.content}`)
        .join('\n');
    }
    return String(transcriptData);
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentScenario) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="glass-card border-t-0 border-x-0 rounded-none">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
            <div>
              <h1 className="text-lg font-semibold text-white">
                {currentScenario.name}
              </h1>
              <p className="text-sm text-gray-400">
                Training with {currentScenario.customerName}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="font-mono text-lg">{formatDuration(callDuration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {/* Connecting State */}
          {isConnecting && (
            <motion.div
              key="connecting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <div className="w-32 h-32 mx-auto mb-6 relative">
                <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Phone className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Connecting...</h2>
              <p className="text-gray-400">Setting up your training call</p>
            </motion.div>
          )}

          {/* Connected State */}
          {isConnected && (
            <motion.div
              key="connected"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-2xl"
            >
              {/* Customer Avatar */}
              <div className="text-center mb-8">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25"
                >
                  <User className="w-12 h-12 text-white" />
                </motion.div>
                <h2 className="text-xl font-semibold text-white">
                  {currentScenario.customerName}
                </h2>
                <p className="text-green-400 text-sm">On Call</p>
              </div>

              {/* Transcript */}
              <Card className="mb-6 max-h-64 overflow-y-auto scrollbar-hide">
                <Card.Header>
                  <Card.Title className="text-sm">Live Transcript</Card.Title>
                </Card.Header>
                <Card.Content>
                  {transcript.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      Conversation will appear here...
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {transcript.map((entry, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-3 ${
                            entry.role === 'agent' ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 ${
                              entry.role === 'agent'
                                ? 'bg-purple-500/20 text-purple-100'
                                : 'bg-blue-500/20 text-blue-100'
                            }`}
                          >
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {entry.role === 'agent' ? currentScenario.customerName : 'You'}
                            </p>
                            <p className="text-sm">{entry.content}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </Card.Content>
              </Card>

              {/* Call Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant={isMuted ? 'danger' : 'secondary'}
                  size="lg"
                  onClick={toggleMute}
                  className="rounded-full w-14 h-14"
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  onClick={handleEndCall}
                  disabled={isEnding}
                  className="rounded-full w-16 h-16"
                >
                  {isEnding ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <PhoneOff className="w-6 h-6" />
                  )}
                </Button>
              </div>

              {/* Tips */}
              <div className="mt-8 text-center">
                <p className="text-sm text-gray-500">
                  Speak naturally. The AI customer will respond to your tone and approach.
                </p>
              </div>
            </motion.div>
          )}

          {/* Ending State */}
          {isEnding && (
            <motion.div
              key="ending"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-6 animate-spin" />
              <h2 className="text-2xl font-bold text-white mb-2">Ending Call...</h2>
              <p className="text-gray-400">Saving your conversation</p>
            </motion.div>
          )}

          {/* Error State */}
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center"
            >
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-12 h-12 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Connection Error</h2>
              <p className="text-gray-400 mb-6">{error}</p>
              <div className="flex gap-4 justify-center">
                <Button variant="secondary" onClick={() => navigate('/')}>
                  Back to Scenarios
                </Button>
                <Button onClick={() => { reset(); startCall(currentScenario); }}>
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Company Context Bar */}
      <div className="glass-card border-b-0 border-x-0 rounded-none">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-center gap-6 text-xs text-gray-500">
          <span>{company.name}</span>
          <span>•</span>
          <span>${company.pricing?.quarterlyPrice}/quarter</span>
          <span>•</span>
          <span>{company.guarantees?.[0]}</span>
        </div>
      </div>
    </div>
  );
}

export default Training;
