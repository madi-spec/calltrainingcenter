import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  MessageCircle,
  Clock,
  RotateCcw,
  BarChart2,
  Play,
  Loader2,
  CheckCircle2,
  Brain,
  FileText,
  BarChart
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ScoreRing from '../components/coaching/ScoreRing';
import CategoryScore from '../components/coaching/CategoryScore';
import PracticeAgainButton from '../components/training/PracticeAgainButton';
import ShareButton from '../components/social/ShareButton';

function Results() {
  const navigate = useNavigate();
  const { lastResults, setLastResults, clearSession } = useConfig();
  const { authFetch } = useAuth();

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('processing');
  const [recoveredFromStorage, setRecoveredFromStorage] = useState(false);
  const [usingSyncFallback, setUsingSyncFallback] = useState(false);

  // Try to recover results from sessionStorage if not in context
  useEffect(() => {
    if (!lastResults && !recoveredFromStorage) {
      setRecoveredFromStorage(true);
      try {
        const stored = sessionStorage.getItem('lastTrainingResults');
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('Recovered results from sessionStorage:', parsed);
          setLastResults(parsed);
        }
      } catch (e) {
        console.error('Error recovering from sessionStorage:', e);
      }
    }
  }, [lastResults, recoveredFromStorage, setLastResults]);

  // Save session results to database
  const saveSessionResults = useCallback(async (analysis) => {
    const sessionId = lastResults?.sessionId;
    console.log('[SESSION SAVE] Attempting to save, sessionId:', sessionId);
    if (!sessionId) {
      console.log('[SESSION SAVE] No session ID, skipping database save');
      return;
    }

    try {
      const response = await authFetch(`/api/training/session/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript_raw: lastResults?.transcript?.raw || '',
          transcript_formatted: lastResults?.transcript?.formatted || [],
          overall_score: analysis.overallScore,
          category_scores: analysis.categories,
          strengths: analysis.strengths,
          improvements: analysis.improvements,
          duration_seconds: lastResults?.duration || 0
        })
      });

      if (response.ok) {
        console.log('[SESSION SAVE] Success - session saved to database');
      } else {
        const errorText = await response.text();
        console.error('[SESSION SAVE] Failed:', response.status, errorText);
      }
    } catch (err) {
      console.error('[SESSION SAVE] Error:', err);
    }
  }, [lastResults?.sessionId, lastResults?.transcript, lastResults?.duration, authFetch]);

  // Fallback to synchronous analysis
  const runSyncAnalysis = useCallback(async () => {
    if (usingSyncFallback) return;

    setUsingSyncFallback(true);

    try {
      // Format transcript for analysis
      const transcript = lastResults?.transcript;
      let transcriptText = '';

      if (transcript?.raw && transcript.raw.length > 0) {
        transcriptText = transcript.raw;
      } else if (transcript?.formatted && Array.isArray(transcript.formatted) && transcript.formatted.length > 0) {
        transcriptText = transcript.formatted
          .map(entry => `${entry.role === 'agent' ? 'Customer' : 'CSR'}: ${entry.content}`)
          .join('\n');
      } else if (Array.isArray(transcript) && transcript.length > 0) {
        // Direct array from Retell
        transcriptText = transcript
          .map(entry => `${entry.role === 'agent' ? 'Customer' : 'CSR'}: ${entry.content}`)
          .join('\n');
      } else if (typeof transcript === 'string' && transcript.length > 0) {
        transcriptText = transcript;
      }

      if (!transcriptText || transcriptText.length < 10) {
        console.error('No valid transcript found for analysis');
        setLastResults(prev => ({
          ...prev,
          analysisStatus: 'failed',
          analysisError: 'No transcript available for analysis'
        }));
        return;
      }

      const response = await authFetch('/api/analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptText,
          scenario: lastResults.scenario,
          callDuration: lastResults.duration
        })
      });

      if (response.ok) {
        const data = await response.json();
        setLastResults(prev => ({
          ...prev,
          analysis: data.analysis,
          analysisStatus: 'completed'
        }));
        // Save results to database
        saveSessionResults(data.analysis);
      } else {
        console.error('Analysis failed with status:', response.status);
        setLastResults(prev => ({
          ...prev,
          analysisStatus: 'failed',
          analysisError: `Analysis failed: ${response.status}`
        }));
      }
    } catch (err) {
      console.error('Sync analysis error:', err);
      setLastResults(prev => ({
        ...prev,
        analysisStatus: 'failed',
        analysisError: err.message
      }));
    }
  }, [lastResults?.transcript, lastResults?.scenario, lastResults?.duration, usingSyncFallback, authFetch, setLastResults, saveSessionResults]);

  // Poll for analysis completion
  const pollAnalysis = useCallback(async () => {
    if (!lastResults?.analysisId || lastResults?.analysis || usingSyncFallback) return;

    try {
      const response = await authFetch(`/api/analysis/status/${lastResults.analysisId}`);

      if (!response.ok) {
        // Polling failed - fall back to sync analysis immediately
        // (Vercel serverless doesn't maintain in-memory state between requests)
        runSyncAnalysis();
        return;
      }

      const data = await response.json();

      if (data.status === 'completed') {
        // Update results with completed analysis
        setLastResults(prev => ({
          ...prev,
          analysis: data.analysis,
          analysisStatus: 'completed'
        }));
        // Save results to database
        saveSessionResults(data.analysis);

        // Update module progress if this is a generated scenario
        if (lastResults.scenario?.isGeneratedScenario && lastResults.scenario?.moduleId) {
          try {
            const score = data.analysis?.overallScore || 0;
            const won = score >= 70;

            await authFetch(`/api/modules/${lastResults.scenario.moduleId}/complete-scenario`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                scenario_id: lastResults.scenario.id,
                won,
                score
              })
            });
          } catch (moduleErr) {
            console.error('Error updating module progress:', moduleErr);
          }
        }
      } else if (data.status === 'failed') {
        setLastResults(prev => ({
          ...prev,
          analysisStatus: 'failed',
          analysisError: data.error
        }));
      } else if (data.status === 'not_found') {
        // Analysis not found in memory - fall back to sync
        console.log('Analysis not found, falling back to sync...');
        runSyncAnalysis();
      } else {
        // Still processing - update progress
        const elapsed = data.elapsedMs || 0;
        const estimated = data.estimatedTotalMs || 15000;
        setAnalysisProgress(Math.min(95, (elapsed / estimated) * 100));
      }
    } catch (err) {
      console.error('Error polling analysis:', err);
      runSyncAnalysis();
    }
  }, [lastResults?.analysisId, lastResults?.analysis, lastResults?.scenario, usingSyncFallback, authFetch, setLastResults, runSyncAnalysis, saveSessionResults]);

  // Start polling when we have an analysis in progress
  useEffect(() => {
    if (lastResults?.analysisStatus === 'processing' && lastResults?.analysisId) {
      const interval = setInterval(pollAnalysis, 2000);
      pollAnalysis(); // Initial poll

      // Animate through steps
      const steps = ['processing', 'analyzing', 'scoring', 'generating'];
      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        stepIndex = (stepIndex + 1) % steps.length;
        setCurrentStep(steps[stepIndex]);
      }, 3000);

      return () => {
        clearInterval(interval);
        clearInterval(stepInterval);
      };
    }
  }, [lastResults?.analysisStatus, lastResults?.analysisId, pollAnalysis]);

  // Redirect if no results (but wait for recovery attempt)
  useEffect(() => {
    if (!lastResults && recoveredFromStorage) {
      // Only redirect after we've tried to recover from storage
      navigate('/');
    }
  }, [lastResults, recoveredFromStorage, navigate]);

  // Helper function - defined early since it's used in loading states
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show loading while trying to recover
  if (!lastResults) {
    if (!recoveredFromStorage) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Loader2 className="w-12 h-12 text-primary-400 mx-auto animate-spin" />
          <p className="text-gray-400 mt-4">Loading results...</p>
        </div>
      );
    }
    return null;
  }

  const { analysis, scenario, duration, analysisStatus } = lastResults;

  const isModuleScenario = scenario?.isGeneratedScenario && scenario?.moduleId;

  // Show loading state while analysis is in progress
  if (analysisStatus === 'processing') {
    const steps = [
      { id: 'processing', label: 'Processing transcript', icon: FileText },
      { id: 'analyzing', label: 'Analyzing conversation', icon: Brain },
      { id: 'scoring', label: 'Calculating scores', icon: BarChart },
      { id: 'generating', label: 'Generating feedback', icon: Lightbulb }
    ];

    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          {/* Animated loader */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary-500/20"
            />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Brain className="w-12 h-12 text-primary-400" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">
            Analyzing Your Performance
          </h2>
          <p className="text-gray-400 mb-8">
            Our AI coach is reviewing your conversation and preparing detailed feedback
          </p>

          {/* Progress bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mb-6 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary-500 to-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${analysisProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {/* Progress steps */}
          <div className="grid grid-cols-2 gap-4 text-left">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isPast = steps.findIndex(s => s.id === currentStep) > index;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isActive ? 'bg-primary-500/10 border border-primary-500/30' :
                    isPast ? 'bg-green-500/10' : 'bg-gray-800'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isPast ? 'bg-green-500/20' : isActive ? 'bg-primary-500/20' : 'bg-gray-700'
                  }`}>
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
                    ) : (
                      <StepIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    isPast ? 'text-green-400' : isActive ? 'text-primary-400' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* Call summary while waiting */}
          <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Scenario</span>
              <span className="text-white">{scenario?.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-400">Call Duration</span>
              <span className="text-white">{formatDuration(duration)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-400">Customer</span>
              <span className="text-white">{scenario?.customerName}</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Clear sessionStorage when leaving results
  const cleanupAndNavigate = (path) => {
    try {
      sessionStorage.removeItem('lastTrainingResults');
    } catch (e) {
      // Ignore
    }
    clearSession();
    navigate(path);
  };

  const handleTryAgain = () => {
    if (!scenario?.id) {
      cleanupAndNavigate('/');
      return;
    }
    if (isModuleScenario) {
      cleanupAndNavigate(`/modules/${scenario.moduleId}`);
    } else {
      cleanupAndNavigate(`/scenario/${scenario.id}`);
    }
  };

  const handleNewScenario = () => {
    if (isModuleScenario && scenario?.moduleId) {
      cleanupAndNavigate(`/modules/${scenario.moduleId}`);
    } else {
      cleanupAndNavigate('/');
    }
  };

  const handleBackToModule = () => {
    if (scenario?.moduleId) {
      cleanupAndNavigate(`/modules/${scenario.moduleId}`);
    } else {
      cleanupAndNavigate('/');
    }
  };

  // Handle case where analysis failed
  if (!analysis || analysis.parseError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <AlertTriangle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Analysis Unavailable</h2>
        <p className="text-gray-400 mb-6">
          We couldn't analyze your call this time. Your conversation was still valuable practice.
        </p>
        <div className="flex gap-4 justify-center">
          <Button variant="secondary" onClick={handleNewScenario}>
            Try Another Scenario
          </Button>
          <Button onClick={handleTryAgain}>
            Retry This Scenario
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleNewScenario}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to scenarios
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold text-white mb-2">Training Complete</h1>
        <p className="text-gray-400">{scenario.name}</p>
        <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {formatDuration(duration)}
          </span>
        </div>
      </motion.div>

      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <Card className="text-center py-8 relative">
          {/* Share Button for high scores */}
          {analysis.overallScore >= 80 && (
            <div className="absolute top-4 right-4">
              <ShareButton
                achievementType="score"
                achievementData={{
                  score: analysis.overallScore,
                  scenarioId: scenario.id,
                  scenarioName: scenario.name
                }}
                variant="icon"
              />
            </div>
          )}
          <div className="mb-4">
            <ScoreRing score={analysis.overallScore} size={160} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {getScoreLabel(analysis.overallScore)}
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto">
            {analysis.summary}
          </p>
        </Card>
      </motion.div>

      {/* Category Scores */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Performance Breakdown</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysis.categories && Object.entries(analysis.categories).map(([key, data], index) => (
            <CategoryScore
              key={key}
              name={formatCategoryName(key)}
              score={data.score}
              feedback={data.feedback}
              delay={index * 0.05}
            />
          ))}
        </div>
      </motion.div>

      {/* Strengths */}
      {analysis.strengths && analysis.strengths.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-400" />
                <Card.Title>What You Did Well</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                {analysis.strengths.map((strength, index) => (
                  <div key={index} className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                    <h4 className="font-medium text-green-400 mb-1">{strength.title}</h4>
                    <p className="text-sm text-gray-300 mb-2">{strength.description}</p>
                    {strength.quote && (
                      <p className="text-sm text-gray-500 italic">"{strength.quote}"</p>
                    )}
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </motion.div>
      )}

      {/* Improvements */}
      {analysis.improvements && analysis.improvements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-8"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                <Card.Title>Areas to Improve</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                {analysis.improvements.map((improvement, index) => (
                  <div key={index} className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <h4 className="font-medium text-yellow-400 mb-1">{improvement.title}</h4>
                    <p className="text-sm text-gray-300 mb-2">{improvement.issue}</p>
                    {improvement.quote && (
                      <div className="mb-2">
                        <span className="text-xs text-gray-500">You said:</span>
                        <p className="text-sm text-gray-400 italic">"{improvement.quote}"</p>
                      </div>
                    )}
                    {improvement.alternative && (
                      <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <span className="text-xs text-blue-400 flex items-center gap-1 mb-1">
                          <Lightbulb className="w-3 h-3" /> Try instead:
                        </span>
                        <p className="text-sm text-blue-200">"{improvement.alternative}"</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        </motion.div>
      )}

      {/* Key Moment */}
      {analysis.keyMoment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-400" />
                <Card.Title>Pivotal Moment</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {analysis.keyMoment.timestamp && (
                  <p className="text-sm text-gray-500">{analysis.keyMoment.timestamp}</p>
                )}
                <p className="text-gray-300">{analysis.keyMoment.description}</p>
                {analysis.keyMoment.impact && (
                  <p className="text-sm text-gray-400">
                    <span className="text-purple-400 font-medium">Impact:</span> {analysis.keyMoment.impact}
                  </p>
                )}
                {analysis.keyMoment.betterApproach && (
                  <div className="mt-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <span className="text-xs text-purple-400">Better approach:</span>
                    <p className="text-sm text-purple-200 mt-1">{analysis.keyMoment.betterApproach}</p>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        </motion.div>
      )}

      {/* Next Steps */}
      {analysis.nextSteps && analysis.nextSteps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-blue-400" />
                <Card.Title>Next Steps</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <ul className="space-y-2">
                {analysis.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3 text-gray-300">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm flex-shrink-0">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ul>
            </Card.Content>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="flex flex-wrap gap-3 justify-center mb-6"
      >
        {lastResults.sessionId && (
          <Link
            to={`/replay/${lastResults.sessionId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
          >
            <Play className="w-4 h-4" />
            Replay Call
          </Link>
        )}
        <Link
          to={`/analysis/${scenario.id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
        >
          <BarChart2 className="w-4 h-4" />
          Compare with Previous
        </Link>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
      >
        {isModuleScenario ? (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleBackToModule}
            >
              Back to Module
            </Button>
            <Button
              size="lg"
              icon={RotateCcw}
              onClick={handleNewScenario}
            >
              Next Scenario
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={handleNewScenario}
            >
              Try Different Scenario
            </Button>
            <PracticeAgainButton
              scenarioId={scenario.id}
              scenarioName={scenario.name}
              lastScore={analysis.overallScore}
              onNavigate={clearSession}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}

function getScoreLabel(score) {
  if (score >= 90) return 'Excellent!';
  if (score >= 80) return 'Great Job!';
  if (score >= 70) return 'Good Effort';
  if (score >= 60) return 'Room for Improvement';
  return 'Keep Practicing';
}

function formatCategoryName(key) {
  const names = {
    empathyRapport: 'Empathy & Rapport',
    bookingConversion: 'Booking & Conversion',
    serviceKnowledge: 'Service Knowledge',
    valueAndObjections: 'Value & Objections',
    professionalism: 'Professionalism',
    // Legacy names for backward compatibility
    problemResolution: 'Problem Resolution',
    productKnowledge: 'Product Knowledge',
    scenarioSpecific: 'Scenario Performance',
    communication: 'Communication'
  };
  return names[key] || key.replace(/([A-Z])/g, ' $1').trim();
}

export default Results;
