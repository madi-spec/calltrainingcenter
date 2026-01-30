import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  User,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mic,
  ArrowLeft,
  Brain,
  Sparkles,
  BarChart2,
  Trophy,
  Lock,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useOrganization } from '../context/OrganizationContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { DifficultyBadge, CategoryBadge } from '../components/ui/Badge';

function PreCall() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentScenario } = useConfig();
  const {
    organization: company,
    canStartTraining,
    isTrialExpired,
    isHoursExhausted,
    trialDaysRemaining,
    hoursRemaining,
    isOnTrial
  } = useOrganization();
  const { authFetch } = useAuth();
  const [scenario, setScenario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [previousAttempts, setPreviousAttempts] = useState(null);

  // Check if this is a generated scenario from a module
  const moduleContext = location.state?.moduleContext;
  const isGeneratedScenario = !!location.state?.moduleId;

  // Check if user completed warmup
  const warmupCompleted = location.state?.warmupCompleted;
  const warmupResults = location.state?.warmupResults;

  const handleWarmup = () => {
    navigate(`/warmup/${id}`);
  };

  useEffect(() => {
    fetchScenario();
  }, [id, authFetch, isGeneratedScenario]);

  // Fetch previous attempts for this scenario
  useEffect(() => {
    if (id && !isGeneratedScenario) {
      fetchPreviousAttempts();
    }
  }, [id, authFetch, isGeneratedScenario]);

  const fetchPreviousAttempts = async () => {
    try {
      const response = await authFetch(`/api/analysis/comparative/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPreviousAttempts(data);
      }
    } catch (error) {
      console.error('Error fetching previous attempts:', error);
    }
  };

  const fetchScenario = async () => {
    try {
      // Use different endpoint for generated scenarios
      const endpoint = isGeneratedScenario
        ? `/api/generated-scenarios/${id}`
        : `/api/scenarios/${id}`;

      const response = await authFetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setScenario(data.scenario);
      }
    } catch (error) {
      console.error('Error fetching scenario:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCall = async () => {
    setStarting(true);
    // Include module context for tracking progress after call
    setCurrentScenario({
      ...scenario,
      moduleId: location.state?.moduleId,
      isGeneratedScenario
    });
    navigate('/training');
  };

  const handleBack = () => {
    if (isGeneratedScenario && location.state?.moduleId) {
      navigate(`/modules/${location.state.moduleId}`);
    } else {
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="glass-card p-8 animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-8" />
          <div className="h-32 bg-gray-700 rounded mb-4" />
          <div className="h-32 bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Scenario not found</h2>
        <Button onClick={() => navigate('/')}>Back to Scenarios</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={handleBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {isGeneratedScenario ? 'Back to module' : 'Back to scenarios'}
      </motion.button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-white">{scenario.name}</h1>
          <div className="flex gap-2">
            <DifficultyBadge difficulty={scenario.difficulty} />
            {scenario.category && (
              <CategoryBadge category={scenario.category} />
            )}
          </div>
        </div>
        {scenario.estimatedDuration && (
          <div className="flex items-center gap-2 text-gray-400">
            <Clock className="w-4 h-4" />
            <span>{scenario.estimatedDuration}</span>
          </div>
        )}
      </motion.div>

      {/* Previous Attempts Info */}
      {previousAttempts && previousAttempts.totalAttempts > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <BarChart2 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white">
                    Attempt #{previousAttempts.totalAttempts + 1}
                  </p>
                  <p className="text-sm text-gray-400">
                    You've practiced this scenario {previousAttempts.totalAttempts} time{previousAttempts.totalAttempts !== 1 ? 's' : ''} before
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Best Score */}
                <div className="text-center">
                  <div className="flex items-center gap-1 text-green-400">
                    <Trophy className="w-4 h-4" />
                    <span className="text-xl font-bold">{previousAttempts.summary?.bestScore ?? '--'}%</span>
                  </div>
                  <p className="text-xs text-gray-500">Best Score</p>
                </div>

                {/* Last Score */}
                <div className="text-center">
                  <span className="text-xl font-bold text-white">{previousAttempts.summary?.lastScore ?? '--'}%</span>
                  <p className="text-xs text-gray-500">Last Score</p>
                </div>

                {/* Progress Indicator */}
                {previousAttempts.progression?.isImproving && (
                  <div className="px-3 py-1 bg-green-500/20 rounded-full">
                    <span className="text-sm text-green-400">Improving!</span>
                  </div>
                )}
                {previousAttempts.progression?.masteryAchieved && (
                  <div className="px-3 py-1 bg-yellow-500/20 rounded-full">
                    <span className="text-sm text-yellow-400">Mastered!</span>
                  </div>
                )}

                <Link
                  to={`/analysis/${id}`}
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  View Progress
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div data-tutorial="pre-call-info" className="grid md:grid-cols-2 gap-6">
        {/* Customer Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Card.Title>Customer Profile</Card.Title>
                  <p className="text-sm text-gray-400">{scenario.customerName}</p>
                </div>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Personality</h4>
                  <p className="text-sm text-gray-400">{scenario.personality}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Emotional State</h4>
                  <p className="text-sm text-gray-400">{scenario.emotionalState}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Background</h4>
                  <p className="text-sm text-gray-400">{scenario.customerBackground}</p>
                </div>
              </div>
            </Card.Content>
          </Card>
        </motion.div>

        {/* Situation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <Card.Title>The Situation</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-gray-300 mb-4">{scenario.situation}</p>
              {scenario.keyPointsToMention && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Key Points Customer Will Mention:</h4>
                  <ul className="space-y-1">
                    {scenario.keyPointsToMention.map((point, i) => (
                      <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                        <span className="text-yellow-400 mt-1">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card.Content>
          </Card>
        </motion.div>

        {/* Your Objective */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <Card.Title>Your Objective</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <p className="text-gray-300 mb-4">{scenario.csrObjective}</p>
              {scenario.scoringFocus && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">You'll Be Scored On:</h4>
                  <div className="flex flex-wrap gap-2">
                    {scenario.scoringFocus.map((focus, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full"
                      >
                        {focus}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card.Content>
          </Card>
        </motion.div>

        {/* Success Criteria */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <Card.Header>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <Card.Title>Success Criteria</Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3">
                {scenario.deescalationTriggers && (
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-1">Customer Will Calm Down If:</h4>
                    <p className="text-sm text-gray-400">{scenario.deescalationTriggers}</p>
                  </div>
                )}
                {scenario.escalationTriggers && (
                  <div>
                    <h4 className="text-sm font-medium text-red-400 mb-1">Customer Will Escalate If:</h4>
                    <p className="text-sm text-gray-400">{scenario.escalationTriggers}</p>
                  </div>
                )}
                {scenario.resolutionConditions && (
                  <div>
                    <h4 className="text-sm font-medium text-blue-400 mb-1">Resolution:</h4>
                    <p className="text-sm text-gray-400">{scenario.resolutionConditions}</p>
                  </div>
                )}
              </div>
            </Card.Content>
          </Card>
        </motion.div>
      </div>

      {/* Company Context */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-6"
      >
        <Card>
          <Card.Header>
            <Card.Title>Company Context</Card.Title>
            <Card.Description>Use this information during the call</Card.Description>
          </Card.Header>
          <Card.Content>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Company:</span>
                <p className="text-white font-medium">{company.name}</p>
              </div>
              <div>
                <span className="text-gray-500">Quarterly Price:</span>
                <p className="text-white font-medium">${company.pricing?.quarterlyPrice}/quarter</p>
              </div>
              <div>
                <span className="text-gray-500">Guarantee:</span>
                <p className="text-white font-medium">{company.guarantees?.[0]}</p>
              </div>
              <div>
                <span className="text-gray-500">Phone:</span>
                <p className="text-white font-medium">{company.phone}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      </motion.div>

      {/* Warmup Completion Banner */}
      {warmupCompleted && warmupResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-6"
        >
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-green-400">Warm-up Complete!</p>
                  <p className="text-sm text-gray-400">
                    {warmupResults.correct}/{warmupResults.total} correct ({warmupResults.accuracy}%)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-400">+{warmupResults.pointsEarned}</p>
                <p className="text-xs text-gray-500">points earned</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Upgrade Required Banner - Shows when training is blocked */}
      {!canStartTraining && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <div className="bg-gradient-to-r from-red-500/10 via-orange-500/10 to-amber-500/10 border border-red-500/30 rounded-2xl p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {isTrialExpired
                  ? 'Trial Period Ended'
                  : isHoursExhausted
                    ? 'Training Hours Exhausted'
                    : 'Upgrade Required'}
              </h3>
              <p className="text-gray-400 mb-6 max-w-md">
                {isTrialExpired
                  ? 'Your free trial has ended. Upgrade to a paid plan to continue practicing with AI-powered training calls.'
                  : isHoursExhausted
                    ? "You've used all your training hours for this period. Upgrade your plan or purchase additional hours to continue."
                    : 'Please upgrade your plan to continue training.'}
              </p>

              {/* Current Status */}
              {isOnTrial && (
                <div className="bg-gray-800/50 rounded-lg p-4 mb-6 w-full max-w-sm">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Trial Status:</span>
                    <span className={isTrialExpired ? 'text-red-400' : 'text-amber-400'}>
                      {isTrialExpired ? 'Expired' : `${trialDaysRemaining} days left`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-2">
                    <span className="text-gray-400">Hours Remaining:</span>
                    <span className={hoursRemaining <= 0 ? 'text-red-400' : 'text-gray-200'}>
                      {hoursRemaining <= 0 ? 'None' : `${hoursRemaining.toFixed(1)} hours`}
                    </span>
                  </div>
                </div>
              )}

              {/* Benefits */}
              <div className="flex flex-wrap justify-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Zap className="w-4 h-4 text-primary-400" />
                  <span>Up to 25 hours/month</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Zap className="w-4 h-4 text-primary-400" />
                  <span>Custom scenarios</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Zap className="w-4 h-4 text-primary-400" />
                  <span>Team analytics</span>
                </div>
              </div>

              {/* CTA */}
              <Link
                to="/settings/billing"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-semibold rounded-lg transition-all"
              >
                View Plans & Upgrade
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Start Call Button - Only show when training is allowed */}
      {canStartTraining && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
          data-tutorial="start-button"
        >
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {!warmupCompleted && !isGeneratedScenario && (
              <Button
                variant="secondary"
                size="lg"
                onClick={handleWarmup}
                icon={Brain}
              >
                Warm Up First
              </Button>
            )}
            <Button
              size="xl"
              onClick={handleStartCall}
              loading={starting}
              icon={starting ? null : Phone}
              className="px-12"
            >
              {starting ? 'Preparing Call...' : 'Start Training Call'}
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-3 flex items-center justify-center gap-2">
            <Mic className="w-4 h-4" />
            Make sure your microphone is ready
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default PreCall;
