import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Play,
  RotateCcw,
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  User,
  MessageSquare,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ModuleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetchModule();
  }, [id]);

  const fetchModule = async () => {
    try {
      const response = await authFetch(`/api/modules/${id}`);
      if (response.ok) {
        const data = await response.json();
        setModule(data.module);
      }
    } catch (error) {
      console.error('Error fetching module:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartModule = async () => {
    setStarting(true);
    try {
      const response = await authFetch(`/api/modules/${id}/start`, {
        method: 'POST'
      });
      if (response.ok) {
        await fetchModule();
      }
    } catch (error) {
      console.error('Error starting module:', error);
    } finally {
      setStarting(false);
    }
  };

  const handleResetModule = async () => {
    if (!window.confirm('This will reset your progress and generate new scenarios. Continue?')) {
      return;
    }

    setResetting(true);
    try {
      await authFetch(`/api/modules/${id}/reset`, { method: 'POST' });
      await handleStartModule();
    } catch (error) {
      console.error('Error resetting module:', error);
    } finally {
      setResetting(false);
    }
  };

  const handleStartScenario = (scenario) => {
    // Navigate to the practice session with the scenario
    navigate(`/scenario/${scenario.id}`, {
      state: {
        moduleId: id,
        scenario,
        moduleContext: module
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">Module not found</p>
        <Link to="/courses" className="text-primary-400 hover:text-primary-300 mt-2 inline-block">
          Back to courses
        </Link>
      </div>
    );
  }

  const progress = module.progress;
  const scenarios = module.scenarios || [];
  const hasScenarios = scenarios.length > 0;
  const isCompleted = progress?.status === 'completed' || progress?.status === 'mastered';
  const closeRate = progress?.closeRate || 0;
  const passThreshold = module.pass_threshold || 60;

  const completedCount = scenarios.filter(s => s.status === 'completed').length;
  const pendingCount = scenarios.filter(s => s.status === 'pending').length;
  const nextScenario = scenarios.find(s => s.status === 'pending');

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <Link
        to={`/courses/${module.course?.id || ''}`}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {module.course?.name || 'course'}
      </Link>

      {/* Module Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-2xl p-6 md:p-8 border border-gray-700"
      >
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex-1">
            <span className="text-sm text-primary-400 font-medium">
              {module.course?.name}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-100 mt-1">
              {module.name}
            </h1>
            <p className="text-gray-400 mt-3">{module.description}</p>

            {/* Module Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400">Scenarios</p>
                <p className="text-xl font-bold text-gray-100">
                  {completedCount}/{module.scenario_count || scenarios.length}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400">Close Rate</p>
                <p className={`text-xl font-bold ${closeRate >= passThreshold ? 'text-green-400' : 'text-yellow-400'}`}>
                  {closeRate}%
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400">Pass Threshold</p>
                <p className="text-xl font-bold text-gray-100">{passThreshold}%</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <p className="text-sm text-gray-400">Attempts</p>
                <p className="text-xl font-bold text-gray-100">{progress?.attempts || 0}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mt-6">
              {!hasScenarios && (
                <button
                  onClick={handleStartModule}
                  disabled={starting}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {starting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating Scenarios...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Start Module
                    </>
                  )}
                </button>
              )}

              {hasScenarios && nextScenario && (
                <button
                  onClick={() => handleStartScenario(nextScenario)}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors"
                >
                  <Play className="w-5 h-5" />
                  {completedCount === 0 ? 'Start Practice' : 'Continue Practice'}
                </button>
              )}

              {hasScenarios && (
                <button
                  onClick={handleResetModule}
                  disabled={resetting}
                  className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {resetting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-5 h-5" />
                  )}
                  Reset & Try Again
                </button>
              )}
            </div>
          </div>

          {/* Completion Status */}
          {isCompleted && (
            <div className="bg-green-500/10 rounded-xl p-6 text-center border border-green-500/20">
              <Trophy className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-green-400">Module Complete!</h3>
              <p className="text-sm text-gray-400 mt-1">
                You achieved {closeRate}% close rate
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Scenarios List */}
      {hasScenarios && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            Practice Scenarios ({completedCount}/{scenarios.length} completed)
          </h2>

          <div className="grid gap-4">
            {scenarios.map((scenario, index) => (
              <ScenarioCard
                key={scenario.id}
                scenario={scenario}
                index={index}
                onStart={() => handleStartScenario(scenario)}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Tips Section */}
      {!isCompleted && progress && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-6"
        >
          <h3 className="font-semibold text-blue-300 mb-3">Tips for Success</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              Listen actively to the customer's concerns before offering solutions
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              Use the customer's name to build rapport
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              Address objections by acknowledging them, then redirecting
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              Always offer a clear next step or call to action
            </li>
          </ul>
        </motion.div>
      )}
    </div>
  );
}

function ScenarioCard({ scenario, index, onStart }) {
  const isCompleted = scenario.status === 'completed';
  const isSkipped = scenario.status === 'skipped';
  const isPending = scenario.status === 'pending';

  const profile = scenario.profile || {};

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 p-5 ${
      isCompleted ? 'opacity-75' : ''
    }`}>
      <div className="flex items-start gap-4">
        {/* Scenario Number & Status */}
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
          isCompleted
            ? 'bg-green-500/20 text-green-400'
            : isSkipped
            ? 'bg-gray-700 text-gray-500'
            : 'bg-primary-500/20 text-primary-400'
        }`}>
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : isSkipped ? (
            <XCircle className="w-5 h-5" />
          ) : (
            index + 1
          )}
        </div>

        {/* Scenario Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-gray-500" />
            <span className="font-medium text-gray-200">{profile.name || 'Customer'}</span>
            {profile.personality_traits?.length > 0 && (
              <span className="text-xs text-gray-500">
                ({profile.personality_traits.slice(0, 2).join(', ')})
              </span>
            )}
          </div>

          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
            {scenario.situation_text || 'Practice scenario'}
          </p>

          {/* Opening Line Preview */}
          {scenario.opening_line && (
            <div className="flex items-start gap-2 p-3 bg-gray-700/50 rounded-lg mb-3">
              <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-300 italic">"{scenario.opening_line}"</p>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {profile.communication_style && (
              <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                {profile.communication_style}
              </span>
            )}
            {isCompleted && scenario.won && (
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                Closed Successfully
              </span>
            )}
            {isCompleted && !scenario.won && (
              <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                Not Closed
              </span>
            )}
          </div>
        </div>

        {/* Action */}
        {isPending && (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
          >
            <Play className="w-4 h-4" />
            Practice
          </button>
        )}

        {isCompleted && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        )}
      </div>
    </div>
  );
}
