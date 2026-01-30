import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AttemptTimeline, ScoreComparisonChart } from '../../components/analysis';
import api from '../../services/api';

function ComparativeAnalysis() {
  const { scenarioId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [scenarioInfo, setScenarioInfo] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => {
    fetchComparativeData();
    fetchScenarioInfo();
  }, [scenarioId]);

  const fetchComparativeData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/api/analysis/comparative/${scenarioId}`);
      setData(res.data);

      // Select the latest attempt by default or from URL params
      const attemptParam = searchParams.get('attempt');
      if (attemptParam) {
        setSelectedAttempt(parseInt(attemptParam));
      } else if (res.data.attempts?.length > 0) {
        setSelectedAttempt(res.data.attempts.length);
      }
    } catch (err) {
      console.error('Error fetching comparative data:', err);
      setError('Failed to load comparison data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchScenarioInfo = async () => {
    try {
      const res = await api.get(`/api/scenarios/${scenarioId}`);
      setScenarioInfo(res.data.scenario);
    } catch (err) {
      console.error('Error fetching scenario info:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading comparison data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Data</h2>
          <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.totalAttempts === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Attempts Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Complete this scenario to see your performance comparison.
          </p>
          <Link
            to={`/scenario/${scenarioId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Start Scenario
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  const { summary, categoryTrends, recurringImprovements, progression } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/history"
          className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to History
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Performance Comparison
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {scenarioInfo?.name || 'Scenario'} • {data.totalAttempts} attempt{data.totalAttempts !== 1 ? 's' : ''}
            </p>
          </div>

          <Link
            to={`/scenario/${scenarioId}`}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Practice Again
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">First Score</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.firstScore ?? '--'}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Latest Score</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {summary.lastScore ?? '--'}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
        >
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Best Score</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {summary.bestScore ?? '--'}%
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4`}
        >
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Improvement</div>
          <div className={`text-2xl font-bold ${
            summary.improvement > 0
              ? 'text-green-600 dark:text-green-400'
              : summary.improvement < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-gray-900 dark:text-white'
          }`}>
            {summary.improvement > 0 ? '+' : ''}{summary.improvement ?? 0}%
          </div>
        </motion.div>
      </div>

      {/* Progress Status */}
      {progression && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`mb-6 p-4 rounded-lg border ${
            progression.masteryAchieved
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : progression.isImproving
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              : progression.needsWork
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
          }`}
        >
          <div className="flex items-center gap-3">
            {progression.masteryAchieved ? (
              <>
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-green-800 dark:text-green-200">Mastery Achieved!</div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    You've demonstrated excellent and consistent performance on this scenario.
                  </div>
                </div>
              </>
            ) : progression.isImproving ? (
              <>
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-blue-800 dark:text-blue-200">Making Progress!</div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    Your scores are improving. Keep practicing to achieve mastery.
                  </div>
                </div>
              </>
            ) : progression.needsWork ? (
              <>
                <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">Needs More Practice</div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    Review the feedback from your attempts and focus on improvement areas.
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">Keep Practicing</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Continue working on this scenario to improve your performance.
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score Comparison Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <ScoreComparisonChart
              attempts={data.attempts}
              categoryTrends={categoryTrends}
              selectedAttempt={selectedAttempt}
            />
          </motion.div>

          {/* Recurring Improvements */}
          {recurringImprovements && recurringImprovements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Recurring Improvement Areas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  These areas appeared in multiple attempts
                </p>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {recurringImprovements.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                          {item.occurrences}x
                        </div>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {item.title}
                        </span>
                      </div>
                      <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Attempt Timeline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <AttemptTimeline
              attempts={data.attempts}
              selectedAttempt={selectedAttempt}
              onSelectAttempt={setSelectedAttempt}
            />
          </motion.div>

          {/* Quick Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-4"
          >
            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tips for Improvement
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">1.</span>
                Review the feedback from your lowest-scoring attempt
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">2.</span>
                Focus on recurring improvement areas identified above
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">3.</span>
                Replay your best attempt to reinforce good habits
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">4.</span>
                Practice at least 3 times to establish a clear trend
              </li>
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default ComparativeAnalysis;
